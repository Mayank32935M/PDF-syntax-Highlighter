const fs = require('fs');
const path = require('path');

global.window = global;
global.self = global;
eval(fs.readFileSync('vendor/pdfjs/pdf.worker.min.js', 'utf8'));
eval(fs.readFileSync('vendor/pdfjs/pdf.min.js', 'utf8'));
eval(fs.readFileSync('vendor/highlight/highlight.min.js', 'utf8'));
eval(fs.readFileSync('vendor/docx/docx.umd.min.js', 'utf8'));
eval(fs.readFileSync('js/syntax-highlighter.js', 'utf8'));

// Import the parser engine we tested earlier
eval(fs.readFileSync('test-parser-engine.js', 'utf8').replace(/run\(\)\.catch[\s\S]*$/, ''));

async function testDocx() {
  console.log('Parsing reference PDF...');
  const refPdf = fs.readFileSync('e01-q1-roots-of-a-quadratic-equation.pdf');
  const exps = await parsePdfDocument(refPdf);
  console.log('Experiments parsed:', exps.length);

  const doc = exps[0];
  console.log('Building DOCX for:', doc.title);

  // Use the docx generator
  eval(fs.readFileSync('js/docx-generator.js', 'utf8'));

  const blobOrBuf = await DocxGenerator.generate(doc, 'light', 1);
  // In Node.js, Packer.toBlob returns a Blob (or buffer)
  let buffer;
  if (blobOrBuf instanceof Buffer) {
    buffer = blobOrBuf;
  } else if (typeof blobOrBuf.arrayBuffer === 'function') {
    const ab = await blobOrBuf.arrayBuffer();
    buffer = Buffer.from(ab);
  } else {
    buffer = Buffer.from(blobOrBuf);
  }

  const outPath = path.join(__dirname, 'e01-q1-roots-of-a-quadratic-equation_highlighted.docx');
  fs.writeFileSync(outPath, buffer);
  console.log(`Generated DOCX successfully: ${outPath} (${buffer.length} bytes)`);

  // Verify the docx contents
  const zipfile = require('zlib');
  const AdmZip = undefined; // check with python
}

testDocx().catch(err => console.error('DOCX test failed:', err));
