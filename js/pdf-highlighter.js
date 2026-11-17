/**
 * pdf-highlighter.js
 * Modifies the original PDF document to apply IDE-style Python syntax
 * highlighting directly onto the code sections while preserving 100%
 * of the exact vector structure, layout, headers, footers, questions,
 * line numbers, and outputs of the original PDF.
 *
 * Strictly targets only the code lines belonging to each specific page,
 * ensuring output sections, question descriptions, and metadata are
 * completely untouched and never overwritten.
 */

const PDFHighlighter = (() => {

  function getPDFLib() {
    const lib = window.PDFLib || (typeof globalThis !== 'undefined' ? globalThis.PDFLib : null);
    if (!lib) {
      throw new Error('PDF-Lib library is not loaded');
    }
    return lib;
  }

  /**
   * Convert hex color string to PDFLib rgb(0..1, 0..1, 0..1)
   */
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

  /**
   * Generate an updated PDF with syntax highlighted code blocks.
   * @param {ArrayBuffer|Uint8Array} pdfArrayBuffer - original uploaded PDF bytes
   * @param {Array} parsedPages - pages array from PDFParser.parse
   * @param {Array} experiments - experiments array from SectionDetector.detectExperiments
   * @param {string} theme - 'light' or 'dark'
   * @returns {Promise<Blob>}
   */
  async function generateHighlightedPdf(pdfArrayBuffer, parsedPages, experiments, theme = 'light') {
    const PDFLib = getPDFLib();

    // Safely copy bytes so we are guaranteed an attached, valid buffer
    let safeBytes;
    if (pdfArrayBuffer instanceof Uint8Array) {
      safeBytes = pdfArrayBuffer.slice();
    } else if (pdfArrayBuffer instanceof ArrayBuffer) {
      safeBytes = new Uint8Array(pdfArrayBuffer.slice(0));
    } else if (ArrayBuffer.isView(pdfArrayBuffer)) {
      safeBytes = new Uint8Array(pdfArrayBuffer.buffer.slice(pdfArrayBuffer.byteOffset, pdfArrayBuffer.byteOffset + pdfArrayBuffer.byteLength));
    } else {
      safeBytes = new Uint8Array(pdfArrayBuffer);
    }

    const pdfDoc = await PDFLib.PDFDocument.load(safeBytes);

    // Embed standard fonts for code tokens
    const fontCourier = await pdfDoc.embedStandardFont(PDFLib.StandardFonts.Courier);
    const fontCourierBold = await pdfDoc.embedStandardFont(PDFLib.StandardFonts.CourierBold);
    const fontCourierOblique = await pdfDoc.embedStandardFont(PDFLib.StandardFonts.CourierOblique);

    const pages = pdfDoc.getPages();

    // Determine panel row background color
    // Light+ matches the original lab sheet panel background (#F5F5F5)
    // Dark+ uses dark grey (#1E1E1E)
    const isDark = theme === 'dark';
    const rowBg = isDark
      ? hexToRgb(PDFLib, '#1E1E1E')
      : PDFLib.rgb(0.9608, 0.9608, 0.9608);

    for (let pageIdx = 0; pageIdx < parsedPages.length; pageIdx++) {
      const pageInfo = parsedPages[pageIdx];
      const pdfPage = pages[pageIdx];
      if (!pdfPage) continue;

      const pageHeight = pdfPage.getHeight();

      // Find all code lines that strictly belong to THIS EXACT PAGE!
      // This guarantees that output pages (like Page 3, 7, 15) or output sections
      // are NEVER touched or overwritten by code!
      const codeLinesOnThisPage = [];
      for (const exp of experiments) {
        const codeSec = exp.sections.find(s => s.type === 'CODE');
        if (codeSec && codeSec.codeLines) {
          for (const l of codeSec.codeLines) {
            if (l.pageNum === pageInfo.pageNum) {
              codeLinesOnThisPage.push(l);
            }
          }
        }
      }

      // If this page contains no code lines (e.g. pure output page), skip completely
      if (codeLinesOnThisPage.length === 0) {
        continue;
      }

      // Process strictly the code lines that reside on this page
      for (const lineObj of codeLinesOnThisPage) {
        const baselinePdfY = pageHeight - lineObj.codeY;

        // Blank out the original monochrome code text
        // (starts at x=100 so gutter line numbers at x=85-95 remain completely intact)
        const rectX = 100;
        const rectWidth = 445;
        const rectHeight = 12.5;
        const rectY = baselinePdfY - 3.2;

        pdfPage.drawRectangle({
          x: rectX,
          y: rectY,
          width: rectWidth,
          height: rectHeight,
          color: rowBg,
        });

        // Draw syntax-highlighted tokens if line has code
        if (lineObj.code && lineObj.code.trim() !== '') {
          const tokens = SyntaxHighlighter.tokenizeLine(lineObj.code, theme);
          const fontSize = 8.6;
          let currentX = 102.8;

          for (const token of tokens) {
            if (!token.text) continue;

            const tokenColor = hexToRgb(PDFLib, token.color || (isDark ? '#D4D4D4' : '#000000'));
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

    const modifiedBytes = await pdfDoc.save();
    return new Blob([modifiedBytes], { type: 'application/pdf' });
  }

  return {
    generateHighlightedPdf,
  };
})();

window.PDFHighlighter = PDFHighlighter;
