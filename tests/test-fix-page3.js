const fs = require('fs');
global.window = global;
global.self = global;
eval(fs.readFileSync('vendor/pdfjs/pdf.worker.min.js', 'utf8'));
eval(fs.readFileSync('vendor/pdfjs/pdf.min.js', 'utf8'));
eval(fs.readFileSync('js/pdf-parser.js', 'utf8'));

// Test updated SectionDetector logic
function detectExperimentsWithPageNums(pages) {
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

    // Extract metadata
    for (const it of items) {
      const clean = it.str.replace(/\s+/g, ' ').trim();
      const noSpace = it.str.replace(/\s+/g, '');
      if (/^Q\d+\./i.test(clean) && !currentExp.title) currentExp.title = clean;
      if (it.y >= 110 && it.y <= 138) {
        if (it.x < 100 && !currentExp.studentName && !/NAME/i.test(noSpace)) currentExp.studentName = clean;
        else if (it.x >= 100 && it.x <= 200 && !currentExp.rollNo && !/ROLLNO/i.test(noSpace)) currentExp.rollNo = clean;
      }
      if (isContinuation && it.y < 60 && it.x > 300) {
        const parts = clean.split(/[·•]/);
        if (parts.length >= 2) {
          if (!currentExp.studentName) currentExp.studentName = parts[0].trim();
          if (!currentExp.rollNo) currentExp.rollNo = parts[1].trim();
        }
      }
    }

    // Capture the section that was active on the previous page BEFORE registering new headers!
    const previousPageSection = currentExp.sections.length > 0
      ? currentExp.sections[currentExp.sections.length - 1]
      : null;

    // Identify section headers on this page
    const pageSectionHeaders = [];
    for (const it of items) {
      if (/^0\d$/.test(it.str) && it.x < 85 && it.y > 75 && it.y < 790) {
        const titleItem = items.find(other =>
          other !== it && Math.abs(other.y - it.y) < 3.5 && other.x > 85 && other.x < 150
        );

        if (titleItem) {
          const num = parseInt(it.str, 10);
          let title = titleItem.str.trim().replace(/\(\s*RUN\s*(\d+)\s*\)/i, '(RUN $1)');

          let type = 'OUTPUT';
          if (title.startsWith('QUESTION')) type = 'QUESTION';
          else if (title.startsWith('CODE')) type = 'CODE';

          const runMatch = title.match(/RUN\s*(\d+)/i);
          const run = runMatch ? parseInt(runMatch[1], 10) : null;

          pageSectionHeaders.push({ num, title, type, run, y: it.y });
        }
      }
    }

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

    // Filter content items
    const contentItems = items.filter(it => {
      if (it.y < 80) return false;
      if (it.y > 795) return false;
      if (!isContinuation && it.y < 140) return false;
      if (pageSectionHeaders.some(sh => Math.abs(it.y - sh.y) < 4.0 && it.x < 150)) return false;
      return true;
    });

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

      let secHeader = null;
      for (let s = pageSectionHeaders.length - 1; s >= 0; s--) {
        if (y > pageSectionHeaders[s].y) {
          secHeader = pageSectionHeaders[s];
          break;
        }
      }

      // If line is above all headers on this page, it belongs to previousPageSection!
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
        const lineNumItem = lineItems.find(it => it.x < 100 && /^\d+$/.test(it.str.trim()));
        const codeItems = lineItems.filter(it => it !== lineNumItem);
        const lineNum = lineNumItem ? parseInt(lineNumItem.str.trim(), 10) : null;

        if (codeItems.length > 0) {
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

        targetSec.lines.push({ lineNum, text, pageNum, y });
      }
    }
  }

  for (const exp of experiments) {
    for (const sec of exp.sections) {
      if (sec.type === 'QUESTION') sec.questionText = sec.lines.map(l => l.text).join('\n');
      else if (sec.type === 'CODE') sec.codeLines = sec.lines;
      else if (sec.type === 'OUTPUT') sec.outputLines = sec.lines;
    }
  }

  return experiments;
}

async function test() {
  const buf = fs.readFileSync('PYTHONFILE.pdf');
  const parsed = await PDFParser.parse(buf);
  const exps = detectExperimentsWithPageNums(parsed.pages);

  for (let p = 1; p <= 20; p++) {
    // Collect all code lines on this page across all experiments
    const codeLinesOnP = [];
    const outputLinesOnP = [];
    for (const exp of exps) {
      for (const sec of exp.sections) {
        if (sec.type === 'CODE') {
          for (const l of sec.codeLines) {
            if (l.pageNum === p) codeLinesOnP.push(l);
          }
        } else if (sec.type === 'OUTPUT') {
          for (const l of sec.outputLines) {
            if (l.pageNum === p) outputLinesOnP.push(l);
          }
        }
      }
    }
    console.log(`Page ${String(p).padStart(2)}: Code lines = ${codeLinesOnP.length}, Output lines = ${outputLinesOnP.length}`);
    if (p === 3) {
      console.log('  Page 3 output lines sample:');
      for (const ol of outputLinesOnP.slice(0, 3)) {
        console.log(`    [${ol.lineNum}] "${ol.text}"`);
      }
    }
  }
}

test();
