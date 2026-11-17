const fs = require('fs');
const path = require('path');
const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');

global.window = global;
global.self = global;
eval(fs.readFileSync('vendor/pdfjs/pdf.worker.min.js', 'utf8'));
eval(fs.readFileSync('vendor/pdfjs/pdf.min.js', 'utf8'));
eval(fs.readFileSync('vendor/highlight/highlight.min.js', 'utf8'));
eval(fs.readFileSync('js/pdf-parser.js', 'utf8'));
eval(fs.readFileSync('js/section-detector.js', 'utf8'));
eval(fs.readFileSync('js/syntax-highlighter.js', 'utf8'));

// Convert hex color to pdf-lib rgb(r, g, b)
function hexToRgb(hex) {
  if (!hex || typeof hex !== 'string') return rgb(0, 0, 0);
  const clean = hex.replace('#', '').trim();
  if (clean.length !== 6) return rgb(0, 0, 0);
  const r = parseInt(clean.substring(0, 2), 16) / 255;
  const g = parseInt(clean.substring(2, 4), 16) / 255;
  const b = parseInt(clean.substring(4, 6), 16) / 255;
  if (isNaN(r) || isNaN(g) || isNaN(b)) return rgb(0, 0, 0);
  return rgb(r, g, b);
}

async function testPdfHighlight() {
  const srcPdfPath = 'e01-q1-roots-of-a-quadratic-equation.pdf';
  const outPdfPath = 'e01-q1-roots-of-a-quadratic-equation_highlighted.pdf';

  const srcBytes = fs.readFileSync(srcPdfPath);

  // 1. Parse positional information with PDFParser
  const parsed = await PDFParser.parse(srcBytes);
  console.log(`Parsed ${parsed.numPages} pages.`);

  // 2. Detect sections
  const experiments = SectionDetector.detectExperiments(parsed.pages);
  console.log(`Detected ${experiments.length} experiment(s).`);

  // 3. Load with pdf-lib to modify
  const pdfDoc = await PDFDocument.load(srcBytes);
  const fontCourier = await pdfDoc.embedStandardFont(StandardFonts.Courier);
  const fontCourierBold = await pdfDoc.embedStandardFont(StandardFonts.CourierBold);

  const pages = pdfDoc.getPages();

  for (const exp of experiments) {
    const codeSec = exp.sections.find(s => s.type === 'CODE');
    if (!codeSec) continue;

    console.log(`Exp ${exp.experimentNum} has ${codeSec.codeLines.length} code lines.`);

    // Find the text items for code lines across parsed pages
    for (const pageInfo of parsed.pages) {
      const pageIndex = pageInfo.pageNum - 1;
      const pdfPage = pages[pageIndex];
      const pageHeight = pdfPage.getHeight();

      // Find code items on this page
      // Look for code lines
      for (const lineObj of codeSec.codeLines) {
        // Find matching item in pageInfo.items
        // A code line has lineNum item at x < 100, and code text at x >= 100
        const lineNumItem = pageInfo.items.find(it =>
          it.x < 100 && it.str.trim() === String(lineObj.lineNum)
        );

        if (!lineNumItem) continue;

        const yTop = lineNumItem.y;
        // In PDF coordinates:
        const pdfY = pageHeight - yTop;

        // Code row background color: #F5F5F5
        const rowBg = rgb(0.9608, 0.9608, 0.9608);

        // Blank out the original code line text from x=101 to x=545
        // (leaving the line number at x=85-95 intact)
        const rectX = 101;
        const rectWidth = 445;
        const rectHeight = 11.5;
        const rectY = pdfY - 3; // Baseline is near pdfY

        pdfPage.drawRectangle({
          x: rectX,
          y: rectY,
          width: rectWidth,
          height: rectHeight,
          color: rowBg,
        });

        // Now draw the syntax highlighted tokens!
        if (lineObj.code && lineObj.code.trim() !== '') {
          const tokens = SyntaxHighlighter.tokenizeLine(lineObj.code, 'light');

          // Determine starting X based on indentation or base X
          // In Courier, characters are fixed-width
          const fontSize = 8.6;
          let currentX = 102.8;

          for (const token of tokens) {
            if (!token.text) continue;

            const tokenColor = hexToRgb(token.color || '#000000');
            const tokenFont = token.bold ? fontCourierBold : fontCourier;

            pdfPage.drawText(token.text, {
              x: currentX,
              y: pdfY,
              size: fontSize,
              font: tokenFont,
              color: tokenColor,
            });

            currentX += tokenFont.widthOfTextAtSize(token.text, fontSize);
          }
        }
      }
    }
  }

  const outBytes = await pdfDoc.save();
  fs.writeFileSync(outPdfPath, outBytes);
  console.log(`Saved highlighted PDF to ${outPdfPath} (${outBytes.length} bytes).`);
}

testPdfHighlight().catch(err => console.error(err));
