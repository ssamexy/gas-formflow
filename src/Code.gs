var FORMFLOW_DEPLOY_MODE = typeof FORMFLOW_DEPLOY_MODE !== 'undefined' ? FORMFLOW_DEPLOY_MODE : 'private';

function doGet(e) {
  if (e && e.parameter && e.parameter.mode === 'agent-test') {
    return ContentService
      .createTextOutput(JSON.stringify(apiSelfTest(), null, 2))
      .setMimeType(ContentService.MimeType.JSON);
  }
  if (e && e.parameter && e.parameter.mode === 'create-smoke') {
    if (e.parameter.confirm !== 'CREATE_TEST_RESOURCES') {
      return ContentService
        .createTextOutput(JSON.stringify({
          ok: false,
          error: 'create-smoke requires confirm=CREATE_TEST_RESOURCES because it creates a real Google Form and Sheet.'
        }, null, 2))
        .setMimeType(ContentService.MimeType.JSON);
    }
    var tokenCheck = validateAgentSmokeToken_(e.parameter.token);
    if (!tokenCheck.ok) {
      return ContentService
        .createTextOutput(JSON.stringify(tokenCheck, null, 2))
        .setMimeType(ContentService.MimeType.JSON);
    }
    return ContentService
      .createTextOutput(JSON.stringify(apiCreateSmokeTest_(), null, 2))
      .setMimeType(ContentService.MimeType.JSON);
  }
  if (e && e.parameter && e.parameter.mode === 'verify-smoke') {
    var verifyTokenCheck = validateAgentSmokeToken_(e.parameter.token);
    if (!verifyTokenCheck.ok) {
      return ContentService
        .createTextOutput(JSON.stringify(verifyTokenCheck, null, 2))
        .setMimeType(ContentService.MimeType.JSON);
    }
    return ContentService
      .createTextOutput(JSON.stringify(apiVerifySmokeResources_(e.parameter.sheetId || ''), null, 2))
      .setMimeType(ContentService.MimeType.JSON);
  }
  if (e && e.parameter && e.parameter.mode === 'health') {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: true, app: 'GAS FormFlow', version: '0.1.0' }))
      .setMimeType(ContentService.MimeType.JSON);
  }
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('GAS FormFlow')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function setup() {
  return {
    ok: true,
    app: 'GAS FormFlow',
    message: 'Setup completed. You can deploy this project as a Web App.'
  };
}

function setupAgentSmokeToken(token) {
  if (isAgentMode_()) {
    throw new Error('Token setup is disabled while running in public agent validation mode.');
  }
  return setupAgentSmokeToken_(token);
}

function setupAgentSmokeToken_(token) {
  if (!token || String(token).length < 24) {
    throw new Error('Token must be at least 24 characters.');
  }
  PropertiesService.getScriptProperties().setProperty('AGENT_SMOKE_TOKEN', String(token));
  return {
    ok: true,
    property: 'AGENT_SMOKE_TOKEN',
    message: 'Agent smoke token saved.'
  };
}

function apiValidateSpec(jsonText) {
  return SchemaValidator.validateJsonText(jsonText);
}

function apiPreviewSpec(jsonText) {
  var validation = SchemaValidator.validateJsonText(jsonText);
  if (!validation.ok) return validation;
  return {
    ok: true,
    form: FormBuilder.preview(validation.spec),
    sheet: SheetBuilder.preview(validation.spec)
  };
}

function apiCreateFormFlow(jsonText) {
  if (isAgentMode_()) {
    return {
      ok: false,
      errors: ['公開 AI agent 驗證模式不允許未帶 token 的建立操作。請使用 token-protected create-smoke endpoint，或切回 private deployment。']
    };
  }
  return createFormFlow_(jsonText);
}

