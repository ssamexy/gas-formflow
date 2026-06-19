const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const required = [
  'README.md',
  'product-requirements.md',
  'src/Code.gs',
  'src/FormBuilder.gs',
  'src/SheetBuilder.gs',
  'src/SummaryBuilder.gs',
  'src/SchemaValidator.gs',
  'src/QrCodeBuilder.gs',
  'src/Index.html',
  'dist/Code.gs',
  'dist/Index.html',
  'dist/appsscript.json',
  'config/appsscript.private.json',
  'config/appsscript.agent.json',
  'docs/deployment-modes.md',
  'docs/schema-v1.md',
  'docs/chatgpt-prompt.md',
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
for (const fn of ['doGet', 'setup', 'apiValidateSpec', 'apiPreviewSpec', 'apiCreateFormFlow']) {
  if (!distCode.includes(`function ${fn}`)) fail(`dist/Code.gs missing ${fn}`);
}
for (const fn of publicFunctionBlocklist) {
  if (new RegExp(`function\\s+${fn}\\s*\\(`).test(distCode)) {
    fail(`dist/Code.gs exposes unsafe public helper ${fn}; use a private trailing-underscore function`);
  }
}
for (const fn of ['apiCreateSmokeTest_', 'apiVerifySmokeResources_', 'setupAgentSmokeToken_', 'createFormFlow_', 'isAgentMode_']) {
  if (!distCode.includes(`function ${fn}`)) fail(`dist/Code.gs missing private helper ${fn}`);
}
if (!distCode.includes('function setupAgentSmokeToken(token)')) fail('dist/Code.gs missing clasp-run token setup wrapper');
if (!distCode.includes('Token setup is disabled while running in public agent validation mode')) fail('setupAgentSmokeToken must be disabled in agent mode');
if (!distCode.includes('公開 AI agent 驗證模式不允許未帶 token 的建立操作')) fail('apiCreateFormFlow must block destructive writes in agent mode');
if (!distCode.includes('safeCellText')) fail('dist/Code.gs missing spreadsheet formula-injection guard');
if (distCode.includes('DriveApp.')) fail('dist/Code.gs should not require broad DriveApp access');
const distHtml = fs.existsSync(path.join(root, 'dist/Index.html')) ? fs.readFileSync(path.join(root, 'dist/Index.html'), 'utf8') : '';
for (const helper of ['escapeHtml', 'escapeAttr', 'window.__e2e']) {
  if (!distHtml.includes(helper)) fail(`dist/Index.html missing ${helper}`);
}

const manifest = JSON.parse(fs.readFileSync(path.join(root, 'dist/appsscript.json'), 'utf8'));
const privateManifest = JSON.parse(fs.readFileSync(path.join(root, 'config/appsscript.private.json'), 'utf8'));
const agentManifest = JSON.parse(fs.readFileSync(path.join(root, 'config/appsscript.agent.json'), 'utf8'));
validateManifest('config/appsscript.private.json', privateManifest, { access: 'MYSELF', executeAs: 'USER_DEPLOYING' });
validateManifest('config/appsscript.agent.json', agentManifest, { access: 'ANYONE', executeAs: 'USER_DEPLOYING' });
if (manifest.webapp?.access === 'MYSELF') validateManifest('dist/appsscript.json', manifest, { access: 'MYSELF', executeAs: 'USER_DEPLOYING' });
else if (manifest.webapp?.access === 'ANYONE') validateManifest('dist/appsscript.json', manifest, { access: 'ANYONE', executeAs: 'USER_DEPLOYING' });
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

function validateManifest(label, manifestToCheck, expected) {
  if (manifestToCheck.webapp?.access !== expected.access) fail(`${label} webapp.access must be ${expected.access}`);
  if (manifestToCheck.webapp?.executeAs !== expected.executeAs) fail(`${label} webapp.executeAs must be ${expected.executeAs}`);
  if ((manifestToCheck.oauthScopes || []).includes('https://www.googleapis.com/auth/drive')) fail(`${label} should avoid broad Drive scope`);
}

if (failed) process.exit(1);
console.log('Project validation passed');
