const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const required = [
  'README.md',
  'product-requirements.md',
  'src/Code.gs',
  'src/AiPrompt.gs',
  'src/GeminiService.gs',
  'src/GroqService.gs',
  'src/AiService.gs',
  'src/FormBuilder.gs',
  'src/SheetBuilder.gs',
  'src/SummaryBuilder.gs',
  'src/SchemaValidator.gs',
  'src/QrCodeBuilder.gs',
  'src/QrCodeLibrary.html',
  'src/Index.html',
  'dist/Code.gs',
  'dist/Index.html',
  'dist/appsscript.json',
  'config/appsscript.private.json',
  'config/appsscript.agent.json',
  'docs/deployment-modes.md',
  'docs/schema-v1.md',
  'docs/chatgpt-prompt.md',
  'docs/ai-gemini.zh-TW.md',
  'docs/ai-gemini.en.md',
  'docs/ai-groq.zh-TW.md',
  'docs/ai-groq.en.md',
  'docs/install.zh-TW.md',
  'docs/install.en.md',
  'examples/event-registration.json',
  'examples/attendance-survey.json',
  'examples/willingness-survey.json',
  'examples/feedback-survey.json',
  'examples/schedule-availability.json',
  'examples/household-rooming.json'
];

const publicFunctionBlocklist = [
  'apiCreateSmokeTest',
  'apiVerifySmokeResources',
  'apiAuthProbe'
];

const supportedTypes = new Set([
  'shortText',
  'paragraph',
  'multipleChoice',
  'checkbox',
  'dropdown',
  'date',
  'time',
  'scale',
  'sectionHeader',
  'pageBreak',
  'grid',
  'checkboxGrid'
]);

let failed = false;
function fail(message) {
  failed = true;
  console.error(`FAIL ${message}`);
}

for (const file of required) {
  if (!fs.existsSync(path.join(root, file))) fail(`missing ${file}`);
}

