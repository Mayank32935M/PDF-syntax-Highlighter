/**
 * app.js
 * Main UI Controller for PDF Syntax Highlighter.
 * Connects PDFParser, SectionDetector, SyntaxHighlighter, DocxGenerator, and PDFHighlighter.
 */

const App = (() => {

  // ── State ────────────────────────────────────────────────────────────────────
  let pdfRawBytes       = null;   // Master Uint8Array (never transferred or detached)
  let parsedPages       = [];
  let parsedExperiments = [];
  let currentTheme      = 'light';
  let pdfFilename       = '';
  let generatedDocxBlob = null;
  let generatedPdfBlob  = null;

  // ── DOM Elements ─────────────────────────────────────────────────────────────
  const $ = id => document.getElementById(id);

  function init() {
    setupDropZone();
    setupFileInput();
    setupThemeSelector();
    setupDownloadPdfButton();
    setupConvertButton();
    setupDownloadButton();
    updateUI('idle');
  }

  // ── Drag & Drop ──────────────────────────────────────────────────────────────
  function setupDropZone() {
    const zone = $('dropZone');
    if (!zone) return;

    ['dragenter', 'dragover'].forEach(eventName => {
      zone.addEventListener(eventName, e => {
        e.preventDefault();
        zone.classList.add('drag-over');
      });
    });

    ['dragleave', 'drop'].forEach(eventName => {
      zone.addEventListener(eventName, e => {
        e.preventDefault();
        zone.classList.remove('drag-over');
      });
    });

    zone.addEventListener('drop', e => {
      const files = e.dataTransfer.files;
      if (files && files.length > 0) {
        handleSelectedFile(files[0]);
      }
    });

    zone.addEventListener('click', () => $('fileInput').click());
  }

  function setupFileInput() {
    const input = $('fileInput');
    if (!input) return;
    input.addEventListener('change', e => {
      if (e.target.files && e.target.files.length > 0) {
        handleSelectedFile(e.target.files[0]);
      }
    });
  }

  // ── File Handling ─────────────────────────────────────────────────────────────
  function handleSelectedFile(file) {
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      showError('Please select a valid PDF practical document.');
      return;
    }

    clearError();
    pdfFilename = file.name;
    $('fileName').textContent = file.name;
    $('pageCount').textContent = 'Reading…';

    const baseName = file.name.replace(/\.pdf$/i, '');
    if ($('outputDocxFilename')) $('outputDocxFilename').value = baseName + '_highlighted.docx';
    if ($('outputPdfFilename')) $('outputPdfFilename').value = baseName + '_highlighted.pdf';

    generatedDocxBlob = null;
    generatedPdfBlob = null;

    updateUI('loading');
    setProgress(10, 'Reading file bytes…');

    const reader = new FileReader();
    reader.onload = async (e) => {
      // Store a persistent master copy in a Uint8Array
      pdfRawBytes = new Uint8Array(e.target.result);
      try {
        // Pass a fresh clone into processPdf so the master copy is NEVER detached!
        await processPdf(pdfRawBytes.slice());
      } catch (err) {
        console.error('Error processing PDF:', err);
        showError('Failed to parse PDF document: ' + (err.message || err));
        updateUI('idle');
      }
    };
    reader.onerror = () => {
      showError('Error reading the selected file from disk.');
      updateUI('idle');
    };
    reader.readAsArrayBuffer(file);
  }

  // ── PDF Processing & Section Detection ────────────────────────────────────────
  async function processPdf(arrayBuffer) {
    setProgress(20, 'Initializing PDF.js engine…');

    // 1. Positional extraction
    const parsedData = await PDFParser.parse(arrayBuffer, (curr, total, statusText) => {
      const pct = 20 + Math.round((curr / total) * 45);
      setProgress(pct, statusText);
    });

    parsedPages = parsedData.pages;
    $('pageCount').textContent = `${parsedData.numPages} page${parsedData.numPages !== 1 ? 's' : ''}`;

    // 2. Section detection
    setProgress(70, 'Analyzing layout, code blocks & sections…');
    parsedExperiments = SectionDetector.detectExperiments(parsedData.pages);

    if (!parsedExperiments || parsedExperiments.length === 0) {
      throw new Error('No practical experiments could be detected in this document.');
    }

    // 3. Render Preview
    setProgress(85, 'Tokenizing Python syntax & rendering preview…');
    renderPreview();

    setProgress(100, `Ready! Parsed ${parsedExperiments.length} experiment(s). Choose to download the highlighted PDF or DOCX.`);
    updateUI('ready');
  }

  // ── Live Document Preview ────────────────────────────────────────────────────
  function renderPreview() {
    const container = $('preview');
    if (!container) return;

    container.innerHTML = '';

    for (const exp of parsedExperiments) {
      const card = document.createElement('div');
      card.className = 'preview-card';

      // Header Bar
      const headerEl = document.createElement('div');
      headerEl.className = 'preview-header';
      const expNumStr = exp.experimentNum ? `EXPERIMENT ${String(exp.experimentNum).padStart(2, '0')}` : '';
      headerEl.innerHTML = `<span>${escapeHtml(exp.subject)}</span><span>${escapeHtml(expNumStr)}</span>`;
      card.appendChild(headerEl);

      // Title
      if (exp.title) {
        const titleEl = document.createElement('div');
        titleEl.className = 'preview-title';
        titleEl.textContent = exp.title;
        card.appendChild(titleEl);
      }

      // Metadata Table (NAME / ROLL NO.)
      if (exp.studentName || exp.rollNo) {
        const metaEl = document.createElement('div');
        metaEl.className = 'preview-meta';
        metaEl.innerHTML = `
          <span><strong>NAME</strong><br>${escapeHtml(exp.studentName || '—')}</span>
          <span><strong>ROLL NO.</strong><br>${escapeHtml(exp.rollNo || '—')}</span>
        `;
        card.appendChild(metaEl);
      }

      // Sections
      for (const sec of exp.sections) {
        // Section Banner
        const bannerEl = document.createElement('div');
        bannerEl.className = 'preview-section-heading';
        const numStr = String(sec.num).padStart(2, '0');
        bannerEl.innerHTML = `
          <span class="sec-num">${numStr}</span>
          <span class="sec-label">${escapeHtml(sec.title || sec.type)}</span>
        `;
        card.appendChild(bannerEl);

        if (sec.type === 'QUESTION' && sec.questionText) {
          const qEl = document.createElement('div');
          qEl.className = 'preview-question';
          qEl.textContent = sec.questionText;
          card.appendChild(qEl);
        } else if (sec.type === 'CODE' && sec.codeLines) {
          const panelEl = document.createElement('div');
          panelEl.className = 'preview-code-panel';
          const preEl = document.createElement('pre');
          preEl.className = 'preview-code';

          const codeStrings = sec.codeLines.map(l => l.code);
          preEl.innerHTML = SyntaxHighlighter.buildHighlightedHtml(codeStrings, currentTheme);

          panelEl.appendChild(preEl);
          card.appendChild(panelEl);
        } else if (sec.type === 'OUTPUT' && sec.outputLines) {
          const panelEl = document.createElement('div');
          panelEl.className = 'preview-output-panel';
          const preEl = document.createElement('pre');
          preEl.className = 'preview-output';

          const lines = sec.outputLines.map(l => {
            const ln = l.lineNum !== null ? String(l.lineNum).padStart(3, ' ') : '   ';
            return `<span class="ln" style="color:#888;display:inline-block;min-width:2.5em;margin-right:1em;user-select:none;">${ln}</span>  ${escapeHtml(l.text || '')}`;
          });
          preEl.innerHTML = lines.join('\n');

          panelEl.appendChild(preEl);
          card.appendChild(panelEl);
        }
      }

      container.appendChild(card);
    }
  }

  // ── Theme Selector ───────────────────────────────────────────────────────────
  function setupThemeSelector() {
    const sel = $('themeSelector');
    if (!sel) return;
    sel.addEventListener('change', e => {
      currentTheme = e.target.value;
      SyntaxHighlighter.setTheme(currentTheme);

      if (currentTheme === 'dark') {
        document.body.classList.add('theme-dark');
      } else {
        document.body.classList.remove('theme-dark');
      }

      if (parsedExperiments.length > 0) {
        renderPreview();
      }
    });
  }

  // ── Download Highlighted PDF (Exact Structure) ───────────────────────────────
  function setupDownloadPdfButton() {
    const btn = $('downloadPdfBtn');
    if (!btn) return;

    btn.addEventListener('click', async () => {
      if (!pdfRawBytes || parsedPages.length === 0) {
        showError('Please upload a PDF document first.');
        return;
      }

      clearError();
      const originalText = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = 'Generating PDF…';
      setProgress(50, 'Injecting syntax highlighting into original PDF structure…');

      try {
        await new Promise(r => setTimeout(r, 40)); // Yield to paint UI

        // Pass a fresh clone so pdfRawBytes stays attached and reusable
        generatedPdfBlob = await PDFHighlighter.generateHighlightedPdf(
          pdfRawBytes.slice(),
          parsedPages,
          parsedExperiments,
          currentTheme
        );

        const filename = ($('outputPdfFilename') && $('outputPdfFilename').value.trim()) ||
                         pdfFilename.replace(/\.pdf$/i, '') + '_highlighted.pdf';

        downloadFile(generatedPdfBlob, filename);
        setProgress(100, `Downloaded highlighted PDF: "${filename}"`);
      } catch (err) {
        console.error('PDF export error:', err);
        showError('Failed to generate highlighted PDF: ' + (err.message || err));
      } finally {
        btn.disabled = false;
        btn.innerHTML = originalText;
      }
    });
  }

  // ── Convert to DOCX ──────────────────────────────────────────────────────────
  function setupConvertButton() {
    const btn = $('convertBtn');
    if (!btn) return;
    btn.addEventListener('click', async () => {
      if (!parsedExperiments || parsedExperiments.length === 0) {
        showError('No parsed document available. Please upload a PDF first.');
        return;
      }

      clearError();
      updateUI('converting');
      setProgress(25, 'Constructing Word document model & tables…');

      try {
        await new Promise(r => setTimeout(r, 60)); // Yield to paint UI
        setProgress(50, 'Applying syntax token runs & Consolas styling…');

        generatedDocxBlob = await DocxGenerator.generate(parsedExperiments, currentTheme);

        setProgress(100, 'Word document generated successfully! Click "Download DOCX".');
        updateUI('done');
      } catch (err) {
        console.error('Conversion error:', err);
        showError('Word document generation failed: ' + (err.message || err));
        updateUI('ready');
      }
    });
  }

  // ── Download DOCX ────────────────────────────────────────────────────────────
  function setupDownloadButton() {
    const btn = $('downloadBtn');
    if (!btn) return;
    btn.addEventListener('click', () => {
      if (!generatedDocxBlob) {
        showError('Please click "Convert to DOCX" first before downloading.');
        return;
      }

      const filename = ($('outputDocxFilename') && $('outputDocxFilename').value.trim()) ||
                       pdfFilename.replace(/\.pdf$/i, '') + '_highlighted.docx';
      downloadFile(generatedDocxBlob, filename);
    });
  }

  /**
   * Browser-safe, offline-capable download helper.
   */
  function downloadFile(blob, filename) {
    if (typeof window.saveAs === 'function') {
      window.saveAs(blob, filename);
      return;
    }

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  // ── UI State Machine ─────────────────────────────────────────────────────────
  function updateUI(state) {
    const convertBtn     = $('convertBtn');
    const downloadBtn    = $('downloadBtn');
    const downloadPdfBtn = $('downloadPdfBtn');
    const previewSec     = $('previewSection');

    if (state === 'idle') {
      if (convertBtn) convertBtn.disabled = true;
      if (downloadBtn) downloadBtn.disabled = true;
      if (downloadPdfBtn) downloadPdfBtn.disabled = true;
    } else if (state === 'loading') {
      if (convertBtn) convertBtn.disabled = true;
      if (downloadBtn) downloadBtn.disabled = true;
      if (downloadPdfBtn) downloadPdfBtn.disabled = true;
    } else if (state === 'ready') {
      if (convertBtn) convertBtn.disabled = false;
      if (downloadBtn) downloadBtn.disabled = true;
      if (downloadPdfBtn) downloadPdfBtn.disabled = false; // Immediately available!
      if (previewSec) previewSec.style.display = '';
    } else if (state === 'converting') {
      if (convertBtn) convertBtn.disabled = true;
      if (downloadBtn) downloadBtn.disabled = true;
      if (downloadPdfBtn) downloadPdfBtn.disabled = true;
    } else if (state === 'done') {
      if (convertBtn) convertBtn.disabled = false;
      if (downloadBtn) downloadBtn.disabled = false;
      if (downloadPdfBtn) downloadPdfBtn.disabled = false;
    }
  }

  function setProgress(pct, label) {
    const bar = $('progressFill');
    const lbl = $('progressLabel');
    if (bar) bar.style.width = pct + '%';
    if (lbl) lbl.textContent = label || '';
  }

  function showError(msg) {
    const el = $('errorMsg');
    if (el) {
      el.textContent = msg;
      el.style.display = 'block';
    }
  }

  function clearError() {
    const el = $('errorMsg');
    if (el) {
      el.textContent = '';
      el.style.display = 'none';
    }
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  return { init };
})();

document.addEventListener('DOMContentLoaded', () => App.init());
