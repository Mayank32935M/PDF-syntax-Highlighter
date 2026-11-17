/**
 * section-detector.js
 * Analyses positional text items extracted by PDFParser and identifies
 * all logical experiments and sections from a Lab File document.
 *
 * Fully supports:
 *  - Header (Subject and Experiment Number)
 *  - Title ("Q#. ...")
 *  - Student Metadata ("NAME", "ROLL NO.")
 *  - Section Headings ("01 QUESTION", "02 CODE", "03 OUTPUT (RUN 1)", etc.)
 *  - Multi-line Question text
 *  - Numbered Code lines with exact indentation preservation and blank lines
 *  - Numbered Output lines
 *  - Multi-page experiment continuation headers and page transitions
 *  - Precise line page-number & Y-coordinate tracking to prevent code/output collision
 *  - Footers and Page Numbers
 */

const SectionDetector = (() => {

  /**
   * Main entry point: detect all experiments from parsed PDF pages.
   * @param {Array} pages - array of { pageNum, viewport, items } from PDFParser
   * @returns {Array<Object>} array of experiment document models
   */
  function detectExperiments(pages) {
    const experiments = [];
    let currentExp = null;

    for (const page of pages) {
      const { items, pageNum } = page;

      // Check header items at y < 80
      const topItems = items.filter(it => it.y < 80);
      const isContinuation = topItems.some(it => it.str.includes('·') || it.str.includes('•'));

      // Check if this page introduces a new experiment
      const topTextNoSpace = topItems.map(it => it.str.replace(/\s+/g, '')).join('');
      const expMatch = topTextNoSpace.match(/EXPERIMENT(\d+)/i);
      const isNewExp = !isContinuation && expMatch !== null;

      if (isNewExp || !currentExp) {
        currentExp = {
          experimentNum: expMatch ? parseInt(expMatch[1], 10) : (experiments.length + 1),
          subject: 'OBJECT ORIENTED PROGRAMMING USING PYTHON',
          title: '',
          studentName: '',
          rollNo: '',
          sections: [],
          pages: [pageNum],
        };
        experiments.push(currentExp);
      } else {
        currentExp.pages.push(pageNum);
      }

      // Extract metadata (title, student name, roll number) from this page
      for (const it of items) {
        const clean = it.str.replace(/\s+/g, ' ').trim();
        const noSpace = it.str.replace(/\s+/g, '');

        // Title: "Q1. Roots of a quadratic equation"
        if (/^Q\d+\./i.test(clean) && !currentExp.title) {
          currentExp.title = clean;
        }

        // Student metadata on first page
        if (it.y >= 110 && it.y <= 138) {
          if (it.x < 100 && !currentExp.studentName && !/NAME/i.test(noSpace)) {
            currentExp.studentName = clean;
          } else if (it.x >= 100 && it.x <= 200 && !currentExp.rollNo && !/ROLLNO/i.test(noSpace)) {
            currentExp.rollNo = clean;
          }
        }

        // Continuation header metadata e.g. "EXPERIMENT 02 · Q2..." and "AAYUSHI · 26BC025"
        if (isContinuation && it.y < 60 && it.x > 300) {
          const parts = clean.split(/[·•]/);
          if (parts.length >= 2) {
            if (!currentExp.studentName) currentExp.studentName = parts[0].trim();
            if (!currentExp.rollNo) currentExp.rollNo = parts[1].trim();
          }
        }
      }

      // Capture the section that was active on the PREVIOUS page before registering new headers
      const previousPageSection = currentExp.sections.length > 0
        ? currentExp.sections[currentExp.sections.length - 1]
        : null;

      // Identify section headers on this page
      // Format: "01", "02", "03", etc. at x < 85 and matching title at x ~ 85..150
      const pageSectionHeaders = [];
      for (const it of items) {
        if (/^0\d$/.test(it.str) && it.x < 85 && it.y > 75 && it.y < 790) {
          // Look for title item at same y
          const titleItem = items.find(other =>
            other !== it &&
            Math.abs(other.y - it.y) < 3.5 &&
            other.x > 85 && other.x < 150
          );

          if (titleItem) {
            const num = parseInt(it.str, 10);
            let title = titleItem.str.trim();
            // Normalize "OUTPUT ( RUN 1 )" -> "OUTPUT (RUN 1)"
            title = title.replace(/\(\s*RUN\s*(\d+)\s*\)/i, '(RUN $1)');

            let type = 'OUTPUT';
            if (title.startsWith('QUESTION')) type = 'QUESTION';
            else if (title.startsWith('CODE')) type = 'CODE';

            const runMatch = title.match(/RUN\s*(\d+)/i);
            const run = runMatch ? parseInt(runMatch[1], 10) : null;

            pageSectionHeaders.push({
              num,
              title,
              type,
              run,
              y: it.y,
            });
          }
        }
      }

      // Sort section headers top to bottom
      pageSectionHeaders.sort((a, b) => a.y - b.y);

      // Register new sections in currentExp.sections
      for (const sh of pageSectionHeaders) {
        let existing = currentExp.sections.find(
          s => s.type === sh.type && s.run === sh.run && s.num === sh.num
        );
        if (!existing) {
          existing = {
            num: sh.num,
            title: sh.title,
            type: sh.type,
            run: sh.run,
            lines: [],
          };
          currentExp.sections.push(existing);
        }
      }

      // Filter content items (ignore headers, title/meta, section banners, footer)
      const contentItems = items.filter(it => {
        if (it.y < 80) return false;    // Header
        if (it.y > 795) return false;   // Footer
        if (!isContinuation && it.y < 140) return false; // Title & meta
        // Exclude section header items themselves
        if (pageSectionHeaders.some(sh => Math.abs(it.y - sh.y) < 4.0 && it.x < 150)) {
          return false;
        }
        return true;
      });

      // Cluster content items by Y coordinate into logical visual lines
      const lineMap = new Map();
      for (const it of contentItems) {
        let matchedY = null;
        for (const yKey of lineMap.keys()) {
          if (Math.abs(yKey - it.y) < 3.5) {
            matchedY = yKey;
            break;
          }
        }
        if (matchedY === null) {
          matchedY = it.y;
          lineMap.set(matchedY, []);
        }
        lineMap.get(matchedY).push(it);
      }

      const sortedLines = [...lineMap.entries()].sort((a, b) => a[0] - b[0]);

      for (const [y, lineItems] of sortedLines) {
        lineItems.sort((a, b) => a.x - b.x);

        // Find which section header on this page is above this line
        let secHeader = null;
        for (let s = pageSectionHeaders.length - 1; s >= 0; s--) {
          if (y > pageSectionHeaders[s].y) {
            secHeader = pageSectionHeaders[s];
            break;
          }
        }

        // Target section is the header above this line,
        // or on a continuation page above the first header, the section from the previous page
        const targetSec = secHeader
          ? currentExp.sections.find(
              s => s.type === secHeader.type && s.run === secHeader.run && s.num === secHeader.num
            )
          : previousPageSection;

        if (!targetSec) continue;

        if (targetSec.type === 'QUESTION') {
          const text = lineItems.map(it => it.str).join(' ').trim();
          if (text) targetSec.lines.push({ text, pageNum });
        } else if (targetSec.type === 'CODE') {
          // Gutter line number at x < 100
          const lineNumItem = lineItems.find(it => it.x < 100 && /^\d+$/.test(it.str.trim()));
          const codeItems = lineItems.filter(it => it !== lineNumItem);
          const lineNum = lineNumItem ? parseInt(lineNumItem.str.trim(), 10) : null;

          if (codeItems.length > 0) {
            // Indentation calculation:
            // Base code X is ~102.8. Each 4-space indent step is ~20.6 points.
            const firstItem = codeItems[0];
            const indentOffset = Math.max(0, firstItem.x - 102.8);
            const indentSteps = Math.round(indentOffset / 20.6);
            const indentSpaces = '    '.repeat(indentSteps);

            let codeStr = codeItems.map(it => it.str).join('');
            codeStr = indentSpaces + codeStr.trimStart();

            targetSec.lines.push({
              lineNum,
              code: codeStr,
              pageNum,
              y,
              codeY: codeItems[0].y,
            });
          } else {
            // Empty / blank code line with preserved line number
            targetSec.lines.push({
              lineNum,
              code: '',
              pageNum,
              y,
              codeY: lineNumItem ? lineNumItem.y + 1.5 : y,
            });
          }
        } else if (targetSec.type === 'OUTPUT') {
          const lineNumItem = lineItems.find(it => it.x < 100 && /^\d+$/.test(it.str.trim()));
          const outItems = lineItems.filter(it => it !== lineNumItem);
          const lineNum = lineNumItem ? parseInt(lineNumItem.str.trim(), 10) : null;
          const text = outItems.map(it => it.str).join(' ').trim();

          targetSec.lines.push({
            lineNum,
            text,
            pageNum,
            y,
          });
        }
      }
    }

    // Finalize sections
    for (const exp of experiments) {
      for (const sec of exp.sections) {
        if (sec.type === 'QUESTION') {
          sec.questionText = sec.lines.map(l => l.text).join('\n');
        } else if (sec.type === 'CODE') {
          sec.codeLines = sec.lines;
        } else if (sec.type === 'OUTPUT') {
          sec.outputLines = sec.lines;
        }
      }
    }

    return experiments;
  }

  return {
    detectExperiments,
  };
})();

window.SectionDetector = SectionDetector;
