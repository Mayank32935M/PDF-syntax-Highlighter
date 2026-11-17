const fs = require('fs');
const path = require('path');
const PDFLib = require('pdf-lib');

global.window = global;
global.self = global;
global.PDFLib = PDFLib;

eval(fs.readFileSync('vendor/pdfjs/pdf.worker.min.js', 'utf8'));
eval(fs.readFileSync('vendor/pdfjs/pdf.min.js', 'utf8'));
eval(fs.readFileSync('vendor/highlight/highlight.min.js', 'utf8'));
eval(fs.readFileSync('vendor/docx/docx.umd.min.js', 'utf8'));
eval(fs.readFileSync('js/pdf-parser.js', 'utf8'));
eval(fs.readFileSync('js/section-detector.js', 'utf8'));
eval(fs.readFileSync('js/syntax-highlighter.js', 'utf8'));
eval(fs.readFileSync('js/docx-generator.js', 'utf8'));
eval(fs.readFileSync('js/pdf-highlighter.js', 'utf8'));

async function buildAll() {
  console.log('--- Processing e01-q1-roots-of-a-quadratic-equation.pdf ---');
  const refBuf = fs.readFileSync('e01-q1-roots-of-a-quadratic-equation.pdf');
  const refParsed = await PDFParser.parse(refBuf.slice());
  const refExps = SectionDetector.detectExperiments(refParsed.pages);

  // PDF
  const refPdfBlob = await PDFHighlighter.generateHighlightedPdf(refBuf.slice(), refParsed.pages, refExps, 'light');
  const refPdfBuf = Buffer.from(await refPdfBlob.arrayBuffer());
  fs.writeFileSync('e01-q1-roots-of-a-quadratic-equation_highlighted.pdf', refPdfBuf);
  console.log('✓ e01-q1-roots-of-a-quadratic-equation_highlighted.pdf saved:', refPdfBuf.length, 'bytes');

  // DOCX
  const refDocxBlob = await DocxGenerator.generate(refExps, 'light');
  const refDocxBuf = Buffer.from(await refDocxBlob.arrayBuffer());
  fs.writeFileSync('e01-q1-roots-of-a-quadratic-equation_highlighted.docx', refDocxBuf);
  console.log('✓ e01-q1-roots-of-a-quadratic-equation_highlighted.docx saved:', refDocxBuf.length, 'bytes');

  console.log('\n--- Processing PYTHONFILE.pdf ---');
  const fullBuf = fs.readFileSync('PYTHONFILE.pdf');
  const fullParsed = await PDFParser.parse(fullBuf.slice());
  const fullExps = SectionDetector.detectExperiments(fullParsed.pages);

  // PDF
  const fullPdfBlob = await PDFHighlighter.generateHighlightedPdf(fullBuf.slice(), fullParsed.pages, fullExps, 'light');
  const fullPdfBuf = Buffer.from(await fullPdfBlob.arrayBuffer());
  fs.writeFileSync('PYTHONFILE_highlighted.pdf', fullPdfBuf);
  console.log('✓ PYTHONFILE_highlighted.pdf saved:', fullPdfBuf.length, 'bytes');

  // DOCX
  const fullDocxBlob = await DocxGenerator.generate(fullExps, 'light');
  const fullDocxBuf = Buffer.from(await fullDocxBlob.arrayBuffer());
  fs.writeFileSync('PYTHONFILE_highlighted.docx', fullDocxBuf);
  console.log('✓ PYTHONFILE_highlighted.docx saved:', fullDocxBuf.length, 'bytes');
}

buildAll().catch(err => console.error('Build error:', err));
