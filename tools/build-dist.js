const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
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
  ''
].join('\n');

const code = banner + codeFiles.map((file) => {
  const abs = path.join(root, file);
  return `\n// ===== ${file} =====\n` + fs.readFileSync(abs, 'utf8').trim() + '\n';
}).join('\n');

fs.mkdirSync(path.join(root, 'dist'), { recursive: true });
fs.writeFileSync(path.join(root, 'dist/Code.gs'), code, 'utf8');
fs.copyFileSync(path.join(root, 'src/Index.html'), path.join(root, 'dist/Index.html'));
fs.copyFileSync(path.join(root, 'appsscript.json'), path.join(root, 'dist/appsscript.json'));
console.log('Built dist/Code.gs, dist/Index.html, and dist/appsscript.json');
