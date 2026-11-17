const fs = require('fs');
const path = require('path');

// Set up minimal browser-like globals
global.window = global;
global.self = global;

// Load the worker bundle first
const workerCode = fs.readFileSync(path.join(__dirname, 'vendor/pdfjs/pdf.worker.min.js'), 'utf8');
eval(workerCode);
console.log('Worker loaded! global.pdfjsWorker:', typeof global.pdfjsWorker);
console.log('WorkerMessageHandler:', typeof (global.pdfjsWorker && global.pdfjsWorker.WorkerMessageHandler));

// Load the main pdfjs bundle
const pdfCode = fs.readFileSync(path.join(__dirname, 'vendor/pdfjs/pdf.min.js'), 'utf8');
eval(pdfCode);

const pdfjs = window['pdfjs-dist/build/pdf'];
console.log('pdfjs loaded version:', pdfjs.version);

// Load the PDF file
const pdfBuffer = fs.readFileSync(path.join(__dirname, 'e01-q1-roots-of-a-quadratic-equation.pdf'));
const uint8 = new Uint8Array(pdfBuffer);

async function testExtract() {
  const loadingTask = pdfjs.getDocument({
    data: uint8,
    isEvalSupported: false,
    useSystemFonts: true,
  });

  const pdfDoc = await loadingTask.promise;
  console.log('PDF loaded! numPages:', pdfDoc.numPages);

  const page = await pdfDoc.getPage(1);
  const textContent = await page.getTextContent();
  console.log('Total text items:', textContent.items.length);

  const strings = textContent.items.map(it => it.str).filter(s => s && s.trim());
  console.log('Sample extracted strings (first 25):');
  console.log(strings.slice(0, 25));
}

testExtract().then(() => console.log('EXTRACTION TEST PASSED PERFECTLY!'))
  .catch(err => console.error('Extraction test error:', err));
