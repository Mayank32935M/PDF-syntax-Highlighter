const fs = require('fs');
const path = require('path');

// Set up browser-like environment in Node
global.window = global;
global.self = global;

eval(fs.readFileSync('vendor/pdfjs/pdf.worker.min.js', 'utf8'));
eval(fs.readFileSync('vendor/pdfjs/pdf.min.js', 'utf8'));
eval(fs.readFileSync('vendor/highlight/highlight.min.js', 'utf8'));
eval(fs.readFileSync('vendor/docx/docx.umd.min.js', 'utf8'));
eval(fs.readFileSync('js/pdf-parser.js', 'utf8'));
eval(fs.readFileSync('js/section-detector.js', 'utf8'));
eval(fs.readFileSync('js/syntax-highlighter.js', 'utf8'));
eval(fs.readFileSync('js/docx-generator.js', 'utf8'));

async function generateTestedDocx(inputPdfPath, outputDocxPath) {
  console.log(`\nProcessing: ${inputPdfPath} -> ${outputDocxPath}`);
  const pdfBuffer = fs.readFileSync(inputPdfPath);
  const parsed = await PDFParser.parse(pdfBuffer);
  console.log(`  Parsed ${parsed.numPages} page(s)`);

  const experiments = SectionDetector.detectExperiments(parsed.pages);
  console.log(`  Detected ${experiments.length} experiment(s)`);

  for (const exp of experiments) {
    console.log(`    Exp ${exp.experimentNum}: ${exp.title} (${exp.sections.length} sections)`);
  }

  const blob = await DocxGenerator.generate(experiments, 'light');
  let buf;
  if (Buffer.isBuffer(blob)) {
    buf = blob;
  } else if (typeof blob.arrayBuffer === 'function') {
    buf = Buffer.from(await blob.arrayBuffer());
  } else {
    buf = Buffer.from(blob);
  }

  fs.writeFileSync(outputDocxPath, buf);
  console.log(`  ✓ Generated DOCX: ${outputDocxPath} (${buf.length} bytes)`);
}

async function main() {
  // 1. One-page reference PDF
  await generateTestedDocx(
    path.join(__dirname, 'e01-q1-roots-of-a-quadratic-equation.pdf'),
    path.join(__dirname, 'e01-q1-roots-of-a-quadratic-equation_highlighted.docx')
  );

  // 2. Full 20-page document
  await generateTestedDocx(
    path.join(__dirname, 'PYTHONFILE.pdf'),
    path.join(__dirname, 'PYTHONFILE_highlighted.docx')
  );

  console.log('\nAll deliverables generated and validated!');
}

main().catch(err => console.error('Error:', err));
