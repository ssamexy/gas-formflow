const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const required = [
  'README.md',
  '需求書.md',
  'src/Code.gs',
  'src/FormBuilder.gs',
  'src/SheetBuilder.gs',
  'src/SummaryBuilder.gs',
  'src/SchemaValidator.gs',
  'src/QrCodeBuilder.gs',
  'src/Index.html',
  'dist/Code.gs',
  'dist/Index.html',
  'docs/schema-v1.md',
  'docs/chatgpt-prompt.md',
  'docs/install.zh-TW.md',
  'docs/install.en.md',
  'examples/event-registration.json',
  'examples/attendance-survey.json',
  'examples/willingness-survey.json',
  'examples/feedback-survey.json'
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
    if (['multipleChoice', 'checkbox', 'dropdown'].includes(item.type) && (!Array.isArray(item.options) || item.options.length === 0)) {
      fail(`${name} ${item.key} needs options`);
    }
    if (['grid', 'checkboxGrid'].includes(item.type) && (!Array.isArray(item.rows) || !Array.isArray(item.columns) || item.rows.length === 0 || item.columns.length === 0)) {
      fail(`${name} ${item.key} needs rows and columns`);
    }
  }
}

const distCode = fs.existsSync(path.join(root, 'dist/Code.gs')) ? fs.readFileSync(path.join(root, 'dist/Code.gs'), 'utf8') : '';
for (const fn of ['doGet', 'setup', 'apiValidateSpec', 'apiPreviewSpec', 'apiCreateFormFlow']) {
  if (!distCode.includes(`function ${fn}`)) fail(`dist/Code.gs missing ${fn}`);
}

if (failed) process.exit(1);
console.log('Project validation passed');
