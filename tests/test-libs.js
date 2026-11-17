const fs = require('fs');

console.log('--- Testing Highlight.js ---');
const hljsCode = fs.readFileSync('vendor/highlight/highlight.min.js', 'utf8');
const fakeWindow = {};
fakeWindow.window = fakeWindow;
fakeWindow.globalThis = fakeWindow;
const runHljs = new Function('window', 'globalThis', hljsCode + '\nreturn typeof hljs !== "undefined" ? hljs : window.hljs;');
const hljsObj = runHljs(fakeWindow, fakeWindow);
console.log('hljs object:', typeof hljsObj);
if (hljsObj) {
  console.log('hljs.highlight:', typeof hljsObj.highlight);
  console.log('has python:', hljsObj.getLanguage('python') !== undefined);
  const res = hljsObj.highlight('a = float(input("Enter a: "))', { language: 'python' });
  console.log('sample highlighted output:', res.value);
}

console.log('\n--- Testing docx.js ---');
const docxCode = fs.readFileSync('vendor/docx/docx.umd.min.js', 'utf8');
const fakeWindowDocx = {};
const runDocx = new Function('window', 'globalThis', docxCode + '\nreturn typeof docx !== "undefined" ? docx : window.docx;');
const docxObj = runDocx(fakeWindowDocx, fakeWindowDocx);
console.log('docx object:', typeof docxObj);
console.log('docx.Document:', typeof (docxObj && docxObj.Document));
console.log('docx.Table:', typeof (docxObj && docxObj.Table));

console.log('\n--- Testing pdf.js ---');
const pdfCode = fs.readFileSync('vendor/pdfjs/pdf.min.js', 'utf8');
const fakeWindowPdf = {};
const runPdf = new Function('window', 'globalThis', 'self', pdfCode + '\nreturn window["pdfjs-dist/build/pdf"] || globalThis["pdfjs-dist/build/pdf"];');
const pdfObj = runPdf(fakeWindowPdf, fakeWindowPdf, fakeWindowPdf);
console.log('pdfjs object:', typeof pdfObj);
console.log('pdfjs.getDocument:', typeof (pdfObj && pdfObj.getDocument));
console.log('pdfjs.GlobalWorkerOptions:', typeof (pdfObj && pdfObj.GlobalWorkerOptions));
