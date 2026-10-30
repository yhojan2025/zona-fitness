const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const chromePath = fs.existsSync('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe')
  ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  : 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

const htmlPath = path.resolve(__dirname, '..', 'docs', 'proyecto-zona-fitness-caso-estudio.html');
const pdfPath = path.resolve(__dirname, '..', 'docs', 'Proyecto-Zona-Fitness-Caso-Estudio.pdf');

console.log('Using browser:', chromePath);
console.log('HTML path:', htmlPath);
console.log('PDF path:', pdfPath);

const args = [
  '--headless',
  '--disable-gpu',
  '--no-sandbox',
  '--no-pdf-header-footer',
  `--print-to-pdf=${pdfPath}`,
  `file://${htmlPath}`
];

const child = spawn(chromePath, args);

child.stdout.on('data', (d) => console.log('stdout:', d.toString()));
child.stderr.on('data', (d) => console.error('stderr:', d.toString()));

child.on('close', (code) => {
  console.log('Process exited with code:', code);
  if (fs.existsSync(pdfPath)) {
    console.log('SUCCESS! PDF generated. Size:', fs.statSync(pdfPath).size, 'bytes');
  } else {
    console.log('File not found at:', pdfPath);
  }
});
