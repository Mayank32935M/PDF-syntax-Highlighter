/**
 * docx-generator.js
 * Generates an editable Microsoft Word (.docx) document from parsed Lab File
 * experiments using docx.js.
 *
 * Visual fidelity goals:
 *  - Standard A4 page dimensions & 1-inch margins
 *  - Navy header bar: subject on left, experiment number on right
 *  - Bold question title
 *  - Clean metadata table: student name and roll number
 *  - Styled section headings with navy numbered badge
 *  - Question wording exact and preserved
 *  - Grey code panel with line numbers gutter and syntax-highlighted editable Python runs
 *  - Monospace output panel
 *  - Navy footer bar with page numbering
 */

const DocxGenerator = (() => {

  // ── Color Palette ────────────────────────────────────────────────────────────
  const COLORS = {
    headerBg:       '1E3A5F',  // Navy blue
    headerText:     'FFFFFF',  // White text
    titleText:      '1E3A5F',
    sectionText:    '1E3A5F',
    panelBg:        'F8FAFC',  // Code panel background
    gutterBg:       'F0F2F5',  // Line number gutter background
    panelBorder:    'D1D5DB',  // Subtle grey border
    gutterText:     '888888',  // Gutter line number color
    bodyText:       '1E293B',
    outputText:     '111827',  // Monospace output text
    metaLabel:      '64748B',  // Muted meta label
  };

  // ── Typography ───────────────────────────────────────────────────────────────
  const FONTS = {
    body:   'Calibri',
    code:   'Consolas',
    header: 'Calibri',
  };

  // Sizes in half-points (e.g. 18 = 9pt, 24 = 12pt, 28 = 14pt)
  const SZ = {
    header:   18,  // 9pt
    title:    26,  // 13pt
    metaLbl:  16,  // 8pt
    metaVal:  20,  // 10pt
    secNum:   20,  // 10pt
    secTitle: 20,  // 10pt
    body:     20,  // 10pt
    code:     18,  // 9pt
    gutter:   16,  // 8pt
    output:   18,  // 9pt
    footer:   16,  // 8pt
  };

  function getDocx() {
    const d = window.docx || (typeof globalThis !== 'undefined' ? globalThis.docx : null);
    if (!d) throw new Error('docx.js library is not available');
    return d;
  }

  function makeRun(docx, text, opts = {}) {
    return new docx.TextRun({
      text: text !== undefined ? String(text) : '',
      font:      opts.font      || FONTS.body,
      size:      opts.size      || SZ.body,
      color:     opts.color ? opts.color.replace('#', '') : '000000',
      bold:      opts.bold      || false,
      italics:   opts.italics   || false,
    });
  }

  function emptyPara(docx, before = 80, after = 80) {
    return new docx.Paragraph({
      children: [],
      spacing: { before, after },
    });
  }

  function noBorders(docx) {
    return {
      top:    { style: docx.BorderStyle.NONE, size: 0 },
      bottom: { style: docx.BorderStyle.NONE, size: 0 },
      left:   { style: docx.BorderStyle.NONE, size: 0 },
      right:  { style: docx.BorderStyle.NONE, size: 0 },
      insideH:{ style: docx.BorderStyle.NONE, size: 0 },
      insideV:{ style: docx.BorderStyle.NONE, size: 0 },
    };
  }

  /**
   * Build the top navy header bar.
   */
  function buildHeaderTable(docx, subject, experimentNum) {
    const expText = experimentNum ? `EXPERIMENT ${String(experimentNum).padStart(2, '0')}` : '';

    return new docx.Table({
      width: { size: 100, type: docx.WidthType.PERCENTAGE },
      rows: [
        new docx.TableRow({
          children: [
            new docx.TableCell({
              children: [
                new docx.Paragraph({
                  children: [makeRun(docx, subject, {
                    font: FONTS.header, size: SZ.header, color: COLORS.headerText, bold: true,
                  })],
                  spacing: { before: 80, after: 80 },
                }),
              ],
              shading: { fill: COLORS.headerBg, type: docx.ShadingType.SOLID },
              borders: noBorders(docx),
              width: { size: 70, type: docx.WidthType.PERCENTAGE },
              margins: { left: 160, right: 160, top: 80, bottom: 80 },
            }),
            new docx.TableCell({
              children: [
                new docx.Paragraph({
                  alignment: docx.AlignmentType.RIGHT,
                  children: [makeRun(docx, expText, {
                    font: FONTS.header, size: SZ.header, color: COLORS.headerText, bold: true,
                  })],
                  spacing: { before: 80, after: 80 },
                }),
              ],
              shading: { fill: COLORS.headerBg, type: docx.ShadingType.SOLID },
              borders: noBorders(docx),
              width: { size: 30, type: docx.WidthType.PERCENTAGE },
              margins: { left: 160, right: 160, top: 80, bottom: 80 },
            }),
          ],
        }),
      ],
      borders: noBorders(docx),
    });
  }

  /**
   * Build student details table (NAME & ROLL NO.).
   */
  function buildMetaTable(docx, studentName, rollNo) {
    const cellBorder = { style: docx.BorderStyle.SINGLE, size: 1, color: 'CBD5E1' };
    const tableBorders = {
      top: cellBorder, bottom: cellBorder, left: cellBorder, right: cellBorder,
      insideH: { style: docx.BorderStyle.NONE },
      insideV: cellBorder,
    };

    return new docx.Table({
      width: { size: 100, type: docx.WidthType.PERCENTAGE },
      rows: [
        new docx.TableRow({
          children: [
            new docx.TableCell({
              children: [
                new docx.Paragraph({
                  children: [makeRun(docx, 'NAME', { size: SZ.metaLbl, color: COLORS.metaLabel, bold: true })],
                  spacing: { before: 40, after: 20 },
                }),
                new docx.Paragraph({
                  children: [makeRun(docx, studentName || '', { size: SZ.metaVal, color: COLORS.bodyText, bold: true })],
                  spacing: { before: 20, after: 40 },
                }),
              ],
              width: { size: 50, type: docx.WidthType.PERCENTAGE },
              margins: { left: 160, right: 160, top: 60, bottom: 60 },
              borders: tableBorders,
            }),
            new docx.TableCell({
              children: [
                new docx.Paragraph({
                  children: [makeRun(docx, 'ROLL NO.', { size: SZ.metaLbl, color: COLORS.metaLabel, bold: true })],
                  spacing: { before: 40, after: 20 },
                }),
                new docx.Paragraph({
                  children: [makeRun(docx, rollNo || '', { size: SZ.metaVal, color: COLORS.bodyText, bold: true })],
                  spacing: { before: 20, after: 40 },
                }),
              ],
              width: { size: 50, type: docx.WidthType.PERCENTAGE },
              margins: { left: 160, right: 160, top: 60, bottom: 60 },
              borders: tableBorders,
            }),
          ],
        }),
      ],
      borders: tableBorders,
    });
  }

  /**
   * Build stylized section heading banner: [ 01 ]  QUESTION
   */
  function buildSectionBanner(docx, num, title) {
    const numStr = String(num).padStart(2, '0');

    return new docx.Table({
      width: { size: 100, type: docx.WidthType.PERCENTAGE },
      rows: [
        new docx.TableRow({
          children: [
            new docx.TableCell({
              children: [
                new docx.Paragraph({
                  alignment: docx.AlignmentType.CENTER,
                  children: [makeRun(docx, numStr, {
                    font: FONTS.header, size: SZ.secNum, color: COLORS.headerText, bold: true,
                  })],
                  spacing: { before: 60, after: 60 },
                }),
              ],
              shading: { fill: COLORS.headerBg, type: docx.ShadingType.SOLID },
              borders: noBorders(docx),
              width: { size: 7, type: docx.WidthType.PERCENTAGE },
              margins: { left: 60, right: 60, top: 50, bottom: 50 },
            }),
            new docx.TableCell({
              children: [
                new docx.Paragraph({
                  children: [makeRun(docx, '   ' + title.toUpperCase(), {
                    font: FONTS.header, size: SZ.secTitle, color: COLORS.sectionText, bold: true,
                  })],
                  spacing: { before: 60, after: 60 },
                }),
              ],
              shading: { fill: 'F1F5F9', type: docx.ShadingType.SOLID },
              borders: noBorders(docx),
              width: { size: 93, type: docx.WidthType.PERCENTAGE },
              margins: { left: 140, right: 140, top: 50, bottom: 50 },
            }),
          ],
        }),
      ],
      borders: noBorders(docx),
    });
  }

  /**
   * Build syntax-highlighted code table.
   */
  function buildCodePanel(docx, codeSection, theme) {
    if (!codeSection || !codeSection.codeLines || codeSection.codeLines.length === 0) {
      return [];
    }

    const panelBorder = { style: docx.BorderStyle.SINGLE, size: 1, color: COLORS.panelBorder };
    const gutterBorder = { style: docx.BorderStyle.SINGLE, size: 1, color: 'E2E8F0' };

    const rows = codeSection.codeLines.map((lineObj) => {
      const lineNumStr = lineObj.lineNum !== null ? String(lineObj.lineNum) : '';
      const codeStr = lineObj.code || '';

      // Gutter cell (Line number)
      const gutterCell = new docx.TableCell({
        children: [
          new docx.Paragraph({
            alignment: docx.AlignmentType.RIGHT,
            children: [makeRun(docx, lineNumStr, {
              font: FONTS.code, size: SZ.gutter, color: COLORS.gutterText,
            })],
            spacing: { before: 15, after: 15 },
          }),
        ],
        shading: { fill: COLORS.gutterBg, type: docx.ShadingType.SOLID },
        borders: noBorders(docx),
        width: { size: 7, type: docx.WidthType.PERCENTAGE },
        margins: { left: 60, right: 100, top: 15, bottom: 15 },
      });

      // Code cell (syntax highlighted tokens)
      const tokens = SyntaxHighlighter.tokenizeLine(codeStr, theme);
      const runs = tokens.map(tok => {
        return makeRun(docx, tok.text, {
          font:    FONTS.code,
          size:    SZ.code,
          color:   tok.color ? tok.color.replace('#', '') : '000000',
          italics: tok.italic || false,
        });
      });

      if (runs.length === 0) {
        runs.push(makeRun(docx, '', { font: FONTS.code, size: SZ.code }));
      }

      const codeCell = new docx.TableCell({
        children: [
          new docx.Paragraph({
            children: runs,
            spacing: { before: 15, after: 15 },
          }),
        ],
        shading: { fill: COLORS.panelBg, type: docx.ShadingType.SOLID },
        borders: noBorders(docx),
        width: { size: 93, type: docx.WidthType.PERCENTAGE },
        margins: { left: 120, right: 80, top: 15, bottom: 15 },
      });

      return new docx.TableRow({ children: [gutterCell, codeCell] });
    });

    const table = new docx.Table({
      width: { size: 100, type: docx.WidthType.PERCENTAGE },
      rows,
      borders: {
        top:     panelBorder,
        bottom:  panelBorder,
        left:    panelBorder,
        right:   panelBorder,
        insideH: { style: docx.BorderStyle.NONE },
        insideV: gutterBorder,
      },
    });

    return [table];
  }

  /**
   * Build output panel table (monospace, uncolored original text).
   */
  function buildOutputPanel(docx, outputSection) {
    if (!outputSection || !outputSection.outputLines || outputSection.outputLines.length === 0) {
      return [];
    }

    const panelBorder = { style: docx.BorderStyle.SINGLE, size: 1, color: COLORS.panelBorder };
    const gutterBorder = { style: docx.BorderStyle.SINGLE, size: 1, color: 'E2E8F0' };

    const rows = outputSection.outputLines.map((lineObj) => {
      const lineNumStr = lineObj.lineNum !== null ? String(lineObj.lineNum) : '';
      const textStr = lineObj.text || '';

      const gutterCell = new docx.TableCell({
        children: [
          new docx.Paragraph({
            alignment: docx.AlignmentType.RIGHT,
            children: [makeRun(docx, lineNumStr, {
              font: FONTS.code, size: SZ.gutter, color: COLORS.gutterText,
            })],
            spacing: { before: 15, after: 15 },
          }),
        ],
        shading: { fill: COLORS.gutterBg, type: docx.ShadingType.SOLID },
        borders: noBorders(docx),
        width: { size: 7, type: docx.WidthType.PERCENTAGE },
        margins: { left: 60, right: 100, top: 15, bottom: 15 },
      });

      const textCell = new docx.TableCell({
        children: [
          new docx.Paragraph({
            children: [makeRun(docx, textStr, {
              font: FONTS.code, size: SZ.output, color: COLORS.outputText,
            })],
            spacing: { before: 15, after: 15 },
          }),
        ],
        shading: { fill: COLORS.panelBg, type: docx.ShadingType.SOLID },
        borders: noBorders(docx),
        width: { size: 93, type: docx.WidthType.PERCENTAGE },
        margins: { left: 120, right: 80, top: 15, bottom: 15 },
      });

      return new docx.TableRow({ children: [gutterCell, textCell] });
    });

    const table = new docx.Table({
      width: { size: 100, type: docx.WidthType.PERCENTAGE },
      rows,
      borders: {
        top:     panelBorder,
        bottom:  panelBorder,
        left:    panelBorder,
        right:   panelBorder,
        insideH: { style: docx.BorderStyle.NONE },
        insideV: gutterBorder,
      },
    });

    return [table];
  }

  /**
   * Build the footer.
   */
  function buildFooter(docx, subject) {
    return new docx.Footer({
      children: [
        new docx.Table({
          width: { size: 100, type: docx.WidthType.PERCENTAGE },
          rows: [
            new docx.TableRow({
              children: [
                new docx.TableCell({
                  children: [
                    new docx.Paragraph({
                      children: [makeRun(docx, subject, {
                        font: FONTS.header, size: SZ.footer, color: COLORS.headerText, bold: true,
                      })],
                      spacing: { before: 60, after: 60 },
                    }),
                  ],
                  shading: { fill: COLORS.headerBg, type: docx.ShadingType.SOLID },
                  borders: noBorders(docx),
                  width: { size: 70, type: docx.WidthType.PERCENTAGE },
                  margins: { left: 160, right: 160, top: 60, bottom: 60 },
                }),
                new docx.TableCell({
                  children: [
                    new docx.Paragraph({
                      alignment: docx.AlignmentType.RIGHT,
                      children: [
                        makeRun(docx, 'PAGE ', { font: FONTS.header, size: SZ.footer, color: COLORS.headerText, bold: true }),
                        new docx.TextRun({
                          children: [docx.PageNumber.CURRENT],
                          font: FONTS.header,
                          size: SZ.footer,
                          color: COLORS.headerText,
                          bold: true,
                        }),
                        makeRun(docx, ' OF ', { font: FONTS.header, size: SZ.footer, color: COLORS.headerText, bold: true }),
                        new docx.TextRun({
                          children: [docx.PageNumber.TOTAL_PAGES],
                          font: FONTS.header,
                          size: SZ.footer,
                          color: COLORS.headerText,
                          bold: true,
                        }),
                      ],
                      spacing: { before: 60, after: 60 },
                    }),
                  ],
                  shading: { fill: COLORS.headerBg, type: docx.ShadingType.SOLID },
                  borders: noBorders(docx),
                  width: { size: 30, type: docx.WidthType.PERCENTAGE },
                  margins: { left: 160, right: 160, top: 60, bottom: 60 },
                }),
              ],
            }),
          ],
          borders: noBorders(docx),
        }),
      ],
    });
  }

  /**
   * Generate complete Word document.
   * @param {Array<Object>|Object} parsedDocs - parsed experiments
   * @param {string} theme - 'light' or 'dark'
   * @returns {Promise<Blob|Buffer>}
   */
  async function generate(parsedDocs, theme = 'light') {
    const docx = getDocx();
    const exps = Array.isArray(parsedDocs) ? parsedDocs : [parsedDocs];

    const wordSections = [];

    for (let i = 0; i < exps.length; i++) {
      const exp = exps[i];
      const children = [];

      // 1. Header bar
      children.push(buildHeaderTable(docx, exp.subject, exp.experimentNum));
      children.push(emptyPara(docx, 100, 100));

      // 2. Title
      if (exp.title) {
        children.push(new docx.Paragraph({
          children: [makeRun(docx, exp.title, {
            size: SZ.title, color: COLORS.titleText, bold: true,
          })],
          spacing: { before: 120, after: 120 },
        }));
      }

      // 3. Metadata box (NAME / ROLL NO.)
      if (exp.studentName || exp.rollNo) {
        children.push(buildMetaTable(docx, exp.studentName, exp.rollNo));
        children.push(emptyPara(docx, 100, 100));
      }

      // 4. Sections
      for (const sec of exp.sections) {
        children.push(emptyPara(docx, 120, 60));
        children.push(buildSectionBanner(docx, sec.num, sec.title || sec.type));
        children.push(emptyPara(docx, 60, 80));

        if (sec.type === 'QUESTION' && sec.questionText) {
          const lines = sec.questionText.split('\n');
          for (const line of lines) {
            children.push(new docx.Paragraph({
              children: [makeRun(docx, line, { size: SZ.body, color: COLORS.bodyText })],
              spacing: { before: 40, after: 40 },
              indent: { left: 180 },
            }));
          }
        } else if (sec.type === 'CODE') {
          const panel = buildCodePanel(docx, sec, theme);
          children.push(...panel);
        } else if (sec.type === 'OUTPUT') {
          const panel = buildOutputPanel(docx, sec);
          children.push(...panel);
        }
      }

      const isLast = i === exps.length - 1;
      const sectionProps = {
        page: {
          size: {
            width: 11906,  // A4 width in dxa (210mm)
            height: 16838, // A4 height in dxa (297mm)
            orientation: docx.PageOrientation.PORTRAIT,
          },
          margin: {
            top: 1410,    // ~1 inch (70.5 pt)
            bottom: 1410,
            left: 1418,   // ~1 inch (70.9 pt)
            right: 1418,
          },
        },
        footers: {
          default: buildFooter(docx, exp.subject),
        },
      };

      if (!isLast) {
        sectionProps.type = docx.SectionType.NEXT_PAGE;
      }

      wordSections.push({
        children,
        properties: sectionProps,
      });
    }

    const wordDoc = new docx.Document({
      sections: wordSections,
      styles: {
        default: {
          document: {
            run: { font: FONTS.body, size: SZ.body, color: COLORS.bodyText },
          },
        },
      },
    });

    return docx.Packer.toBlob(wordDoc);
  }

  return {
    generate,
  };
})();

window.DocxGenerator = DocxGenerator;
