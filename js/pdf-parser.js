/**
 * pdf-parser.js
 * Parses PDF pages using PDF.js and extracts positional text items.
 * Works seamlessly in browser (both on file:// and http://)
 * using the pre-bundled local PDF.js worker.
 */

const PDFParser = (() => {

  /**
   * Get the global PDF.js instance.
   */
  function getPdfjs() {
    const pdfjs = window['pdfjs-dist/build/pdf'] || window.pdfjsLib;
    if (!pdfjs) {
      throw new Error('PDF.js library is not loaded');
    }
    // If workerSrc is needed and not already provided by bundled fake worker:
    if (pdfjs.GlobalWorkerOptions && !pdfjs.GlobalWorkerOptions.workerSrc) {
      pdfjs.GlobalWorkerOptions.workerSrc = 'vendor/pdfjs/pdf.worker.min.js';
    }
    return pdfjs;
  }

  /**
   * Parse a PDF file from an ArrayBuffer or Uint8Array.
   * @param {ArrayBuffer|Uint8Array} arrayBuffer - raw PDF file bytes
   * @param {Function} [onProgress] - callback(currentPage, totalPages, statusText)
   * @returns {Promise<{ numPages: number, pages: Array }>}
   */
  async function parse(arrayBuffer, onProgress) {
    const pdfjs = getPdfjs();

    // Safely clone the input bytes so that if PDF.js transfers the buffer
    // to a Web Worker, the caller's ArrayBuffer is NEVER detached!
    let safeData;
    if (arrayBuffer instanceof Uint8Array) {
      safeData = new Uint8Array(arrayBuffer.slice());
    } else if (arrayBuffer instanceof ArrayBuffer) {
      safeData = new Uint8Array(arrayBuffer.slice(0));
    } else if (ArrayBuffer.isView(arrayBuffer)) {
      safeData = new Uint8Array(arrayBuffer.buffer.slice(arrayBuffer.byteOffset, arrayBuffer.byteOffset + arrayBuffer.byteLength));
    } else {
      safeData = new Uint8Array(arrayBuffer);
    }

    const loadingTask = pdfjs.getDocument({
      data: safeData,
      isEvalSupported: false,
      useSystemFonts: true,
    });

    const pdfDoc = await loadingTask.promise;
    const numPages = pdfDoc.numPages;
    const pages = [];

    for (let p = 1; p <= numPages; p++) {
      if (onProgress) {
        onProgress(p, numPages, `Extracting text from page ${p} of ${numPages}…`);
      }

      const page = await pdfDoc.getPage(p);
      const viewport = page.getViewport({ scale: 1.0 });
      const textContent = await page.getTextContent({ includeMarkedContent: false });

      const items = textContent.items
        .map(it => {
          const x = it.transform[4];
          const y = viewport.height - it.transform[5]; // Convert to top-down coordinate
          return {
            str: it.str,
            x: Math.round(x * 10) / 10,
            y: Math.round(y * 10) / 10,
            width: Math.round((it.width || 0) * 10) / 10,
            height: Math.round((it.height || 0) * 10) / 10,
            fs: Math.round(Math.abs(it.transform[3]) * 10) / 10,
          };
        })
        .filter(it => it.str && it.str.trim() !== '');

      // Sort items top-to-bottom, then left-to-right
      items.sort((a, b) => {
        if (Math.abs(a.y - b.y) > 3.0) return a.y - b.y;
        return a.x - b.x;
      });

      pages.push({
        pageNum: p,
        viewport: { width: viewport.width, height: viewport.height },
        items,
      });
    }

    return { numPages, pages };
  }

  return { parse, getPdfjs };
})();

window.PDFParser = PDFParser;
