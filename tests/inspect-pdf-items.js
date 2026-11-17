const fs = require('fs');
const path = require('path');

global.window = global;
global.self = global;
eval(fs.readFileSync(path.join(__dirname, 'vendor/pdfjs/pdf.worker.min.js'), 'utf8'));
eval(fs.readFileSync(path.join(__dirname, 'vendor/pdfjs/pdf.min.js'), 'utf8'));

const pdfjs = window['pdfjs-dist/build/pdf'];
const pdfBuffer = fs.readFileSync(path.join(__dirname, 'e01-q1-roots-of-a-quadratic-equation.pdf'));

async function inspect() {
  const loadingTask = pdfjs.getDocument({ data: new Uint8Array(pdfBuffer) });
  const pdfDoc = await loadingTask.promise;
  const page = await pdfDoc.getPage(1);
  const viewport = page.getViewport({ scale: 1.0 });
  console.log('Page viewport:', viewport.width, 'x', viewport.height);

  const textContent = await page.getTextContent();
  const items = textContent.items.map(it => {
    // it.transform = [scaleX, skewY, skewX, scaleY, tx, ty]
    const x = it.transform[4];
    const y = viewport.height - it.transform[5]; // top-down y
    return {
      str: it.str,
      x: Math.round(x * 10) / 10,
      y: Math.round(y * 10) / 10,
      width: Math.round(it.width * 10) / 10,
      height: Math.round(it.height * 10) / 10,
      fontSize: Math.round(Math.abs(it.transform[3]) * 10) / 10,
    };
  });

  // Sort by Y (top to bottom), then by X
  items.sort((a, b) => {
    if (Math.abs(a.y - b.y) > 3) return a.y - b.y;
    return a.x - b.x;
  });

  console.log('All sorted text items:');
  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    console.log(`${String(i).padStart(3)} | y=${it.y.toFixed(1).padStart(5)} x=${it.x.toFixed(1).padStart(5)} fs=${it.fontSize.toFixed(1).padStart(4)} | "${it.str}"`);
  }
}

inspect();
