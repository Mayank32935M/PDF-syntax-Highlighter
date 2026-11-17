const fs = require('fs');
const path = require('path');

global.window = global;
global.self = global;
eval(fs.readFileSync(path.join(__dirname, 'vendor/pdfjs/pdf.worker.min.js'), 'utf8'));
eval(fs.readFileSync(path.join(__dirname, 'vendor/pdfjs/pdf.min.js'), 'utf8'));

const pdfjs = window['pdfjs-dist/build/pdf'];
const pdfBuffer = fs.readFileSync(path.join(__dirname, 'PYTHONFILE.pdf'));

async function inspectPages() {
  const loadingTask = pdfjs.getDocument({ data: new Uint8Array(pdfBuffer) });
  const pdfDoc = await loadingTask.promise;
  console.log('Total pages:', pdfDoc.numPages);

  for (let p = 1; p <= 3; p++) {
    console.log(`\n================ PAGE ${p} ================`);
    const page = await pdfDoc.getPage(p);
    const viewport = page.getViewport({ scale: 1.0 });
    const textContent = await page.getTextContent();
    const items = textContent.items
      .map(it => ({
        str: it.str,
        x: Math.round(it.transform[4] * 10) / 10,
        y: Math.round((viewport.height - it.transform[5]) * 10) / 10,
        fs: Math.round(Math.abs(it.transform[3]) * 10) / 10,
      }))
      .filter(it => it.str && it.str.trim());

    items.sort((a, b) => {
      if (Math.abs(a.y - b.y) > 3) return a.y - b.y;
      return a.x - b.x;
    });

    for (const it of items) {
      console.log(`y=${it.y.toFixed(1).padStart(5)} x=${it.x.toFixed(1).padStart(5)} fs=${it.fs.toFixed(1).padStart(4)} | "${it.str}"`);
    }
  }
}

inspectPages();
