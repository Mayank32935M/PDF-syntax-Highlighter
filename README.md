# PDF Syntax Highlighter
**Version 1.1 — Practical PDF to Highlighted PDF & Editable Word Document**

A desktop-first, fully offline HTML application that parses text-based practical lab PDF documents and converts them into:
1. **Highlighted PDF**: Exact vector layout and typography of the original PDF, with IDE-style Python syntax highlighting injected directly into the code sections.
2. **Editable Microsoft Word (`.docx`)**: Reconstructed document in native Word format with syntax-highlighted code panels, Consolas typography, styled metadata tables, and headers/footers.

Supports **VS Code Light+** (default) and **VS Code Dark+** syntax themes.

---

## Features

- **Direct Highlighted PDF Export (Exact Structure)**:
  - Preserves 100% of the original vector layout, header, footer, question description, student metadata, line numbers, and output runs.
  - Seamlessly blanks out monochrome code text and draws syntax-colored tokens at the exact baseline coordinates.
  - Powered by local `pdf-lib` without any server or external rendering service.
- **Editable Microsoft Word Export**:
  - Genuine `.docx` generation using `docx.js`.
  - Python code is real editable Word text with separate token runs, not rasterized screenshots.
  - Line numbers separated into a left gutter column.
- **Accurate Positional PDF Extraction**:
  - Uses PDF.js positional transform matrices to map exact text coordinates, font metrics, and section regions.
- **Syntax Highlighting Engine**:
  - Uses Highlight.js to tokenize Python keywords, built-in functions, function & class names, strings, comments, numbers, and identifiers.
  - Distinct colors applied *strictly* to code blocks; question text and outputs remain uncolored.
- **Complete Multi-Page Support**:
  - Correctly handles continuation pages (`EXPERIMENT ## · Q#...`) and multi-experiment practical manuals (e.g. 20-page document with 15 practicals).
- **100% Offline Capability**:
  - All libraries (`pdfjs-dist`, `highlight.js`, `docx.js`, `pdf-lib`, `FileSaver.js`) bundled locally in `vendor/`.
  - Zero backend, zero cloud calls, works offline in any modern browser.

---

## Quick Launch Instructions

1. Simply double-click **`index.html`** or open it in **Google Chrome**, **Microsoft Edge**, or any modern browser.
2. Drag and drop `e01-q1-roots-of-a-quadratic-equation.pdf` (or `PYTHONFILE.pdf`) into the upload zone, or click to browse.
3. The application parses the PDF, extracts all sections, and displays a live preview with highlighted Python code.
4. Choose your desired export format:
   - **Download Highlighted PDF**: Click **Download Highlighted PDF** to instantly download the PDF with the exact original structure and highlighted code.
   - **Word DOCX**: Click **Convert to DOCX**, then click **Download DOCX** for an editable Word document.

---

## Project Structure

```text
PDF syntax Highlighter/
├── index.html                                          # Main desktop application interface
├── README.md                                           # Documentation and launch instructions
├── bundle.mjs                                          # Vendor bundling script (esbuild)
├── e01-q1-roots-of-a-quadratic-equation.pdf            # One-page reference PDF fixture
├── e01-q1-roots-of-a-quadratic-equation_highlighted.pdf # Tested highlighted PDF output
├── e01-q1-roots-of-a-quadratic-equation_highlighted.docx # Tested Word output
├── PYTHONFILE.pdf                                      # Full 20-page practical lab manual
├── PYTHONFILE_highlighted.pdf                          # Tested full 20-page highlighted PDF
├── PYTHONFILE_highlighted.docx                         # Tested full 20-page Word output
├── css/
│   └── style.css                                       # Professional dark-panel stylesheet
├── js/
│   ├── pdf-parser.js                                   # PDF.js text & coordinate extraction
│   ├── section-detector.js                             # Section detection & indentation reconstruction
│   ├── syntax-highlighter.js                           # Highlight.js tokenization & VS Code color mapping
│   ├── docx-generator.js                               # Genuine docx.js document generation
│   ├── pdf-highlighter.js                              # Exact PDF structure syntax highlighter (pdf-lib)
│   └── app.js                                          # UI controller and state machine
├── vendor/
│   ├── pdfjs/                                          # PDF.js library & worker
│   ├── highlight/                                      # Highlight.js & default styling
│   ├── docx/                                           # docx.js UMD bundle
│   ├── pdflib/                                         # pdf-lib standalone bundle
│   └── filesaver/                                      # FileSaver.js bundle
├── tests/                                              # Test harness & verification scripts
└── assets/                                             # Static visual assets
```

---

## Technical Architecture

### 1. Highlighted PDF Export (`js/pdf-highlighter.js`)
- Loads the original PDF into `pdf-lib`.
- Identifies the exact bounds of each code line from positional extraction data ($x \ge 100$ pt, baseline $y$).
- Replaces the monochrome code text area with the exact background row color (`#F5F5F5` in Light+ mode or `#1E1E1E` in Dark+ mode) while leaving gutter line numbers ($x < 100$ pt) and borders untouched.
- Draws the syntax-highlighted tokens in place using standard monospaced `Courier` with the token's syntax highlighting RGB color.
- All non-code elements (subject headers, question titles, student metadata, question body text, output runs, page footers) are retained in their original vector form.

### 2. Positional PDF Parsing (`js/pdf-parser.js`)
Uses PDF.js with positional transform matrices (`transform = [scaleX, skewY, skewX, scaleY, tx, ty]`) to extract coordinates, font metrics, and string contents for every text element.

### 3. Section Detection & Indentation (`js/section-detector.js`)
- Identifies banners (`01 QUESTION`, `02 CODE`, `03 OUTPUT (RUN 1)`, `04 OUTPUT (RUN 2)`).
- Isolates line numbers into a gutter column so they never mix into the code.
- Calculates Python indentation based on horizontal offset ($x \approx 102.8$ pt baseline, $\approx 20.6$ pt per 4-space indent step).
- Preserves blank lines in code blocks with their line numbers.

### 4. DOCX Document Generation (`js/docx-generator.js`)
- Creates native OpenXML tables with shaded background cells:
  - Code panel: `#F8FAFC` background with a `#F0F2F5` line-number gutter and `#D1D5DB` outer borders.
  - Multi-run `docx.TextRun` instances for each token, rendered in monospaced `Consolas` at 9pt.
- Page setup configured for A4 (`11906 x 16838 dxa`) with 1-inch margins (`1418 dxa`).
- Adds dynamic page footers using Word's native `PageNumber.CURRENT` and `PageNumber.TOTAL_PAGES` fields.

---

## Validation Summary

| Validation Criteria | Status | Notes |
|---|---|---|
| **Exact PDF Structure Download** | **PASSED** | Code syntax highlighted directly on vector PDF |
| **DOCX Editable Export** | **PASSED** | Genuine Word document with syntax highlighting |
| **Question Wording** | **PASSED** | Verbatim text preserved |
| **Student Information** | **PASSED** | `Aayushi` & `26BC025` extracted |
| **Python Indentation** | **PASSED** | 4-space indent steps mathematically mapped |
| **Blank Lines** | **PASSED** | Empty code lines preserved with line numbers |
| **Outputs Unchanged** | **PASSED** | All output runs preserved without recoloring |
| **Multi-page Support** | **PASSED** | All 15 experiments on 20 pages converted |
| **Offline Execution** | **PASSED** | Self-contained local vendor bundles |