function createFormFlow_(jsonText) {
  try {
    var validation = SchemaValidator.validateJsonText(jsonText);
    if (!validation.ok) return validation;

    var spec = validation.spec;
    var formResult = FormBuilder.create(spec);
    var sheetResult = SheetBuilder.create(spec, formResult);
    formResult.form.setDestination(FormApp.DestinationType.SPREADSHEET, sheetResult.spreadsheet.getId());

    var values = {
      title: spec.title || '',
      publishedUrl: formResult.publishedUrl,
      editUrl: formResult.editUrl,
      sheetUrl: sheetResult.sheetUrl,
      deadlineText: spec.deadlineText || '',
      notice: spec.notice || '',
      qrCodeUrl: formResult.publishedUrl
    };
    var announcement = SheetBuilder.renderTemplate(spec.lineMessageTemplate, values);
    SheetBuilder.writeAnnouncement(sheetResult.spreadsheet, announcement);
    SheetBuilder.writeLog(sheetResult.spreadsheet, {
      title: spec.title,
      publishedUrl: formResult.publishedUrl,
      editUrl: formResult.editUrl,
      sheetUrl: sheetResult.sheetUrl
    });

    return {
      ok: true,
      title: spec.title,
      publishedUrl: formResult.publishedUrl,
      editUrl: formResult.editUrl,
      sheetUrl: sheetResult.sheetUrl,
      announcement: announcement,
      createdAt: new Date().toISOString(),
      qrCode: QrCodeBuilder.buildClientQrPayload(formResult.publishedUrl)
    };
  } catch (error) {
    return {
      ok: false,
      errors: [SchemaValidator.toUserMessage(error)]
    };
  }
}

function apiSelfTest() {
  var startedAt = new Date().toISOString();
  var checks = [];
  var sample = buildSmokeSpec();
  var jsonText = JSON.stringify(sample);
  var validation = apiValidateSpec(jsonText);
  checks.push({
    name: 'valid sample passes schema validation',
    ok: validation.ok,
    detail: validation.errors || []
  });
  var preview = apiPreviewSpec(jsonText);
  checks.push({
    name: 'preview contains form and sheet structure',
    ok: preview.ok && preview.form.itemCount === sample.items.length &&
      preview.sheet.sheets.indexOf('Summary') !== -1 &&
      preview.sheet.cleanDataColumns.indexOf('name') !== -1,
    detail: preview.ok ? preview.sheet.summaryPlan : preview.errors
  });
  var invalid = apiValidateSpec('{"schemaVersion":"1.0","title":"Broken","items":[{"key":"bad key","type":"fileUpload","title":"File"}]}');
  checks.push({
    name: 'invalid unsupported type is rejected with user-readable errors',
    ok: !invalid.ok && invalid.errors.join('\n').indexOf('目前不支援') !== -1,
    detail: invalid.errors
  });
  var allPassed = checks.every(function (check) { return check.ok; });
  return {
    ok: allPassed,
    app: 'GAS FormFlow',
    version: '0.1.0',
    startedAt: startedAt,
    finishedAt: new Date().toISOString(),
    sideEffects: 'none',
    checks: checks
  };
}

function apiCreateSmokeTest_() {
  var startedAt = new Date().toISOString();
  var spec = buildSmokeSpec();
  spec.title = 'GAS FormFlow Smoke Test ' + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMdd-HHmmss');
  spec.sheetName = spec.title + ' Responses';
  var result = createFormFlow_(JSON.stringify(spec));
  result.smokeTest = true;
  result.startedAt = startedAt;
  result.sideEffects = result.ok
    ? 'created one Google Form and one Google Sheet in the deploying account'
    : 'none confirmed; creation failed before success response';
  result.expectedSheets = ['Form Responses 1', 'Clean_Data', 'Question_Meta', 'Summary', 'Announcement', 'Generator_Log'];
  return result;
}

