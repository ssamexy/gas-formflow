/**
 * GAS FormFlow dist/Code.gs
 * Generated from src/*.gs. Edit src files, then run npm run build.
 */
var FORMFLOW_DEPLOY_MODE = 'private';

// ===== src/Code.gs =====
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
      .createTextOutput(JSON.stringify({ ok: true, app: 'GAS FormFlow', version: '0.5.0' }))
      .setMimeType(ContentService.MimeType.JSON);
  }
  return HtmlService.createTemplateFromFile('Index').evaluate()
    .setTitle('GAS FormFlow')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
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

function apiGetAiSettings(providerId) {
  return runPrivateAiOperation_(function () {
    return AiService.getSettings(providerId);
  });
}

function apiListAiModels(providerId, apiKey) {
  return runPrivateAiOperation_(function () {
    return AiService.listModels(providerId, apiKey);
  });
}

function apiSaveAiKey(providerId, apiKey) {
  return runPrivateAiOperation_(function () {
    return AiService.saveApiKey(providerId, apiKey);
  });
}

function apiSaveAiModel(providerId, modelName) {
  return runPrivateAiOperation_(function () {
    return AiService.saveModel(providerId, modelName);
  });
}

function apiSaveAiSettings(providerId, apiKey, modelName) {
  return runPrivateAiOperation_(function () {
    return AiService.saveSettings(providerId, apiKey, modelName);
  });
}

function apiClearAiSettings(providerId) {
  return runPrivateAiOperation_(function () {
    return AiService.clearSettings(providerId);
  });
}

function apiDiscussFormWithAi(providerId, messages, modelName) {
  return runPrivateAiOperation_(function () {
    return AiService.discussForm(providerId, messages, modelName);
  });
}

function apiGenerateSpecFromOutline(providerId, outline, modelName) {
  return runPrivateAiOperation_(function () {
    return AiService.generateSpec(providerId, outline, modelName);
  });
}

function apiGenerateSpecWithAi(providerId, requirement, modelName) {
  return runPrivateAiOperation_(function () {
    return AiService.generateSpec(providerId, requirement, modelName);
  });
}