const coveredTypes = new Set();
for (const name of fs.readdirSync(path.join(root, 'examples')).filter((f) => f.endsWith('.json'))) {
  const file = path.join(root, 'examples', name);
  let spec;
  try {
    spec = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (error) {
    fail(`${name} is not valid JSON: ${error.message}`);
    continue;
  }
  if (spec.schemaVersion !== '1.0') fail(`${name} schemaVersion must be 1.0`);
  if (!spec.title) fail(`${name} missing title`);
  if (!Array.isArray(spec.items) || spec.items.length === 0) fail(`${name} needs items`);
  const keys = new Set();
  for (const [index, item] of (spec.items || []).entries()) {
    if (!item.key) fail(`${name} item ${index + 1} missing key`);
    if (keys.has(item.key)) fail(`${name} duplicate key ${item.key}`);
    keys.add(item.key);
    if (!supportedTypes.has(item.type)) fail(`${name} unsupported type ${item.type}`);
    else coveredTypes.add(item.type);
    if (['multipleChoice', 'checkbox', 'dropdown'].includes(item.type) && (!Array.isArray(item.options) || item.options.length === 0)) {
      fail(`${name} ${item.key} needs options`);
    }
    if (['grid', 'checkboxGrid'].includes(item.type) && (!Array.isArray(item.rows) || !Array.isArray(item.columns) || item.rows.length === 0 || item.columns.length === 0)) {
      fail(`${name} ${item.key} needs rows and columns`);
    }
  }
}
for (const type of supportedTypes) {
  if (!coveredTypes.has(type)) fail(`examples do not cover supported type ${type}`);
}

const distCode = fs.existsSync(path.join(root, 'dist/Code.gs')) ? fs.readFileSync(path.join(root, 'dist/Code.gs'), 'utf8') : '';
try {
  new Function(distCode);
} catch (error) {
  fail(`dist/Code.gs has JavaScript syntax error: ${error.message}`);
}
for (const fn of ['doGet', 'setup', 'apiValidateSpec', 'apiPreviewSpec', 'apiGetAiSettings', 'apiListAiModels', 'apiSaveAiKey', 'apiSaveAiModel', 'apiSaveAiSettings', 'apiDiscussFormWithAi', 'apiGenerateSpecFromOutline', 'apiClearAiSettings', 'apiGenerateSpecWithAi', 'apiCreateFormFlow']) {
  if (!distCode.includes(`function ${fn}`)) fail(`dist/Code.gs missing ${fn}`);
}
for (const fn of publicFunctionBlocklist) {
  if (new RegExp(`function\\s+${fn}\\s*\\(`).test(distCode)) {
    fail(`dist/Code.gs exposes unsafe public helper ${fn}; use a private trailing-underscore function`);
  }
}
for (const fn of ['apiCreateSmokeTest_', 'apiVerifySmokeResources_', 'setupAgentSmokeToken_', 'runPrivateAiOperation_', 'createFormFlow_', 'isAgentMode_']) {
  if (!distCode.includes(`function ${fn}`)) fail(`dist/Code.gs missing private helper ${fn}`);
}
if (!distCode.includes('function setupAgentSmokeToken(token)')) fail('dist/Code.gs missing clasp-run token setup wrapper');
if (!distCode.includes('Token setup is disabled while running in public agent validation mode')) fail('setupAgentSmokeToken must be disabled in agent mode');
if (!distCode.includes('公開 AI agent 驗證模式不允許未帶 token 的建立操作')) fail('apiCreateFormFlow must block destructive writes in agent mode');
if (!distCode.includes('\u516c\u958b AI agent \u9a57\u8b49\u6a21\u5f0f\u4e0d\u63d0\u4f9b API Key \u8207 LLM \u529f\u80fd')) fail('AI APIs must be disabled in agent mode');
if (!distCode.includes("headers: { 'x-goog-api-key': apiKey }")) fail('Gemini API key must be sent in a header');
if (distCode.includes('generativelanguage.googleapis.com/v1beta?key=')) fail('Gemini API key must not be sent in a URL');
if (!distCode.includes('safeCellText')) fail('dist/Code.gs missing spreadsheet formula-injection guard');
if (distCode.includes('DriveApp.')) fail('dist/Code.gs should not require broad DriveApp access');
const distHtml = fs.existsSync(path.join(root, 'dist/Index.html')) ? fs.readFileSync(path.join(root, 'dist/Index.html'), 'utf8') : '';
for (const helper of ['escapeHtml', 'escapeAttr', 'window.__e2e', 'qrcodegen.QrCode.encodeText', 'white-space: pre-wrap', 'detectAiModels', 'saveAiKey', 'sendAiChat', 'handleChatKeydown', 'updateChatSendState', 'showChatThinking', 'approveOutlineAndGenerateJson', 'ai-chat-log', 'chat-composer', 'ai-approve-outline']) {
  if (!distHtml.includes(helper)) fail(`dist/Index.html missing ${helper}`);
}
if (!distHtml.includes('type="password"') || !distHtml.includes('儲存後此欄位會清空')) fail('AI key UI must be masked and explain post-save clearing');
if (!distHtml.includes('content.textContent = message.content')) fail('AI chat messages must render with textContent');
if (!distHtml.includes("assistantMessage.content.includes('目前表單雛型')")) fail('Outline approval must stay disabled until the AI explicitly returns the labeled outline');
if (!distHtml.includes("event.key !== 'Enter'") || !distHtml.includes('event.shiftKey') || !distHtml.includes('event.isComposing') || !distHtml.includes('event.preventDefault()')) fail('AI chat must send on Enter, preserve Shift+Enter, and avoid IME composition submission');
if (!distHtml.includes('maxlength="6000"')) fail('AI chat input must match the backend per-message length limit');
if (distHtml.includes("<?!= include('QrCodeLibrary') ?>")) fail('dist/Index.html must inline the QR library');
if (distHtml.includes('renderQrPlaceholder') || distHtml.includes('QR placeholder')) fail('dist/Index.html must not contain the QR placeholder');
verifyInlineScripts(distHtml);
verifyQrEncoder();
verifyFormDescriptions();
verifyAiServices();
verifyGroqServices();

const manifest = JSON.parse(fs.readFileSync(path.join(root, 'dist/appsscript.json'), 'utf8'));
const privateManifest = JSON.parse(fs.readFileSync(path.join(root, 'config/appsscript.private.json'), 'utf8'));
const agentManifest = JSON.parse(fs.readFileSync(path.join(root, 'config/appsscript.agent.json'), 'utf8'));
validateManifest('config/appsscript.private.json', privateManifest, { access: 'MYSELF', executeAs: 'USER_DEPLOYING', externalRequest: true });
validateManifest('config/appsscript.agent.json', agentManifest, { access: 'ANYONE', executeAs: 'USER_DEPLOYING', externalRequest: false });
if (manifest.webapp?.access === 'MYSELF') validateManifest('dist/appsscript.json', manifest, { access: 'MYSELF', executeAs: 'USER_DEPLOYING', externalRequest: true });
else if (manifest.webapp?.access === 'ANYONE') validateManifest('dist/appsscript.json', manifest, { access: 'ANYONE', executeAs: 'USER_DEPLOYING', externalRequest: false });
else fail('dist/appsscript.json webapp.access must be MYSELF or ANYONE');

const invalidFixtures = [
  {
    name: 'duplicate keys',
    spec: {
      schemaVersion: '1.0',
      title: 'Duplicate',
      items: [
        { key: 'name', type: 'shortText', title: 'Name' },
        { key: 'name', type: 'paragraph', title: 'Name again' }
      ]
    },
    mustContain: '重複'
  },
  {
    name: 'missing options',
    spec: {
      schemaVersion: '1.0',
      title: 'Missing options',
      items: [{ key: 'choice', type: 'multipleChoice', title: 'Choice' }]
    },
    mustContain: '必須提供 options'
  },
  {
    name: 'missing grid rows columns',
    spec: {
      schemaVersion: '1.0',
      title: 'Missing grid',
      items: [{ key: 'grid_field', type: 'grid', title: 'Grid' }]
    },
    mustContain: '必須提供 rows / columns'
  },
  {
    name: 'too many items',
    spec: {
      schemaVersion: '1.0',
      title: 'Too many',
      items: Array.from({ length: 121 }, (_, i) => ({ key: `field_${i}`, type: 'shortText', title: `Field ${i}` }))
    },
    mustContain: '題目數量超過'
  },
  {
    name: 'too many options',
    spec: {
      schemaVersion: '1.0',
      title: 'Too many options',
      items: [{ key: 'choice', type: 'dropdown', title: 'Choice', options: Array.from({ length: 81 }, (_, i) => `Option ${i}`) }]
    },
    mustContain: 'options 超過上限'
  },
  {
    name: 'bad key and unsupported type',
    spec: {
      schemaVersion: '1.0',
      title: 'Bad',
      items: [{ key: 'bad key', type: 'fileUpload', title: 'File' }]
    },
    mustContain: '目前不支援'
  }
];

for (const fixture of invalidFixtures) {
  const errors = validateSpecLikeGas(fixture.spec);
  if (!errors.join('\n').includes(fixture.mustContain)) fail(`invalid fixture did not fail as expected: ${fixture.name}`);
}

const formulaInputs = ['=IMPORTXML("https://example.com")', '+SUM(1,1)', '-1+2', '@cmd', 'normal'];
const formulaExpected = ["'=IMPORTXML(\"https://example.com\")", "'+SUM(1,1)", "'-1+2", "'@cmd", 'normal'];
formulaInputs.forEach((value, index) => {
  if (safeCellTextLikeGas(value) !== formulaExpected[index]) fail(`safeCellText formula guard failed for index ${index}`);
});

function validateSpecLikeGas(spec) {
  const errors = [];
  const keys = new Set();
  if (spec.schemaVersion !== '1.0') errors.push('schemaVersion 目前只支援 "1.0"。');
  if (!spec.title) errors.push('title 為必填。');
  if (String(JSON.stringify(spec)).length > 120000) errors.push('JSON 太大，v1 目前不支援超大型問卷。請先縮減題目或分批建立。');
  if (spec.title && spec.title.length > 180) errors.push('title 過長，請縮短到 180 字以內。');
  if (spec.items.length > 120) errors.push('題目數量超過 v1 上限 120 題，請拆成多個表單。');
  for (const [index, item] of spec.items.entries()) {
    const label = `第 ${index + 1} 題`;
    if (!/^[A-Za-z][A-Za-z0-9_]{1,63}$/.test(item.key || '')) errors.push(`${label} 的 key "${item.key}" 不合理，請使用英文字母開頭，只含英文、數字與底線。`);
    if (keys.has(item.key)) errors.push(`${label} 的 key "${item.key}" 重複。`);
    keys.add(item.key);
    if (!supportedTypes.has(item.type)) errors.push(`${label} 的 type "${item.type}" 目前不支援，請先產生基本表單後，到 Google Forms 後台手動微調。`);
    if (['multipleChoice', 'checkbox', 'dropdown'].includes(item.type) && (!Array.isArray(item.options) || item.options.length === 0)) errors.push(`${label} 是選項題，必須提供 options array。`);
    if (['multipleChoice', 'checkbox', 'dropdown'].includes(item.type) && Array.isArray(item.options) && item.options.length > 80) errors.push(`${label} 的 options 超過上限 80 個。`);
    if (['grid', 'checkboxGrid'].includes(item.type) && (!Array.isArray(item.rows) || !Array.isArray(item.columns) || item.rows.length === 0 || item.columns.length === 0)) errors.push(`${label} 是 grid 題，必須提供 rows / columns。`);
    if (['grid', 'checkboxGrid'].includes(item.type) && Array.isArray(item.rows) && item.rows.length > 50) errors.push(`${label} 的 rows 超過上限 50 列。`);
    if (['grid', 'checkboxGrid'].includes(item.type) && Array.isArray(item.columns) && item.columns.length > 20) errors.push(`${label} 的 columns 超過上限 20 欄。`);
  }
  return errors;
}

function safeCellTextLikeGas(value) {
  const text = String(value == null ? '' : value);
  return /^[=+\-@]/.test(text) ? `'${text}` : text;
}

function verifyInlineScripts(html) {
  const scripts = [...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/gi)].map((match) => match[1]);
  if (scripts.length < 2) fail('dist/Index.html should contain the QR library and UI scripts');
  scripts.forEach((script, index) => {
    try {
      new Function(script);
    } catch (error) {
      fail(`dist/Index.html script ${index + 1} has JavaScript syntax error: ${error.message}`);
    }
  });
}

