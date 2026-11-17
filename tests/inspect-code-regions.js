const fs = require('fs');
global.window = global;
global.self = global;
eval(fs.readFileSync('vendor/pdfjs/pdf.worker.min.js', 'utf8'));
eval(fs.readFileSync('vendor/pdfjs/pdf.min.js', 'utf8'));
eval(fs.readFileSync('js/pdf-parser.js', 'utf8'));
eval(fs.readFileSync('js/section-detector.js', 'utf8'));

async function inspectPages() {
  const buf = fs.readFileSync('PYTHONFILE.pdf');
  const parsed = await PDFParser.parse(buf);
  console.log('Total pages:', parsed.pages.length);

  for (let p = 1; p <= parsed.pages.length; p++) {
    const page = parsed.pages[p - 1];
    // Find section headers on this page
    const secHeaders = [];
    for (const it of page.items) {
      if (/^0\d$/.test(it.str) && it.x < 85 && it.y > 75 && it.y < 790) {
        const titleItem = page.items.find(other =>
          other !== it && Math.abs(other.y - it.y) < 3.5 && other.x > 85 && other.x < 150
        );
        if (titleItem) {
          secHeaders.push({ num: it.str, title: titleItem.str, y: it.y });
        }
      }
    }

    const isContinuation = page.items.some(it => it.y < 60 && it.str.includes('·'));
    console.log(`Page ${String(p).padStart(2)}: isContinuation=${isContinuation} | Section headers: ${secHeaders.map(s => s.num + ' ' + s.title + ' (y=' + s.y + ')').join(', ') || 'None'}`);
  }
}

inspectPages();