function runPrivateAiOperation_(operation) {
  if (isAgentMode_()) {
    return {
      ok: false,
      errors: ['公開 AI agent 驗證模式不提供 API Key 與 LLM 功能。請切回 private deployment。']
    };
  }
  try {
    var result = operation() || {};
    if (result.ok === false) return result;
    result.ok = true;
    return result;
  } catch (error) {
    return {
      ok: false,
      errors: [AiService.toUserMessage(error)]
    };
  }
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
      formDescription: formResult.description,
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
      preview.form.description === sample.description &&
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
    version: '0.5.0',
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


// ===== src/SchemaValidator.gs =====
var SchemaValidator = (function () {
  var SUPPORTED_SCHEMA = '1.0';
  var SUPPORTED_TYPES = {
    shortText: true,
    paragraph: true,
    multipleChoice: true,
    checkbox: true,
    dropdown: true,
    date: true,
    time: true,
    scale: true,
    sectionHeader: true,
    pageBreak: true,
    grid: true,
    checkboxGrid: true
  };
  var OPTION_TYPES = { multipleChoice: true, checkbox: true, dropdown: true };
  var GRID_TYPES = { grid: true, checkboxGrid: true };
  var LIMITS = {
    maxJsonChars: 120000,
    maxTitleChars: 180,
    maxDescriptionChars: 5000,
    maxItems: 120,
    maxOptions: 80,
    maxGridRows: 50,
    maxGridColumns: 20,
    maxTextChars: 1200
  };

  function validateJsonText(jsonText) {
    if (!jsonText || String(jsonText).trim() === '') {
      return fail(['請先貼上 GAS FormFlow JSON。']);
    }
    if (String(jsonText).length > LIMITS.maxJsonChars) {
      return fail(['JSON 太大，v1 目前不支援超大型問卷。請先縮減題目或分批建立。']);
    }
    var spec;
    try {
      spec = JSON.parse(jsonText);
    } catch (error) {
      return fail(['JSON 格式不正確，請確認沒有註解、尾端逗號或多餘文字。', error.message]);
    }
    var errors = validateSpec(spec);
    if (errors.length) return fail(errors, spec);
    return { ok: true, errors: [], spec: spec };
  }

  function validateSpec(spec) {
    var errors = [];
    if (!spec || typeof spec !== 'object' || Array.isArray(spec)) {
      return ['JSON 根層必須是一個物件。'];
    }
    if (spec.schemaVersion !== SUPPORTED_SCHEMA) {
      errors.push('schemaVersion 目前只支援 "1.0"。');
    }
    if (!hasText(spec.title)) errors.push('title 為必填。');
    if (hasText(spec.title) && spec.title.length > LIMITS.maxTitleChars) errors.push('title 過長，請縮短到 ' + LIMITS.maxTitleChars + ' 字以內。');
    if (spec.description && String(spec.description).length > LIMITS.maxDescriptionChars) errors.push('description 過長，請縮短。');
    if (!Array.isArray(spec.items) || spec.items.length === 0) {
      errors.push('items 必須是非空陣列。');
      return errors;
    }
    if (spec.items.length > LIMITS.maxItems) {
      errors.push('題目數量超過 v1 上限 ' + LIMITS.maxItems + ' 題，請拆成多個表單。');
    }

    var keys = {};
    spec.items.forEach(function (item, index) {
      var label = '第 ' + (index + 1) + ' 題';
      if (!item || typeof item !== 'object') {
        errors.push(label + ' 必須是物件。');
        return;
      }
      if (!hasText(item.key)) {
        errors.push(label + ' 缺少 key。');
      } else if (!/^[A-Za-z][A-Za-z0-9_]{1,63}$/.test(item.key)) {
        errors.push(label + ' 的 key "' + item.key + '" 不合理，請使用英文字母開頭，只含英文、數字與底線。');
      } else if (keys[item.key]) {
        errors.push(label + ' 的 key "' + item.key + '" 重複。');
      } else {
        keys[item.key] = true;
      }
      if (!SUPPORTED_TYPES[item.type]) {
        errors.push(label + ' 的 type "' + item.type + '" 目前不支援，請先產生基本表單後，到 Google Forms 後台手動微調。');
      }
      if (!hasText(item.title) && item.type !== 'pageBreak') errors.push(label + ' 缺少 title。');
      if (hasText(item.title) && item.title.length > LIMITS.maxTextChars) errors.push(label + ' 的 title 過長。');
      if (item.helpText && String(item.helpText).length > LIMITS.maxTextChars) errors.push(label + ' 的 helpText 過長。');
      if (item.description && String(item.description).length > LIMITS.maxTextChars) errors.push(label + ' 的 description 過長。');
      if (OPTION_TYPES[item.type] && !hasStringArray(item.options)) {
        errors.push(label + ' 是選項題，必須提供 options array。');
      }
      if (OPTION_TYPES[item.type] && Array.isArray(item.options) && item.options.length > LIMITS.maxOptions) {
        errors.push(label + ' 的 options 超過上限 ' + LIMITS.maxOptions + ' 個。');
      }
      if (GRID_TYPES[item.type] && (!hasStringArray(item.rows) || !hasStringArray(item.columns))) {
        errors.push(label + ' 是 grid 題，必須提供 rows / columns。');
      }
      if (GRID_TYPES[item.type] && Array.isArray(item.rows) && item.rows.length > LIMITS.maxGridRows) {
        errors.push(label + ' 的 rows 超過上限 ' + LIMITS.maxGridRows + ' 列。');
      }
      if (GRID_TYPES[item.type] && Array.isArray(item.columns) && item.columns.length > LIMITS.maxGridColumns) {
        errors.push(label + ' 的 columns 超過上限 ' + LIMITS.maxGridColumns + ' 欄。');
      }
      if (item.type === 'scale') {
        if (item.lowerBound && (item.lowerBound < 0 || item.lowerBound > 10)) errors.push(label + ' lowerBound 必須在 0 到 10。');
        if (item.upperBound && (item.upperBound < 1 || item.upperBound > 10)) errors.push(label + ' upperBound 必須在 1 到 10。');
      }
    });
    return errors;
  }

  function hasText(value) {
    return typeof value === 'string' && value.trim() !== '';
  }

  function hasStringArray(value) {
    return Array.isArray(value) && value.length > 0 && value.every(function (item) {
      return typeof item === 'string' && item.trim() !== '';
    });
  }

  function fail(errors, spec) {
    return { ok: false, errors: errors, spec: spec || null };
  }

  function toUserMessage(error) {
    var message = error && error.message ? error.message : String(error);
    if (message.indexOf('Authorization') !== -1 || message.indexOf('permission') !== -1) {
      return 'Google 授權不足。請先在 Apps Script 執行 setup 並完成授權，再重新操作。';
    }
    return '建立失敗：' + message;
  }

  return {
    validateJsonText: validateJsonText,
    validateSpec: validateSpec,
    toUserMessage: toUserMessage,
    supportedTypes: Object.keys(SUPPORTED_TYPES)
  };
})();


// ===== src/AiPrompt.gs =====
var AiPrompt = (function () {
  function buildDiscussionSystemPrompt() {
    return [
      'You are a collaborative Google Form designer speaking Traditional Chinese.',
      'Discuss the form with the user over multiple turns. Ask focused questions when requirements are unclear.',
      'Keep a visible plain-language draft covering purpose, audience, form title, description, sections, questions, question types, required status, options, and analysis needs.',
      'Every response must end with the latest consolidated draft, clearly labeled 「目前表單雛型」, even when you still have follow-up questions.',
      'Do not output JSON, code fences, schema field names, or claim that the form has been created.',
      'The user controls when the draft is approved and converted to JSON.'
    ].join('\n');
  }

  function buildFormFlowSystemPrompt() {
    return [
      'Create one valid GAS FormFlow schema v1 JSON object from the user requirement.',
      'Return JSON only. schemaVersion must be "1.0".',
      'Every item needs key, type, and title. Keys start with a letter and contain only letters, numbers, and underscores.',
      'Supported types: shortText, paragraph, multipleChoice, checkbox, dropdown, date, time, scale, sectionHeader, pageBreak, grid, checkboxGrid.',
      'multipleChoice, checkbox, and dropdown require options. grid and checkboxGrid require rows and columns.',
      'Use Traditional Chinese. Add analysis metadata when it helps predictable summaries.',
      'Do not use file uploads, images, videos, quizzes, or branching logic.'
    ].join('\n');
  }

  function validateGeneratedSpec(text, model) {
    var jsonText = stripCodeFence(text);
    var validation = SchemaValidator.validateJsonText(jsonText);
    if (!validation.ok) {
      return {
        ok: false,
        errors: ['AI \u7522\u751f\u7684 JSON \u672a\u901a\u904e FormFlow \u9a57\u8b49\uff0c\u5df2\u4fdd\u7559\u539f\u59cb\u5167\u5bb9\u4f9b\u4fee\u6539\u3002'].concat(validation.errors),
        jsonText: jsonText,
        model: model
      };
    }
    return {
      jsonText: JSON.stringify(validation.spec, null, 2),
      model: model
    };
  }

  function stripCodeFence(text) {
    var fence = String.fromCharCode(96, 96, 96);
    var value = String(text || '').trim();
    if (value.indexOf(fence) === 0) value = value.slice(fence.length).replace(/^json\s*/i, '');
    if (value.lastIndexOf(fence) === value.length - fence.length) value = value.slice(0, -fence.length);
    return value.trim();
  }

  return {
    buildDiscussionSystemPrompt: buildDiscussionSystemPrompt,
    buildFormFlowSystemPrompt: buildFormFlowSystemPrompt,
    validateGeneratedSpec: validateGeneratedSpec
  };
})();


// ===== src/GeminiService.gs =====
var GeminiService = (function () {
  var API_BASE = 'https://generativelanguage.googleapis.com/v1beta';
  var API_KEY_PROPERTY = 'FORMFLOW_AI_GOOGLE_API_KEY';
  var MODEL_PROPERTY = 'FORMFLOW_AI_GOOGLE_MODEL';
  var MAX_REQUIREMENT_CHARS = 20000;

  function getSettings() {
    var props = PropertiesService.getScriptProperties();
    return {
      hasApiKey: !!props.getProperty(API_KEY_PROPERTY),
      model: props.getProperty(MODEL_PROPERTY) || ''
    };
  }

  function listModels(apiKey) {
    var resolvedKey = resolveApiKey(apiKey);
    var data = requestJson('/models?pageSize=1000', { method: 'get' }, resolvedKey);
    return (data.models || [])
      .filter(function (model) {
        return isFormDesignModel(model);
      })
      .map(toModelOption)
      .sort(function (a, b) {
        return a.label.localeCompare(b.label);
      });
  }

  function saveApiKey(apiKey) {
    var resolvedKey = resolveApiKey(apiKey);
    var models = listModels(resolvedKey);
    var props = PropertiesService.getScriptProperties();
    props.setProperty(API_KEY_PROPERTY, resolvedKey);
    props.deleteProperty(MODEL_PROPERTY);
    return { settings: getSettings(), models: models };
  }

  function saveModel(modelName) {
    var normalizedModel = normalizeModelName(modelName);
    var models = listModels('');
    var isAvailable = models.some(function (model) { return model.name === normalizedModel; });
    if (!isAvailable) throw new Error('AI_MODEL|The selected model is not available for this API key.');
    PropertiesService.getScriptProperties().setProperty(MODEL_PROPERTY, normalizedModel);
    return getSettings();
  }

  function saveSettings(apiKey, modelName) {
    var resolvedKey = resolveApiKey(apiKey);
    var normalizedModel = normalizeModelName(modelName);
    var models = listModels(resolvedKey);
    var isAvailable = models.some(function (model) { return model.name === normalizedModel; });
    if (!isAvailable) throw new Error('AI_MODEL|The selected model is not available for this API key.');
    PropertiesService.getScriptProperties().setProperties({
      FORMFLOW_AI_GOOGLE_API_KEY: resolvedKey,
      FORMFLOW_AI_GOOGLE_MODEL: normalizedModel
    });
    return getSettings();
  }

  function clearSettings() {
    PropertiesService.getScriptProperties().deleteProperty(API_KEY_PROPERTY);
    PropertiesService.getScriptProperties().deleteProperty(MODEL_PROPERTY);
    return getSettings();
  }

  function generateSpec(requirement, modelName) {
    var prompt = String(requirement || '').trim();
    if (prompt.length < 5) throw new Error('AI_CONFIG|Please enter a form requirement.');
    if (prompt.length > MAX_REQUIREMENT_CHARS) throw new Error('AI_CONFIG|The requirement is too long.');
    var apiKey = resolveApiKey('');
    var model = normalizeModelName(modelName || getSettings().model);
    var response = requestJson('/' + model + ':generateContent', {
      method: 'post',
      payload: buildGenerationRequest(prompt)
    }, apiKey);
    return AiPrompt.validateGeneratedSpec(extractResponseText(response), model);
  }

  function discussForm(messages, modelName) {
    var apiKey = resolveApiKey('');
    var model = normalizeModelName(modelName || getSettings().model);
    var response = requestJson('/' + model + ':generateContent', {
      method: 'post',
      payload: {
        systemInstruction: { parts: [{ text: AiPrompt.buildDiscussionSystemPrompt() }] },
        contents: messages.map(function (message) {
          return {
            role: message.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: message.content }]
          };
        }),
        generationConfig: { temperature: 0.4, maxOutputTokens: 4096 }
      }
    }, apiKey);
    return extractResponseText(response);
  }

  function isFormDesignModel(model) {
    var name = String(model && model.name || '').toLowerCase();
    if ((model.supportedGenerationMethods || []).indexOf('generateContent') === -1) return false;
    return !/(tts|image|banana|lyria|robotics|computer-use|deep-research|antigravity|omni)/.test(name);
  }

  function toModelOption(model) {
    var name = normalizeModelName(model.name || model.baseModelId || '');
    return {
      id: name.replace(/^models\//, ''),
      name: name,
      label: model.displayName || name.replace(/^models\//, ''),
      description: model.description || '',
      inputTokenLimit: Number(model.inputTokenLimit || 0),
      outputTokenLimit: Number(model.outputTokenLimit || 0)
    };
  }

  function resolveApiKey(apiKey) {
    var provided = String(apiKey || '').trim();
    var resolved = provided || PropertiesService.getScriptProperties().getProperty(API_KEY_PROPERTY) || '';
    if (resolved.length < 20) throw new Error('AI_CONFIG|A valid Gemini API key is required.');
    return resolved;
  }

  function normalizeModelName(modelName) {
    var name = String(modelName || '').trim();
    if (name && name.indexOf('models/') !== 0) name = 'models/' + name;
    if (!/^models\/[A-Za-z0-9._-]+$/.test(name)) throw new Error('AI_MODEL|Select a valid model.');
    return name;
  }

  function buildGenerationRequest(requirement) {
    return {
      systemInstruction: {
        parts: [{ text: AiPrompt.buildFormFlowSystemPrompt() }]
      },
      contents: [{
        role: 'user',
        parts: [{ text: requirement }]
      }],
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.2
      }
    };
  }

  function requestJson(path, request, apiKey) {
    var options = {
      method: request.method || 'get',
      headers: { 'x-goog-api-key': apiKey },
      muteHttpExceptions: true
    };
    if (request.payload) {
      options.contentType = 'application/json';
      options.payload = JSON.stringify(request.payload);
    }
    var response = UrlFetchApp.fetch(API_BASE + path, options);
    var status = response.getResponseCode();
    var text = response.getContentText();
    var data;
    try {
      data = text ? JSON.parse(text) : {};
    } catch (error) {
      throw new Error('AI_RESPONSE|Gemini returned an unreadable response.');
    }
    if (status < 200 || status >= 300) throw buildHttpError(status, data, apiKey);
    return data;
  }

  function buildHttpError(status, data, apiKey) {
    var providerMessage = data && data.error && data.error.message ? data.error.message : 'Request failed.';
    var safeMessage = sanitizeProviderMessage(providerMessage, apiKey);
    if (status === 401 || status === 403) return new Error('AI_AUTH|' + safeMessage);
    if (status === 429) return new Error('AI_QUOTA|' + safeMessage);
    return new Error('AI_REMOTE|' + safeMessage);
  }

  function sanitizeProviderMessage(message, apiKey) {
    return String(message || '')
      .split(String(apiKey || '')).join('***')
      .replace(/([?&]key=)[^&\s]+/gi, '$1***')
      .slice(0, 300);
  }

  function extractResponseText(response) {
    var candidates = response && response.candidates ? response.candidates : [];
    var parts = candidates[0] && candidates[0].content ? candidates[0].content.parts || [] : [];
    var text = parts.map(function (part) { return part.text || ''; }).join('').trim();
    if (!text) throw new Error('AI_RESPONSE|Gemini returned no content.');
    return text;
  }

  return {
    getSettings: getSettings,
    listModels: listModels,
    saveApiKey: saveApiKey,
    saveModel: saveModel,
    saveSettings: saveSettings,
    clearSettings: clearSettings,
    discussForm: discussForm,
    generateSpec: generateSpec
  };
})();