function verifyQrEncoder() {
  const qrLibrary = fs.readFileSync(path.join(root, 'src/QrCodeLibrary.html'), 'utf8');
  const qrcodegen = new Function(`${qrLibrary}; return qrcodegen;`)();
  const qr = qrcodegen.QrCode.encodeText('https://docs.google.com/forms/d/e/test/viewform', qrcodegen.QrCode.Ecc.MEDIUM);
  if (qr.size < 21 || !qr.getModule(0, 0) || !qr.getModule(6, 6)) fail('QR encoder did not produce a valid module matrix');
}

function verifyFormDescriptions() {
  const source = fs.readFileSync(path.join(root, 'src/FormBuilder.gs'), 'utf8');
  const itemState = {};
  const item = {
    setTitle(value) { itemState.title = value; },
    setHelpText(value) { itemState.helpText = value; },
    setRequired(value) { itemState.required = value; }
  };
  const formState = {};
  const form = {
    setDescription(value) { formState.description = value; },
    getDescription() { return formState.description; },
    setConfirmationMessage() {},
    addTextItem() { return item; },
    getPublishedUrl() { return 'https://example.com/form'; },
    getEditUrl() { return 'https://example.com/edit'; }
  };
  const FormBuilder = new Function('FormApp', `${source}; return FormBuilder;`)({ create() { return form; } });
  const spec = {
    title: 'Description test',
    description: 'First line\nSecond line',
    items: [{ key: 'name', type: 'shortText', title: 'Name', description: 'Question line 1\nQuestion line 2' }]
  };
  const preview = FormBuilder.preview(spec);
  const result = FormBuilder.create(spec);
  if (result.description !== spec.description || formState.description !== spec.description) fail('form description was not written and read back');
  if (preview.description !== spec.description) fail('form description missing from preview');
  if (preview.items[0].helpText !== spec.items[0].description || itemState.helpText !== spec.items[0].description) fail('item description alias was not applied as help text');
}

