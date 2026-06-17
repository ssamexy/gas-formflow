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
      .createTextOutput(JSON.stringify(apiCreateSmokeTest(), null, 2))
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

function apiCreateSmokeTest() {
  var startedAt = new Date().toISOString();
  var spec = buildSmokeSpec();
  spec.title = 'GAS FormFlow Smoke Test ' + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMdd-HHmmss');
  spec.sheetName = spec.title + ' Responses';
  var result = apiCreateFormFlow(JSON.stringify(spec));
  result.smokeTest = true;
  result.startedAt = startedAt;
  result.sideEffects = 'created one Google Form and one Google Sheet in the deploying account';
  result.expectedSheets = ['Form Responses 1', 'Clean_Data', 'Question_Meta', 'Summary', 'Announcement', 'Generator_Log'];
  return result;
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
