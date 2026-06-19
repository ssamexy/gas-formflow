const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const modeArg = process.argv.find((arg) => arg.startsWith('--mode='));
const mode = (modeArg ? modeArg.split('=')[1] : process.env.FORMFLOW_DEPLOY_MODE || 'private').toLowerCase();
const manifestByMode = {
  private: 'config/appsscript.private.json',
  agent: 'config/appsscript.agent.json'
};

if (!manifestByMode[mode]) {
  console.error(`Unknown deployment mode: ${mode}. Use private or agent.`);
  process.exit(2);
}

const codeFiles = [
  'src/Code.gs',
  'src/SchemaValidator.gs',
  'src/FormBuilder.gs',
  'src/SheetBuilder.gs',
  'src/SummaryBuilder.gs',
  'src/QrCodeBuilder.gs'
];

const banner = [
  '/**',
  ' * GAS FormFlow dist/Code.gs',
  ' * Generated from src/*.gs. Edit src files, then run npm run build.',
  ' */',
  `var FORMFLOW_DEPLOY_MODE = '${mode}';`,
  ''
].join('\n');

const code = banner + codeFiles.map((file) => {
  const abs = path.join(root, file);
  return `\n// ===== ${file} =====\n` + fs.readFileSync(abs, 'utf8').trim() + '\n';
}).join('\n');

fs.mkdirSync(path.join(root, 'dist'), { recursive: true });
fs.writeFileSync(path.join(root, 'dist/Code.gs'), code, 'utf8');
fs.copyFileSync(path.join(root, 'src/Index.html'), path.join(root, 'dist/Index.html'));
fs.copyFileSync(path.join(root, manifestByMode[mode]), path.join(root, 'dist/appsscript.json'));
if (mode === 'private') {
  fs.copyFileSync(path.join(root, manifestByMode[mode]), path.join(root, 'appsscript.json'));
}
console.log(`Built dist/Code.gs, dist/Index.html, and dist/appsscript.json (${mode} mode)`);