function verifyAiServices() {
  const TEST_AI_KEY = 'test-api-key-1234567890';
  const aiPromptSource = fs.readFileSync(path.join(root, 'src/AiPrompt.gs'), 'utf8');
  const geminiSource = fs.readFileSync(path.join(root, 'src/GeminiService.gs'), 'utf8');
  const groqSource = fs.readFileSync(path.join(root, 'src/GroqService.gs'), 'utf8');
  const aiSource = fs.readFileSync(path.join(root, 'src/AiService.gs'), 'utf8');
  const schemaSource = fs.readFileSync(path.join(root, 'src/SchemaValidator.gs'), 'utf8');
  const SchemaValidator = new Function(`${schemaSource}; return SchemaValidator;`)();
  const properties = {};
  const propertyStore = {
    getProperty(key) { return properties[key] || null; },
    setProperty(key, value) { properties[key] = value; },
    setProperties(values) { Object.assign(properties, values); },
    deleteProperty(key) { delete properties[key]; }
  };
  const requests = [];
  let authFailure = false;
  const generatedSpec = {
    schemaVersion: '1.0',
    title: 'AI generated form',
    description: 'Generated description',
    items: [{ key: 'name', type: 'shortText', title: 'Name', required: true }]
  };
  const UrlFetchApp = {
    fetch(url, options) {
      requests.push({ url, options });
      if (authFailure) return mockHttpResponse(403, { error: { message: `Denied ${TEST_AI_KEY}` } });
      if (url.includes(':generateContent')) {
        const payload = JSON.parse(options.payload);
        if (!payload.generationConfig?.responseMimeType) {
          return mockHttpResponse(200, { candidates: [{ content: { parts: [{ text: '目前表單雛型\n1. 姓名\n2. Email' }] } }] });
        }
        return mockHttpResponse(200, { candidates: [{ content: { parts: [{ text: JSON.stringify(generatedSpec) }] } }] });
      }
      return mockHttpResponse(200, {
        models: [
          { name: 'models/gemini-test-flash', displayName: 'Gemini Test Flash', inputTokenLimit: 1000, outputTokenLimit: 500, supportedGenerationMethods: ['generateContent'] },
          { name: 'models/embedding-test', displayName: 'Embedding Test', supportedGenerationMethods: ['embedContent'] }
        ]
      });
    }
  };
  const PropertiesService = { getScriptProperties() { return propertyStore; } };
  const services = new Function('UrlFetchApp', 'PropertiesService', 'SchemaValidator', `${aiPromptSource}\n${geminiSource}\n${groqSource}\n${aiSource}; return { AiService, GeminiService };`)(UrlFetchApp, PropertiesService, SchemaValidator);
  if (services.AiService.getSettings('groq').provider !== 'groq') fail('AI provider registry must support Groq');
  const modelsResult = services.AiService.listModels('google-gemini', TEST_AI_KEY);
  if (modelsResult.models.length !== 1 || modelsResult.models[0].name !== 'models/gemini-test-flash') fail('AI model list must include only generateContent models');
  if (requests[0].url.includes(TEST_AI_KEY) || requests[0].options.headers['x-goog-api-key'] !== TEST_AI_KEY) fail('AI key must be sent only in the x-goog-api-key header');
  const keySaved = services.AiService.saveApiKey('google-gemini', TEST_AI_KEY);
  if (!keySaved.hasApiKey || JSON.stringify(keySaved).includes(TEST_AI_KEY)) fail('AI key response must confirm but never reveal the API key');
  if (keySaved.model) fail('Saving a Gemini key must clear the old model so the user chooses from the refreshed list');
  const saved = services.AiService.saveModel('google-gemini', 'models/gemini-test-flash');
  if (saved.model !== 'models/gemini-test-flash') fail('Gemini model must save separately from the API key');
  const discussion = services.AiService.discussForm('google-gemini', [{ role: 'user', content: '請和我討論報名表' }], 'models/gemini-test-flash');
  if (!discussion.reply.includes('目前表單雛型')) fail('Gemini discussion must return a plain-language outline');
  const discussionRequest = requests.find((request) => request.url.includes(':generateContent') && !JSON.parse(request.options.payload).generationConfig?.responseMimeType);
  if (!discussionRequest || JSON.parse(discussionRequest.options.payload).systemInstruction.parts[0].text.includes('Return JSON only')) fail('Gemini discussion must use the non-JSON discussion prompt');
  const generated = services.AiService.generateSpec('google-gemini', 'Create a registration form', 'models/gemini-test-flash');
  if (generated.ok === false || JSON.parse(generated.jsonText).title !== generatedSpec.title) fail('AI generation must return validated FormFlow JSON');
  const generationRequest = requests.find((request) => request.url.includes(':generateContent') && JSON.parse(request.options.payload).generationConfig?.responseMimeType);
  const generationPayload = generationRequest ? JSON.parse(generationRequest.options.payload) : {};
  if (generationPayload.generationConfig?.responseMimeType !== 'application/json') fail('AI generation must request JSON output');
  authFailure = true;
  try {
    services.AiService.listModels('google-gemini', TEST_AI_KEY);
    fail('AI auth failure fixture should throw');
  } catch (error) {
    const userMessage = services.AiService.toUserMessage(error);
    if (userMessage.includes(TEST_AI_KEY) || error.message.includes(TEST_AI_KEY)) fail('AI errors must redact the API key');
  }
  services.AiService.clearSettings('google-gemini');
  if (properties.FORMFLOW_AI_GOOGLE_API_KEY || properties.FORMFLOW_AI_GOOGLE_MODEL) fail('AI clear settings must remove key and model');
}