function apiVerifySmokeResources_(sheetId) {
  if (!sheetId) {
    return { ok: false, error: 'sheetId is required.' };
  }
  try {
    var spreadsheet = SpreadsheetApp.openById(sheetId);
    var sheetNames = spreadsheet.getSheets().map(function (sheet) { return sheet.getName(); });
    var expectedSheets = ['Form Responses 1', 'Clean_Data', 'Question_Meta', 'Summary', 'Announcement', 'Generator_Log'];
    var missingSheets = expectedSheets.filter(function (name) { return sheetNames.indexOf(name) === -1; });
    var unexpectedResponseSheets = sheetNames.filter(function (name) {
      return /^Form Responses \d+$/.test(name) && name !== 'Form Responses 1';
    });
    var cleanData = spreadsheet.getSheetByName('Clean_Data');
    var questionMeta = spreadsheet.getSheetByName('Question_Meta');
    var summary = spreadsheet.getSheetByName('Summary');
    var announcement = spreadsheet.getSheetByName('Announcement');
    var log = spreadsheet.getSheetByName('Generator_Log');
    var cleanHeaders = cleanData ? cleanData.getRange(1, 1, 1, cleanData.getLastColumn()).getValues()[0] : [];
    var questionMetaHeaders = questionMeta ? questionMeta.getRange(1, 1, 1, questionMeta.getLastColumn()).getValues()[0] : [];
    var summaryRows = summary && summary.getLastRow() > 1 ? summary.getRange(1, 1, Math.min(summary.getLastRow(), 12), summary.getLastColumn()).getDisplayValues() : [];
    var announcementText = announcement ? announcement.getRange(2, 1).getDisplayValue() : '';
    var logRows = log ? Math.max(0, log.getLastRow() - 1) : 0;
    var requiredCleanHeaders = ['timestamp', 'name', 'area', 'support', 'score', 'available_date', 'availability_grid'];
    var missingCleanHeaders = requiredCleanHeaders.filter(function (name) { return cleanHeaders.indexOf(name) === -1; });
    return {
      ok: missingSheets.length === 0 && unexpectedResponseSheets.length === 0 && missingCleanHeaders.length === 0 && !!announcementText && logRows > 0,
      spreadsheetName: spreadsheet.getName(),
      sheetNames: sheetNames,
      missingSheets: missingSheets,
      unexpectedResponseSheets: unexpectedResponseSheets,
      cleanHeaders: cleanHeaders,
      missingCleanHeaders: missingCleanHeaders,
      questionMetaHeaders: questionMetaHeaders,
      summaryPreview: summaryRows,
      announcementText: announcementText,
      generatorLogRows: logRows
    };
  } catch (error) {
    return {
      ok: false,
      error: error && error.message ? error.message : String(error)
    };
  }
}

function validateAgentSmokeToken_(providedToken) {
  var savedToken = PropertiesService.getScriptProperties().getProperty('AGENT_SMOKE_TOKEN');
  if (!savedToken) {
    return {
      ok: false,
      error: 'AGENT_SMOKE_TOKEN is not configured in Script Properties.'
    };
  }
  if (!providedToken || String(providedToken) !== savedToken) {
    return {
      ok: false,
      error: 'Invalid or missing token.'
    };
  }
  return { ok: true };
}

function isAgentMode_() {
  return String(FORMFLOW_DEPLOY_MODE || 'private') === 'agent';
}

function buildSmokeSpec() {
  return {
    schemaVersion: '1.0',
    title: 'Agent Smoke Test',
    description: 'No-side-effect validation fixture.',
    deadlineText: '測試截止時間',
    notice: '測試提醒',
    lineMessageTemplate: '【{title}】\n{publishedUrl}\n{deadlineText}\n{notice}',
    analysis: {
      enabled: true,
      primaryKey: 'name',
      generateCleanData: true,
      generateSummary: true,
      summaryFields: []
    },
    items: [
      { key: 'name', type: 'shortText', title: '姓名', required: true },
      { key: 'area', type: 'dropdown', title: '區域', required: true, options: ['北區', '中區'], analysis: { summary: 'countOptions' } },
      { key: 'support', type: 'checkbox', title: '可支援項目', required: false, options: ['接待', '場佈'], analysis: { summary: 'countCheckboxOptions' } },
      { key: 'score', type: 'scale', title: '滿意度', required: true, lowerBound: 1, upperBound: 5, analysis: { summary: 'averageAndDistribution' } },
      { key: 'available_date', type: 'date', title: '可出席日期', required: false },
      { key: 'availability_grid', type: 'grid', title: '時段', required: false, rows: ['上午', '下午'], columns: ['可以', '不行'] }
    ]
  };
}
