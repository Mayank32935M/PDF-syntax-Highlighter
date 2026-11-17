const fs = require('fs');
global.window = global;
global.self = global;
eval(fs.readFileSync('vendor/pdfjs/pdf.worker.min.js', 'utf8'));
eval(fs.readFileSync('vendor/pdfjs/pdf.min.js', 'utf8'));
eval(fs.readFileSync('js/pdf-parser.js', 'utf8'));
eval(fs.readFileSync('js/section-detector.js', 'utf8'));

async function checkCodeLinesPageNums() {
  const buf = fs.readFileSync('PYTHONFILE.pdf');
  const parsed = await PDFParser.parse(buf);
  const exps = SectionDetector.detectExperiments(parsed.pages);

  for (const exp of exps) {
    const codeSec = exp.sections.find(s => s.type === 'CODE');
    if (!codeSec) continue;
    const pageNums = [...new Set(codeSec.codeLines.map(l => l.pageNum))];
    console.log(`Exp ${exp.experimentNum} (${exp.title}): code lines count=${codeSec.codeLines.length}, on pages:`, pageNums);
  }
}

checkCodeLinesPageNums();
