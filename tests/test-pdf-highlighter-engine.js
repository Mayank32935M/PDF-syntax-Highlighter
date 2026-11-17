const fs = require('fs');
const path = require('path');
const PDFLib = require('pdf-lib');

global.window = global;
global.self = global;
global.PDFLib = PDFLib;

eval(fs.readFileSync('vendor/pdfjs/pdf.worker.min.js', 'utf8'));
eval(fs.readFileSync('vendor/pdfjs/pdf.min.js', 'utf8'));
eval(fs.readFileSync('vendor/highlight/highlight.min.js', 'utf8'));
eval(fs.readFileSync('js/pdf-parser.js', 'utf8'));
eval(fs.readFileSync('js/section-detector.js', 'utf8'));
eval(fs.readFileSync('js/syntax-highlighter.js', 'utf8'));
eval(fs.readFileSync('js/pdf-highlighter.js', 'utf8'));

async function testPdfHighlighterEngine() {
  console.log('Testing PDFHighlighter engine on e01-q1-roots-of-a-quadratic-equation.pdf...');
  const refBuf = fs.readFileSync('e01-q1-roots-of-a-quadratic-equation.pdf');
  const parsed = await PDFParser.parse(refBuf);
  const exps = SectionDetector.detectExperiments(parsed.pages);

  const blob = await PDFHighlighter.generateHighlightedPdf(refBuf, parsed.pages, exps, 'light');
  let buf;
  if (blob instanceof Buffer) {
    buf = blob;
  } else if (typeof blob.arrayBuffer === 'function') {
    buf = Buffer.from(await blob.arrayBuffer());
  } else {
    buf = Buffer.from(blob);
  }

  const outPath = 'e01-q1-roots-of-a-quadratic-equation_highlighted.pdf';
  fs.writeFileSync(outPath, buf);
  console.log(`✓ Generated ${outPath} (${buf.length} bytes)`);

  console.log('\nTesting PDFHighlighter engine on full 20-page PYTHONFILE.pdf...');
  const fullBuf = fs.readFileSync('PYTHONFILE.pdf');
  const parsedFull = await PDFParser.parse(fullBuf);
  const expsFull = SectionDetector.detectExperiments(parsedFull.pages);

  const blobFull = await PDFHighlighter.generateHighlightedPdf(fullBuf, parsedFull.pages, expsFull, 'light');
  let bufFull;
  if (blobFull instanceof Buffer) {
    bufFull = blobFull;
  } else if (typeof blobFull.arrayBuffer === 'function') {
    bufFull = Buffer.from(await blobFull.arrayBuffer());
  } else {
    bufFull = Buffer.from(blobFull);
  }

  const outPathFull = 'PYTHONFILE_highlighted.pdf';
  fs.writeFileSync(outPathFull, bufFull);
  console.log(`✓ Generated ${outPathFull} (${bufFull.length} bytes)`);
}

testPdfHighlighterEngine().catch(err => console.error('Failed:', err));
