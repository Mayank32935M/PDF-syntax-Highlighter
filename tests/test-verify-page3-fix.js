const fs = require('fs');

// Let's run a test in Node with PDFLib
const PDFLib = require('pdf-lib');
global.window = global;
global.self = global;
global.PDFLib = PDFLib;

eval(fs.readFileSync('vendor/pdfjs/pdf.worker.min.js', 'utf8'));
eval(fs.readFileSync('vendor/pdfjs/pdf.min.js', 'utf8'));
eval(fs.readFileSync('vendor/highlight/highlight.min.js', 'utf8'));
eval(fs.readFileSync('js/pdf-parser.js', 'utf8'));
eval(fs.readFileSync('js/syntax-highlighter.js', 'utf8'));

// Load the updated detection logic
eval(fs.readFileSync('tests/test-fix-page3.js', 'utf8').replace('test();', ''));

function hexToRgb(PDFLib, hex) {
  if (!hex || typeof hex !== 'string') return PDFLib.rgb(0, 0, 0);
  const clean = hex.replace('#', '').trim();
  if (clean.length !== 6) return PDFLib.rgb(0, 0, 0);
  const r = parseInt(clean.substring(0, 2), 16) / 255;
  const g = parseInt(clean.substring(2, 4), 16) / 255;
  const b = parseInt(clean.substring(4, 6), 16) / 255;
  if (isNaN(r) || isNaN(g) || isNaN(b)) return PDFLib.rgb(0, 0, 0);
  return PDFLib.rgb(r, g, b);
}

async function runTest() {
  const buf = fs.readFileSync('PYTHONFILE.pdf');
  const parsed = await PDFParser.parse(buf);
  const exps = detectExperimentsWithPageNums(parsed.pages);

  const pdfDoc = await PDFLib.PDFDocument.load(buf);
  const fontCourier = await pdfDoc.embedStandardFont(PDFLib.StandardFonts.Courier);
  const fontCourierBold = await pdfDoc.embedStandardFont(PDFLib.StandardFonts.CourierBold);
  const fontCourierOblique = await pdfDoc.embedStandardFont(PDFLib.StandardFonts.CourierOblique);
  const pages = pdfDoc.getPages();

  const rowBg = PDFLib.rgb(0.9608, 0.9608, 0.9608);

  for (let pageIdx = 0; pageIdx < parsed.pages.length; pageIdx++) {
    const pageInfo = parsed.pages[pageIdx];
    const pdfPage = pages[pageIdx];
    const pageHeight = pdfPage.getHeight();

    // Find all code lines that strictly belong to this page
    const codeLinesOnThisPage = [];
    for (const exp of exps) {
      const codeSec = exp.sections.find(s => s.type === 'CODE');
      if (codeSec && codeSec.codeLines) {
        for (const l of codeSec.codeLines) {
          if (l.pageNum === pageInfo.pageNum) {
            codeLinesOnThisPage.push(l);
          }
        }
      }
    }

    if (codeLinesOnThisPage.length === 0) {
      continue; // Pure output or non-code page!
    }

    for (const lineObj of codeLinesOnThisPage) {
      const baselinePdfY = pageHeight - lineObj.codeY;

      // Blank out code text area
      pdfPage.drawRectangle({
        x: 100,
        y: baselinePdfY - 3.2,
        width: 445,
        height: 12.5,
        color: rowBg,
      });

      if (lineObj.code && lineObj.code.trim() !== '') {
        const tokens = SyntaxHighlighter.tokenizeLine(lineObj.code, 'light');
        const fontSize = 8.6;
        let currentX = 102.8;

        for (const token of tokens) {
          if (!token.text) continue;
          const tokenColor = hexToRgb(PDFLib, token.color || '#000000');
          let tokenFont = fontCourier;
          if (token.bold) tokenFont = fontCourierBold;
          else if (token.italic) tokenFont = fontCourierOblique;

          pdfPage.drawText(token.text, {
            x: currentX,
            y: baselinePdfY,
            size: fontSize,
            font: tokenFont,
            color: tokenColor,
          });

          currentX += tokenFont.widthOfTextAtSize(token.text, fontSize);
        }
      }
    }
  }

  const outBytes = await pdfDoc.save();
  fs.writeFileSync('tests/fixed_PYTHONFILE_highlighted.pdf', outBytes);
  console.log('Saved fixed_PYTHONFILE_highlighted.pdf successfully!');
}

runTest();
