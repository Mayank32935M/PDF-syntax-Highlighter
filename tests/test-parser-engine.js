const fs = require('fs');
const path = require('path');

global.window = global;
global.self = global;
eval(fs.readFileSync(path.join(__dirname, 'vendor/pdfjs/pdf.worker.min.js'), 'utf8'));
eval(fs.readFileSync(path.join(__dirname, 'vendor/pdfjs/pdf.min.js'), 'utf8'));

const pdfjs = window['pdfjs-dist/build/pdf'];

/**
 * Robust Positional Document Parser
 */
async function parsePdfDocument(pdfBuffer) {
  const loadingTask = pdfjs.getDocument({ data: new Uint8Array(pdfBuffer) });
  const pdfDoc = await loadingTask.promise;
  const numPages = pdfDoc.numPages;

  const parsedPages = [];

  for (let p = 1; p <= numPages; p++) {
    const page = await pdfDoc.getPage(p);
    const viewport = page.getViewport({ scale: 1.0 });
    const textContent = await page.getTextContent();

    const items = textContent.items
      .map(it => ({
        str: it.str,
        x: Math.round(it.transform[4] * 10) / 10,
        y: Math.round((viewport.height - it.transform[5]) * 10) / 10,
        width: Math.round(it.width * 10) / 10,
        height: Math.round(it.height * 10) / 10,
        fs: Math.round(Math.abs(it.transform[3]) * 10) / 10,
      }))
      .filter(it => it.str && it.str.trim() !== '');

    // Sort top to bottom, then left to right
    items.sort((a, b) => {
      if (Math.abs(a.y - b.y) > 3) return a.y - b.y;
      return a.x - b.x;
    });

    parsedPages.push({ pageNum: p, viewport, items });
  }

  return analyzePages(parsedPages);
}