// ===== src/GroqService.gs =====
var GroqService = (function () {
  var API_BASE = 'https://api.groq.com/openai/v1';
  var API_KEY_PROPERTY = 'FORMFLOW_AI_GROQ_API_KEY';
  var MODEL_PROPERTY = 'FORMFLOW_AI_GROQ_MODEL';
  var MAX_REQUIREMENT_CHARS = 20000;

  function getSettings() {
    var props = PropertiesService.getScriptProperties();
    return {
      hasApiKey: !!props.getProperty(API_KEY_PROPERTY),
      model: props.getProperty(MODEL_PROPERTY) || ''
    };
  }

  function listModels(apiKey) {
    var resolvedKey = resolveApiKey(apiKey);
    var data = requestJson('/models', { method: 'get' }, resolvedKey);
    return (data.data || [])
      .filter(isTextGenerationModel)
      .map(toModelOption)
      .sort(function (a, b) { return a.label.localeCompare(b.label); });
  }

  function saveApiKey(apiKey) {
    var resolvedKey = resolveApiKey(apiKey);
    var models = listModels(resolvedKey);
    var props = PropertiesService.getScriptProperties();
    props.setProperty(API_KEY_PROPERTY, resolvedKey);
    props.deleteProperty(MODEL_PROPERTY);
    return { settings: getSettings(), models: models };
  }

  function saveModel(modelName) {
    var normalizedModel = normalizeModelName(modelName);
    var models = listModels('');
    var isAvailable = models.some(function (model) { return model.name === normalizedModel; });
    if (!isAvailable) throw new Error('AI_MODEL|The selected model is not available for this API key.');
    PropertiesService.getScriptProperties().setProperty(MODEL_PROPERTY, normalizedModel);
    return getSettings();
  }

  function saveSettings(apiKey, modelName) {
    var resolvedKey = resolveApiKey(apiKey);
    var normalizedModel = normalizeModelName(modelName);
    var models = listModels(resolvedKey);
    var isAvailable = models.some(function (model) { return model.name === normalizedModel; });
    if (!isAvailable) throw new Error('AI_MODEL|The selected model is not available for this API key.');
    PropertiesService.getScriptProperties().setProperties({
      FORMFLOW_AI_GROQ_API_KEY: resolvedKey,
      FORMFLOW_AI_GROQ_MODEL: normalizedModel
    });
    return getSettings();
  }

  function clearSettings() {
    PropertiesService.getScriptProperties().deleteProperty(API_KEY_PROPERTY);
    PropertiesService.getScriptProperties().deleteProperty(MODEL_PROPERTY);
    return getSettings();
  }

  function generateSpec(requirement, modelName) {
    var prompt = String(requirement || '').trim();
    if (prompt.length < 5) throw new Error('AI_CONFIG|Please enter a form requirement.');
    if (prompt.length > MAX_REQUIREMENT_CHARS) throw new Error('AI_CONFIG|The requirement is too long.');
    var apiKey = resolveApiKey('');
    var model = normalizeModelName(modelName || getSettings().model);
    var response = requestJson('/chat/completions', {
      method: 'post',
      payload: {
        model: model,
        messages: [
          { role: 'system', content: AiPrompt.buildFormFlowSystemPrompt() },
          { role: 'user', content: prompt }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.2
      }
    }, apiKey);
    return AiPrompt.validateGeneratedSpec(extractResponseText(response), model);
  }

  function discussForm(messages, modelName) {
    var apiKey = resolveApiKey('');
    var model = normalizeModelName(modelName || getSettings().model);
    var response = requestJson('/chat/completions', {
      method: 'post',
      payload: {
        model: model,
        messages: [{ role: 'system', content: AiPrompt.buildDiscussionSystemPrompt() }].concat(messages),
        temperature: 0.4
      }
    }, apiKey);
    return extractResponseText(response);
  }

  function isTextGenerationModel(model) {
    var id = String(model && model.id || '').toLowerCase();
    if (!id || model.active === false) return false;
    return !/(whisper|speech|audio|tts|orpheus|guard|safeguard)/.test(id);
  }

  function toModelOption(model) {
    var id = normalizeModelName(model.id);
    var owner = model.owned_by ? 'Owned by ' + model.owned_by : '';
    return {
      id: id,
      name: id,
      label: id,
      description: owner,
      inputTokenLimit: Number(model.context_window || 0),
      outputTokenLimit: Number(model.max_completion_tokens || 0)
    };
  }

  function resolveApiKey(apiKey) {
    var provided = String(apiKey || '').trim();
    var resolved = provided || PropertiesService.getScriptProperties().getProperty(API_KEY_PROPERTY) || '';
    if (resolved.length < 20) throw new Error('AI_CONFIG|A valid Groq API key is required.');
    return resolved;
  }

  function normalizeModelName(modelName) {
    var name = String(modelName || '').trim();
    if (!/^[A-Za-z0-9._\/-]+$/.test(name) || name.indexOf('..') !== -1) throw new Error('AI_MODEL|Select a valid model.');
    return name;
  }

  function requestJson(path, request, apiKey) {
    var options = {
      method: request.method || 'get',
      headers: { Authorization: 'Bearer ' + apiKey },
      muteHttpExceptions: true
    };
    if (request.payload) {
      options.contentType = 'application/json';
      options.payload = JSON.stringify(request.payload);
    }
    var response = UrlFetchApp.fetch(API_BASE + path, options);
    var status = response.getResponseCode();
    var text = response.getContentText();
    var data;
    try {
      data = text ? JSON.parse(text) : {};
    } catch (error) {
      throw new Error('AI_RESPONSE|Groq returned an unreadable response.');
    }
    if (status < 200 || status >= 300) throw buildHttpError(status, data, apiKey);
    return data;
  }

  function buildHttpError(status, data, apiKey) {
    var providerMessage = data && data.error && data.error.message ? data.error.message : 'Request failed.';
    var safeMessage = sanitizeProviderMessage(providerMessage, apiKey);
    if (status === 401 || status === 403) return new Error('AI_AUTH|' + safeMessage);
    if (status === 429) return new Error('AI_QUOTA|' + safeMessage);
    return new Error('AI_REMOTE|' + safeMessage);
  }

  function sanitizeProviderMessage(message, apiKey) {
    return String(message || '')
      .split(String(apiKey || '')).join('***')
      .replace(/(Bearer\s+)[^\s]+/gi, '$1***')
      .slice(0, 300);
  }

  function extractResponseText(response) {
    var choices = response && response.choices ? response.choices : [];
    var text = choices[0] && choices[0].message ? String(choices[0].message.content || '').trim() : '';
    if (!text) throw new Error('AI_RESPONSE|Groq returned no content.');
    return text;
  }

  return {
    getSettings: getSettings,
    listModels: listModels,
    saveApiKey: saveApiKey,
    saveModel: saveModel,
    saveSettings: saveSettings,
    clearSettings: clearSettings,
    discussForm: discussForm,
    generateSpec: generateSpec
  };
})();


// ===== src/AiService.gs =====
var AiService = (function () {
  var DEFAULT_PROVIDER = 'google-gemini';

  function getProviders() {
    return [
      { id: 'google-gemini', label: 'Google Gemini API' },
      { id: 'groq', label: 'Groq API' }
    ];
  }

  function getSettings(providerId) {
    var selectedProvider = normalizeProviderId(providerId);
    var settings = getProvider(selectedProvider).getSettings();
    return {
      providers: getProviders(),
      provider: selectedProvider,
      hasApiKey: settings.hasApiKey,
      model: settings.model
    };
  }

  function listModels(providerId, apiKey) {
    var selectedProvider = normalizeProviderId(providerId);
    var provider = getProvider(selectedProvider);
    return {
      provider: selectedProvider,
      models: provider.listModels(apiKey),
      hasApiKey: provider.getSettings().hasApiKey
    };
  }

  function saveApiKey(providerId, apiKey) {
    var selectedProvider = normalizeProviderId(providerId);
    var result = getProvider(selectedProvider).saveApiKey(apiKey);
    return {
      provider: selectedProvider,
      hasApiKey: result.settings.hasApiKey,
      model: result.settings.model,
      models: result.models
    };
  }

  function saveModel(providerId, modelName) {
    var selectedProvider = normalizeProviderId(providerId);
    var settings = getProvider(selectedProvider).saveModel(modelName);
    return {
      provider: selectedProvider,
      hasApiKey: settings.hasApiKey,
      model: settings.model
    };
  }

  function saveSettings(providerId, apiKey, modelName) {
    var selectedProvider = normalizeProviderId(providerId);
    var settings = getProvider(selectedProvider).saveSettings(apiKey, modelName);
    return {
      provider: selectedProvider,
      hasApiKey: settings.hasApiKey,
      model: settings.model
    };
  }

  function clearSettings(providerId) {
    var selectedProvider = normalizeProviderId(providerId);
    var settings = getProvider(selectedProvider).clearSettings();
    return {
      provider: selectedProvider,
      hasApiKey: settings.hasApiKey,
      model: settings.model
    };
  }

  function generateSpec(providerId, requirement, modelName) {
    var selectedProvider = normalizeProviderId(providerId);
    return getProvider(selectedProvider).generateSpec(requirement, modelName);
  }

  function discussForm(providerId, messages, modelName) {
    var selectedProvider = normalizeProviderId(providerId);
    return {
      provider: selectedProvider,
      model: modelName,
      reply: getProvider(selectedProvider).discussForm(normalizeMessages(messages), modelName)
    };
  }

  function normalizeMessages(messages) {
    if (!Array.isArray(messages) || messages.length === 0) {
      throw new Error('AI_CONFIG|請先輸入想討論的表單需求。');
    }
    var normalized = messages.slice(-24).map(function (message) {
      var role = message && message.role === 'assistant' ? 'assistant' : 'user';
      var content = String(message && message.content || '').trim();
      if (!content || content.length > 6000) throw new Error('AI_CONFIG|單則對話內容需介於 1 到 6000 字。');
      return { role: role, content: content };
    });
    var totalLength = normalized.reduce(function (total, message) { return total + message.content.length; }, 0);
    if (totalLength > 40000) throw new Error('AI_CONFIG|對話內容過長，請重開討論或精簡需求。');
    return normalized;
  }

  function normalizeProviderId(providerId) {
    return String(providerId || DEFAULT_PROVIDER);
  }

  function getProvider(providerId) {
    if (providerId === 'google-gemini') return GeminiService;
    if (providerId === 'groq') return GroqService;
    throw new Error('AI_PROVIDER|Unsupported AI provider.');
  }

  function toUserMessage(error) {
    var message = error && error.message ? error.message : String(error || '');
    var separator = message.indexOf('|');
    var code = separator === -1 ? 'AI_REMOTE' : message.slice(0, separator);
    var detail = separator === -1 ? '' : message.slice(separator + 1);
    if (code === 'AI_AUTH') return 'API Key \u7121\u6548\u3001\u672a\u555f\u7528\uff0c\u6216\u6c92\u6709\u6b0a\u9650\u3002\u8acb\u5230 provider console \u6aa2\u67e5 Key \u8a2d\u5b9a\u3002';
    if (code === 'AI_QUOTA') return 'API \u984d\u5ea6\u5df2\u7528\u5b8c\u6216\u8acb\u6c42\u904e\u65bc\u983b\u7e41\uff0c\u8acb\u7a0d\u5f8c\u518d\u8a66\u3002';
    if (code === 'AI_MODEL') return '\u9078\u64c7\u7684\u6a21\u578b\u7121\u6548\uff0c\u6216\u4e0d\u652f\u63f4\u76ee\u524d\u7684\u8868\u55ae\u8a2d\u8a08\u4efb\u52d9\u3002';
    if (code === 'AI_CONFIG') return detail || '\u8acb\u5148\u5b8c\u6210 AI \u8a2d\u5b9a\u3002';
    if (code === 'AI_RESPONSE') return 'AI provider \u6c92\u6709\u56de\u50b3\u53ef\u7528\u5167\u5bb9\uff0c\u8acb\u8abf\u6574\u8aaa\u660e\u5f8c\u91cd\u8a66\u3002';
    if (code === 'AI_PROVIDER') return '\u76ee\u524d\u53ea\u652f\u63f4 Google Gemini API \u8207 Groq API\u3002';
    return 'AI provider \u9023\u7dda\u5931\u6557\u3002' + (detail ? ' ' + detail : '');
  }

  return {
    getSettings: getSettings,
    listModels: listModels,
    saveApiKey: saveApiKey,
    saveModel: saveModel,
    saveSettings: saveSettings,
    clearSettings: clearSettings,
    discussForm: discussForm,
    generateSpec: generateSpec,
    toUserMessage: toUserMessage
  };
})();


// ===== src/FormBuilder.gs =====
var FormBuilder = (function () {
  function preview(spec) {
    return {
      title: spec.title,
      description: spec.description || '',
      itemCount: spec.items.length,
      items: spec.items.map(function (item) {
        return {
          key: item.key,
          type: item.type,
          title: item.title || '',
          helpText: item.helpText || item.description || '',
          required: !!item.required,
          options: item.options || [],
          rows: item.rows || [],
          columns: item.columns || [],
          lowerBound: item.lowerBound !== undefined ? item.lowerBound : 1,
          upperBound: item.upperBound !== undefined ? item.upperBound : 5,
          lowerLabel: item.lowerLabel || '',
          upperLabel: item.upperLabel || ''
        };
      })
    };
  }

  function create(spec) {
    var form = FormApp.create(spec.title);
    var description = spec.description ? String(spec.description) : '';
    form.setDescription(description);
    if (spec.confirmationMessage) form.setConfirmationMessage(spec.confirmationMessage);
    spec.items.forEach(function (item) {
      addItem(form, item);
    });
    return {
      form: form,
      description: form.getDescription(),
      publishedUrl: form.getPublishedUrl(),
      editUrl: form.getEditUrl()
    };
  }

  function addItem(form, item) {
    var created;
    switch (item.type) {
      case 'shortText':
        created = form.addTextItem();
        setCommon(created, item);
        break;
      case 'paragraph':
        created = form.addParagraphTextItem();
        setCommon(created, item);
        break;
      case 'multipleChoice':
        created = form.addMultipleChoiceItem();
        setCommon(created, item);
        created.setChoiceValues(item.options);
        break;
      case 'checkbox':
        created = form.addCheckboxItem();
        setCommon(created, item);
        created.setChoiceValues(item.options);
        break;
      case 'dropdown':
        created = form.addListItem();
        setCommon(created, item);
        created.setChoiceValues(item.options);
        break;
      case 'date':
        created = form.addDateItem();
        setCommon(created, item);
        break;
      case 'time':
        created = form.addTimeItem();
        setCommon(created, item);
        break;
      case 'scale':
        created = form.addScaleItem();
        setCommon(created, item);
        created.setBounds(
          item.lowerBound !== undefined ? item.lowerBound : 1,
          item.upperBound !== undefined ? item.upperBound : 5
        );
        if (item.lowerLabel || item.upperLabel) created.setLabels(item.lowerLabel || '', item.upperLabel || '');
        break;
      case 'sectionHeader':
        created = form.addSectionHeaderItem();
        created.setTitle(item.title);
        setHelpText(created, item);
        break;
      case 'pageBreak':
        created = form.addPageBreakItem();
        if (item.title) created.setTitle(item.title);
        setHelpText(created, item);
        break;
      case 'grid':
        created = form.addGridItem();
        setCommon(created, item);
        created.setRows(item.rows);
        created.setColumns(item.columns);
        break;
      case 'checkboxGrid':
        created = form.addCheckboxGridItem();
        setCommon(created, item);
        created.setRows(item.rows);
        created.setColumns(item.columns);
        break;
      default:
        throw new Error('此功能目前不支援：' + item.type + '。請先產生基本表單後，到 Google Forms 後台手動微調。');
    }
  }

  function setCommon(formItem, item) {
    formItem.setTitle(item.title);
    setHelpText(formItem, item);
    if (typeof formItem.setRequired === 'function') formItem.setRequired(!!item.required);
  }

  function setHelpText(formItem, item) {
    var helpText = item.helpText || item.description || '';
    if (helpText) formItem.setHelpText(String(helpText));
  }

  return {
    preview: preview,
    create: create
  };
})();


// ===== src/SheetBuilder.gs =====
var SheetBuilder = (function () {
  var SHEETS = ['Form Responses 1', 'Clean_Data', 'Question_Meta', 'Summary', 'Announcement', 'Generator_Log'];

  function preview(spec) {
    var statItems = getStatItems(spec);
    return {
      sheets: SHEETS,
      cleanDataColumns: ['timestamp'].concat(spec.items.filter(isDataItem).map(function (item) { return item.key; })),
      statFields: statItems.map(function (item) { return item.key; }),
      nonStatFields: spec.items.filter(isDataItem).filter(function (item) {
        return !statItems.some(function (candidate) { return candidate.key === item.key; });
      }).map(function (item) { return item.key; }),
      summaryPlan: buildSummaryPlan(spec)
    };
  }

  function create(spec, formResult) {
    var spreadsheet = SpreadsheetApp.create(spec.sheetName || (spec.title + ' Responses'));
    ensureSheets(spreadsheet);
    writeCleanData(spreadsheet, spec);
    writeQuestionMeta(spreadsheet, spec);
    SummaryBuilder.writeSummary(spreadsheet, spec);
    writeAnnouncement(spreadsheet, '');
    writeLogHeader(spreadsheet);
    return {
      spreadsheet: spreadsheet,
      sheetUrl: spreadsheet.getUrl()
    };
  }

  function ensureSheets(spreadsheet) {
    var first = spreadsheet.getSheets()[0];
    first.setName('Clean_Data');
    SHEETS.filter(function (name) { return name !== 'Form Responses 1' && name !== 'Clean_Data'; }).forEach(function (name) {
      var existing = spreadsheet.getSheetByName(name);
      if (!existing) spreadsheet.insertSheet(name);
    });
  }

  function writeCleanData(spreadsheet, spec) {
    var sheet = spreadsheet.getSheetByName('Clean_Data');
    sheet.clear();
    var columns = preview(spec).cleanDataColumns;
    sheet.getRange(1, 1, 1, columns.length).setValues([columns]);
    var formulas = columns.map(function (_, index) {
      var sourceColumn = columnLetter(index + 1);
      return '=ARRAYFORMULA(IF(\'Form Responses 1\'!' + sourceColumn + '2:' + sourceColumn + '="",,\'Form Responses 1\'!' + sourceColumn + '2:' + sourceColumn + '))';
    });
    sheet.getRange(2, 1, 1, formulas.length).setFormulas([formulas]);
    sheet.setFrozenRows(1);
  }

  function writeQuestionMeta(spreadsheet, spec) {
    var sheet = spreadsheet.getSheetByName('Question_Meta');
    sheet.clear();
    var rows = [['key', 'title', 'type', 'required', 'options', 'analysis_role', 'summary_type']];
    spec.items.filter(isDataItem).forEach(function (item) {
      rows.push([
        safeCellText(item.key),
        safeCellText(item.title || ''),
        safeCellText(item.type),
        !!item.required,
        safeCellText(JSON.stringify(item.options || item.rows || [])),
        safeCellText(item.analysis && item.analysis.role ? item.analysis.role : ''),
        safeCellText(item.analysis && item.analysis.summary ? item.analysis.summary : inferSummaryType(item))
      ]);
    });
    sheet.getRange(1, 1, rows.length, rows[0].length).setValues(rows);
    sheet.setFrozenRows(1);
  }

  function writeAnnouncement(spreadsheet, announcement) {
    var sheet = spreadsheet.getSheetByName('Announcement');
    sheet.clear();
    sheet.getRange(1, 1, 2, 1).setValues([['announcement'], [safeCellText(announcement || '')]]);
    sheet.setColumnWidth(1, 700);
  }

  function writeLogHeader(spreadsheet) {
    var sheet = spreadsheet.getSheetByName('Generator_Log');
    sheet.clear();
    sheet.getRange(1, 1, 1, 5).setValues([['createdAt', 'title', 'publishedUrl', 'editUrl', 'sheetUrl']]);
    sheet.setFrozenRows(1);
  }

  function writeLog(spreadsheet, data) {
    var sheet = spreadsheet.getSheetByName('Generator_Log');
    sheet.appendRow([new Date(), safeCellText(data.title || ''), data.publishedUrl || '', data.editUrl || '', data.sheetUrl || '']);
  }

  function renderTemplate(template, values) {
    var base = template || '【{title}】\n\n請填寫表單：\n{publishedUrl}\n\n{deadlineText}\n{notice}';
    return base.replace(/\{([A-Za-z0-9_]+)\}/g, function (_, key) {
      return values[key] || '';
    }).replace(/\n{3,}/g, '\n\n').trim();
  }

  function buildSummaryPlan(spec) {
    var plans = ['回覆總數', '缺漏檢查'];
    getStatItems(spec).forEach(function (item) {
      plans.push(item.key + ': ' + inferSummaryType(item));
    });
    var primaryKey = spec.analysis && spec.analysis.primaryKey;
    if (primaryKey) plans.push('疑似重複檢查: ' + primaryKey);
    return plans;
  }

  function getStatItems(spec) {
    return spec.items.filter(isDataItem).filter(function (item) {
      return ['multipleChoice', 'checkbox', 'dropdown', 'scale', 'date', 'time'].indexOf(item.type) !== -1 ||
        (item.analysis && item.analysis.summary);
    });
  }

  function inferSummaryType(item) {
    if (item.analysis && item.analysis.summary) return item.analysis.summary;
    if (['multipleChoice', 'dropdown'].indexOf(item.type) !== -1) return 'countOptions';
    if (item.type === 'checkbox') return 'countCheckboxOptions';
    if (item.type === 'scale') return 'averageAndDistribution';
    if (item.type === 'date') return 'countDates';
    if (item.type === 'time') return 'countTimes';
    return '';
  }

  function isDataItem(item) {
    return ['sectionHeader', 'pageBreak'].indexOf(item.type) === -1;
  }

  function safeCellText(value) {
    var text = String(value == null ? '' : value);
    return /^[=+\-@]/.test(text) ? "'" + text : text;
  }

  function columnLetter(columnNumber) {
    var letter = '';
    while (columnNumber > 0) {
      var modulo = (columnNumber - 1) % 26;
      letter = String.fromCharCode(65 + modulo) + letter;
      columnNumber = Math.floor((columnNumber - modulo) / 26);
    }
    return letter;
  }

  return {
    preview: preview,
    create: create,
    writeAnnouncement: writeAnnouncement,
    writeLog: writeLog,
    renderTemplate: renderTemplate,
    inferSummaryType: inferSummaryType,
    isDataItem: isDataItem,
    columnLetter: columnLetter,
    safeCellText: safeCellText
  };
})();


// ===== src/SummaryBuilder.gs =====
var SummaryBuilder = (function () {
  function writeSummary(spreadsheet, spec) {
    var sheet = spreadsheet.getSheetByName('Summary');
    sheet.clear();
    var rows = [
      ['section', 'field', 'metric', 'value'],
      ['overview', 'responses', 'total', '=MAX(0,COUNTA(\'Form Responses 1\'!A:A)-1)']
    ];
    var dataColumn = 2;
    spec.items.filter(SheetBuilder.isDataItem).forEach(function (item) {
      var summaryType = SheetBuilder.inferSummaryType(item);
      if (summaryType) rows = rows.concat(buildRows(item, dataColumn, summaryType));
      dataColumn += 1;
    });
    if (spec.analysis && spec.analysis.primaryKey) {
      var primaryIndex = findDataIndex(spec, spec.analysis.primaryKey);
      if (primaryIndex !== -1) {
        var primaryColumn = SheetBuilder.columnLetter(primaryIndex + 2);
        rows.push(['quality', SheetBuilder.safeCellText(spec.analysis.primaryKey), 'possibleDuplicates', '=IF(COUNTIF(Clean_Data!' + primaryColumn + '2:' + primaryColumn + ',"?*")=0,0,MAX(COUNTIF(Clean_Data!' + primaryColumn + '2:' + primaryColumn + ',FILTER(Clean_Data!' + primaryColumn + '2:' + primaryColumn + ',Clean_Data!' + primaryColumn + '2:' + primaryColumn + '<>""))))']);
      }
    }
    spec.items.filter(SheetBuilder.isDataItem).forEach(function (item, index) {
      if (!item.required) return;
      var column = SheetBuilder.columnLetter(index + 2);
      rows.push(['quality', SheetBuilder.safeCellText(item.key), 'missingCount', '=MAX(0,$D$2-COUNTIF(Clean_Data!' + column + '2:' + column + ',"?*"))']);
    });
    sheet.getRange(1, 1, rows.length, rows[0].length).setValues(rows);
    sheet.setFrozenRows(1);
    sheet.autoResizeColumns(1, 4);
  }

  function buildRows(item, dataColumn, summaryType) {
    var column = SheetBuilder.columnLetter(dataColumn);
    if (['multipleChoice', 'dropdown'].indexOf(item.type) !== -1) {
      return (item.options || []).map(function (option) {
        return ['field', SheetBuilder.safeCellText(item.key), SheetBuilder.safeCellText(option), '=COUNTIF(Clean_Data!' + column + ':' + column + ',"' + escapeFormulaText(option) + '")'];
      });
    }
    if (item.type === 'checkbox') {
      return (item.options || []).map(function (option) {
        return ['field', SheetBuilder.safeCellText(item.key), SheetBuilder.safeCellText(option), '=COUNTIF(Clean_Data!' + column + ':' + column + ',"*' + escapeFormulaText(option) + '*")'];
      });
    }
    if (item.type === 'scale') {
      return [
        ['field', SheetBuilder.safeCellText(item.key), 'average', '=IFERROR(AVERAGE(Clean_Data!' + column + '2:' + column + '),"")'],
        ['field', SheetBuilder.safeCellText(item.key), 'responses', '=COUNT(Clean_Data!' + column + '2:' + column + ')']
      ];
    }
    if (item.type === 'date' || item.type === 'time') {
      return [
        ['field', SheetBuilder.safeCellText(item.key), 'filledCount', '=COUNTIF(Clean_Data!' + column + '2:' + column + ',"?*")'],
        ['field', SheetBuilder.safeCellText(item.key), 'uniqueValues', '=IF(COUNTIF(Clean_Data!' + column + '2:' + column + ',"?*")=0,0,COUNTUNIQUE(FILTER(Clean_Data!' + column + '2:' + column + ',Clean_Data!' + column + '2:' + column + '<>"")))']
      ];
    }
    return [['field', SheetBuilder.safeCellText(item.key), SheetBuilder.safeCellText(summaryType), SheetBuilder.safeCellText(buildNote(item))]];
  }

  function buildNote(item) {
    if (['multipleChoice', 'dropdown', 'checkbox'].indexOf(item.type) !== -1) {
      return 'Options: ' + (item.options || []).join(', ');
    }
    if (item.type === 'scale') return 'Compute average and distribution from response values.';
    if (item.type === 'date') return 'Count and group by response date.';
    if (item.type === 'time') return 'Count and group by response time.';
    return 'Configured by analysis metadata.';
  }

  function findDataIndex(spec, key) {
    var items = spec.items.filter(SheetBuilder.isDataItem);
    for (var index = 0; index < items.length; index += 1) {
      if (items[index].key === key) return index;
    }
    return -1;
  }

  function escapeFormulaText(value) {
    return String(value || '').replace(/"/g, '""');
  }

  return {
    writeSummary: writeSummary
  };
})();


// ===== src/QrCodeBuilder.gs =====
var QrCodeBuilder = (function () {
  function buildClientQrPayload(url) {
    return {
      provider: 'nayuki-qrcodegen-v1.8.0',
      text: url,
      note: 'Index.html encodes the form URL locally as a scannable SVG QR code.'
    };
  }

  return {
    buildClientQrPayload: buildClientQrPayload
  };
})();