function verifyGroqServices() {
  const TEST_GROQ_KEY = 'test-groq-api-key-1234567890';
  const aiPromptSource = fs.readFileSync(path.join(root, 'src/AiPrompt.gs'), 'utf8');
  const groqSource = fs.readFileSync(path.join(root, 'src/GroqService.gs'), 'utf8');
  const aiSource = fs.readFileSync(path.join(root, 'src/AiService.gs'), 'utf8');
  const schemaSource = fs.readFileSync(path.join(root, 'src/SchemaValidator.gs'), 'utf8');
  const SchemaValidator = new Function(`${schemaSource}; return SchemaValidator;`)();
  const properties = {};
  const propertyStore = {
    getProperty(key) { return properties[key] || null; },
    setProperty(key, value) { properties[key] = value; },
    setProperties(values) { Object.assign(properties, values); },
    deleteProperty(key) { delete properties[key]; }
  };
  const requests = [];
  let authFailure = false;
  const generatedSpec = {
    schemaVersion: '1.0',
    title: 'Groq generated form',
    items: [{ key: 'email', type: 'shortText', title: 'Email', required: true }]
  };
  const UrlFetchApp = {
    fetch(url, options) {
      requests.push({ url, options });
      if (authFailure) return mockHttpResponse(401, { error: { message: `Denied ${TEST_GROQ_KEY}` } });
      if (url.endsWith('/chat/completions')) {
        const payload = JSON.parse(options.payload);
        if (!payload.response_format) {
          return mockHttpResponse(200, { choices: [{ message: { content: '目前表單雛型\n1. Email' } }] });
        }
        return mockHttpResponse(200, { choices: [{ message: { content: JSON.stringify(generatedSpec) } }] });
      }
      return mockHttpResponse(200, {
        data: [
          { id: 'llama-test-chat', active: true, owned_by: 'Meta', context_window: 8192, max_completion_tokens: 2048 },
          { id: 'canopylabs/orpheus-v1-english', active: true, owned_by: 'Canopy Labs', context_window: 4000 },
          { id: 'whisper-test-audio', active: true, owned_by: 'OpenAI', context_window: 448 },
          { id: 'safeguard-test-model', active: true, owned_by: 'OpenAI', context_window: 8192 }
        ]
      });
    }
  };
  const PropertiesService = { getScriptProperties() { return propertyStore; } };
  const services = new Function('UrlFetchApp', 'PropertiesService', 'SchemaValidator', `${aiPromptSource}\n${groqSource}\n${aiSource}; return { AiService, GroqService };`)(UrlFetchApp, PropertiesService, SchemaValidator);
  const modelsResult = services.AiService.listModels('groq', TEST_GROQ_KEY);
  if (modelsResult.models.length !== 1 || modelsResult.models[0].name !== 'llama-test-chat') fail('Groq model list must exclude non-text models');
  if (requests[0].url.includes(TEST_GROQ_KEY) || requests[0].options.headers.Authorization !== `Bearer ${TEST_GROQ_KEY}`) fail('Groq key must be sent only in the Authorization header');
  const keySaved = services.AiService.saveApiKey('groq', TEST_GROQ_KEY);
  if (!keySaved.hasApiKey || JSON.stringify(keySaved).includes(TEST_GROQ_KEY)) fail('Groq key response must never reveal the API key');
  if (keySaved.model) fail('Saving a Groq key must clear the old model so the user chooses from the refreshed list');
  const saved = services.AiService.saveModel('groq', 'llama-test-chat');
  if (saved.model !== 'llama-test-chat') fail('Groq model must save separately from the API key');
  const discussion = services.AiService.discussForm('groq', [{ role: 'user', content: '請和我討論回饋表' }], 'llama-test-chat');
  if (!discussion.reply.includes('目前表單雛型')) fail('Groq discussion must return a plain-language outline');
  const generated = services.AiService.generateSpec('groq', 'Create a feedback form', 'llama-test-chat');
  if (generated.ok === false || JSON.parse(generated.jsonText).title !== generatedSpec.title) fail('Groq generation must return validated FormFlow JSON');
  const generationRequest = requests.find((request) => request.url.endsWith('/chat/completions') && JSON.parse(request.options.payload).response_format);
  const payload = generationRequest ? JSON.parse(generationRequest.options.payload) : {};
  if (payload.response_format?.type !== 'json_object') fail('Groq generation must request JSON Object Mode');
  const discussionRequest = requests.find((request) => request.url.endsWith('/chat/completions') && !JSON.parse(request.options.payload).response_format);
  if (!discussionRequest || JSON.parse(discussionRequest.options.payload).messages[0].content.includes('Return JSON only')) fail('Groq discussion must use the non-JSON discussion prompt');
  authFailure = true;
  try {
    services.AiService.listModels('groq', TEST_GROQ_KEY);
    fail('Groq auth failure fixture should throw');
  } catch (error) {
    const userMessage = services.AiService.toUserMessage(error);
    if (userMessage.includes(TEST_GROQ_KEY) || error.message.includes(TEST_GROQ_KEY)) fail('Groq errors must redact the API key');
  }
  services.AiService.clearSettings('groq');
  if (properties.FORMFLOW_AI_GROQ_API_KEY || properties.FORMFLOW_AI_GROQ_MODEL) fail('Groq clear settings must remove key and model');
}

function mockHttpResponse(status, body) {
  return {
    getResponseCode() { return status; },
    getContentText() { return JSON.stringify(body); }
  };
}

function validateManifest(label, manifestToCheck, expected) {
  if (manifestToCheck.webapp?.access !== expected.access) fail(`${label} webapp.access must be ${expected.access}`);
  if (manifestToCheck.webapp?.executeAs !== expected.executeAs) fail(`${label} webapp.executeAs must be ${expected.executeAs}`);
  if ((manifestToCheck.oauthScopes || []).includes('https://www.googleapis.com/auth/drive')) fail(`${label} should avoid broad Drive scope`);
  const hasExternalRequest = (manifestToCheck.oauthScopes || []).includes('https://www.googleapis.com/auth/script.external_request');
  if (hasExternalRequest !== expected.externalRequest) fail(`${label} external request scope must be ${expected.externalRequest}`);
}

if (failed) process.exit(1);
console.log('Project validation passed');