function analyzePages(pages) {
  const experiments = [];
  let currentExp = null;

  for (const page of pages) {
    const { items, pageNum } = page;

    // Check if this is a new experiment or continuation page
    const isContinuation = items.some(it => it.y < 60 && it.str.includes('·'));
    const isNewExp = items.some(it => it.y < 80 && /EXPERIMENT\s+\d+/i.test(it.str.replace(/\s+/g, ' ')));

    if (isNewExp || !currentExp) {
      currentExp = {
        experimentNum: null,
        subject: 'OBJECT ORIENTED PROGRAMMING USING PYTHON',
        title: '',
        studentName: '',
        rollNo: '',
        sections: [],
      };
      experiments.push(currentExp);
    }

    // Extract experiment metadata if present on page
    for (const it of items) {
      const clean = it.str.replace(/\s+/g, ' ').trim();
      const noSpace = it.str.replace(/\s+/g, '');

      // Header experiment number: "EXPERIMENT 01"
      const expMatch = clean.match(/EXPERIMENT\s+(\d+)/i) || noSpace.match(/EXPERIMENT(\d+)/i);
      if (expMatch && !currentExp.experimentNum) {
        currentExp.experimentNum = parseInt(expMatch[1], 10);
      }

      // Title: "Q1. Roots of a quadratic equation"
      if (/^Q\d+\./i.test(clean) && !currentExp.title) {
        currentExp.title = clean;
      }

      // Meta: Name and Roll
      if (it.y >= 115 && it.y <= 135) {
        if (it.x < 100 && !currentExp.studentName) {
          currentExp.studentName = clean;
        } else if (it.x >= 100 && it.x <= 200 && !currentExp.rollNo) {
          currentExp.rollNo = clean;
        }
      }

      // Continuation header: e.g. "EXPERIMENT 02 · Q2..." and "AAYUSHI · 26BC025"
      if (isContinuation && it.y < 60 && it.x > 300) {
        const parts = clean.split(/[·•]/);
        if (parts.length >= 2) {
          if (!currentExp.studentName) currentExp.studentName = parts[0].trim();
          if (!currentExp.rollNo) currentExp.rollNo = parts[1].trim();
        }
      }
    }

    // Group items into logical sections
    // First, find all section headers on this page
    // A section header has section number ("01", "02", "03", "04") at x ~ 76, y in (140..780)
    // and section title ("QUESTION", "CODE", "OUTPUT...") at x ~ 97..100 at same y
    const sectionHeaders = [];
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (/^0\d$/.test(it.str) && it.x < 85 && it.y > 100 && it.y < 790) {
        // Find matching title near this y
        const titleItem = items.find(other =>
          other !== it &&
          Math.abs(other.y - it.y) < 3.5 &&
          other.x > 85 && other.x < 140
        );

        if (titleItem) {
          const num = parseInt(it.str, 10);
          let title = titleItem.str.trim();
          // Normalize title spacing like "OUTPUT ( RUN 1 )" -> "OUTPUT (RUN 1)"
          title = title.replace(/\(\s*RUN\s*(\d+)\s*\)/i, '(RUN $1)');
          sectionHeaders.push({
            num,
            title,
            y: it.y,
            type: title.startsWith('QUESTION') ? 'QUESTION'
                : title.startsWith('CODE') ? 'CODE'
                : 'OUTPUT',
            run: title.match(/RUN\s*(\d+)/i) ? parseInt(title.match(/RUN\s*(\d+)/i)[1], 10) : null,
          });
        }
      }
    }

    // Sort headers by y
    sectionHeaders.sort((a, b) => a.y - b.y);

    // If no section headers on this continuation page, items belong to the last active section
    let currentSection = currentExp.sections[currentExp.sections.length - 1];

    // Helper: find which section an item belongs to based on its y
    function getSectionForY(y) {
      if (sectionHeaders.length === 0) return currentSection;
      for (let s = sectionHeaders.length - 1; s >= 0; s--) {
        if (y > sectionHeaders[s].y + 10) {
          return sectionHeaders[s];
        }
      }
      return null;
    }

    // Process section headers and add them to currentExp.sections
    for (const sh of sectionHeaders) {
      let existing = currentExp.sections.find(s => s.type === sh.type && s.run === sh.run && s.num === sh.num);
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

    // Group items between headers
    // Items that are not headers, metadata, or footer:
    const contentItems = items.filter(it => {
      // Exclude top header
      if (it.y < 80) return false;
      // Exclude footer
      if (it.y > 795) return false;
      // Exclude title & metadata on first page
      if (!isContinuation && it.y < 140) return false;
      // Exclude section header items themselves
      if (sectionHeaders.some(sh => Math.abs(it.y - sh.y) < 4 && it.x < 150)) return false;
      return true;
    });

    // Group content items by line (clustering by y)
    const lineMap = new Map();
    for (const it of contentItems) {
      // Find existing y key within 3.5 points
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

    // Sort lines top to bottom
    const sortedLines = [...lineMap.entries()].sort((a, b) => a[0] - b[0]);

    for (const [y, lineItems] of sortedLines) {
      lineItems.sort((a, b) => a.x - b.x);

      // Determine which section this line belongs to
      let secHeader = null;
      for (let s = sectionHeaders.length - 1; s >= 0; s--) {
        if (y > sectionHeaders[s].y) {
          secHeader = sectionHeaders[s];
          break;
        }
      }

      // If on a continuation page and line is before any new header on that page,
      // it belongs to the previous page's last section!
      const targetSec = secHeader
        ? currentExp.sections.find(s => s.type === secHeader.type && s.run === secHeader.run && s.num === secHeader.num)
        : currentExp.sections[currentExp.sections.length - 1];

      if (!targetSec) continue;

      if (targetSec.type === 'QUESTION') {
        const text = lineItems.map(it => it.str).join(' ').trim();
        if (text) targetSec.lines.push({ text });
      } else if (targetSec.type === 'CODE') {
        // Line number is at x < 100
        const lineNumItem = lineItems.find(it => it.x < 100 && /^\d+$/.test(it.str.trim()));
        const codeItems = lineItems.filter(it => it !== lineNumItem);

        const lineNum = lineNumItem ? parseInt(lineNumItem.str.trim(), 10) : null;

        if (codeItems.length > 0) {
          // Reconstruct code with indentation
          // Base X is ~102.8. Each indent step is ~20.6 points = 4 spaces.
          const firstItem = codeItems[0];
          const indentOffset = Math.max(0, firstItem.x - 102.8);
          const indentSteps = Math.round(indentOffset / 20.6);
          const indentSpaces = '    '.repeat(indentSteps);

          // Join code tokens on the same line if split
          let codeStr = codeItems.map(it => it.str).join('');
          // Trim leading spaces from codeStr and prepend computed indentation
          codeStr = indentSpaces + codeStr.trimStart();

          targetSec.lines.push({ lineNum, code: codeStr });
        } else {
          // Blank line with just a line number
          targetSec.lines.push({ lineNum, code: '' });
        }
      } else if (targetSec.type === 'OUTPUT') {
        const lineNumItem = lineItems.find(it => it.x < 100 && /^\d+$/.test(it.str.trim()));
        const outItems = lineItems.filter(it => it !== lineNumItem);

        const lineNum = lineNumItem ? parseInt(lineNumItem.str.trim(), 10) : null;
        const text = outItems.map(it => it.str).join(' ').trim();

        targetSec.lines.push({ lineNum, text });
      }
    }
  }

  // Post-process sections
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

// Test on reference PDF
async function run() {
  const refPdf = fs.readFileSync(path.join(__dirname, 'e01-q1-roots-of-a-quadratic-equation.pdf'));
  const exps = await parsePdfDocument(refPdf);
  console.log('Parsed Experiments count:', exps.length);
  const e1 = exps[0];
  console.log('Subject:', e1.subject);
  console.log('Exp Num:', e1.experimentNum);
  console.log('Title:', e1.title);
  console.log('Student:', e1.studentName, '| Roll:', e1.rollNo);
  console.log('Sections count:', e1.sections.length);

  for (const s of e1.sections) {
    console.log(`\n-- Section ${s.num}: ${s.title} (${s.type}) --`);
    if (s.type === 'QUESTION') {
      console.log('Question text:\n', s.questionText);
    } else if (s.type === 'CODE') {
      console.log('Total code lines:', s.codeLines.length);
      console.log('First 5 code lines:');
      for (const cl of s.codeLines.slice(0, 5)) {
        console.log(`  [${String(cl.lineNum).padStart(2)}] "${cl.code}"`);
      }
      console.log('Indented lines sample (lines 7-12):');
      for (const cl of s.codeLines.slice(6, 12)) {
        console.log(`  [${String(cl.lineNum).padStart(2)}] "${cl.code}"`);
      }
    } else if (s.type === 'OUTPUT') {
      console.log(`Total output lines: ${s.outputLines.length}`);
      for (const ol of s.outputLines) {
        console.log(`  [${String(ol.lineNum).padStart(2)}] "${ol.text}"`);
      }
    }
  }
}

run().catch(err => console.error(err));
