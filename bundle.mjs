/**
 * bundle.mjs
 * Bundles all vendor libraries from node_modules into the vendor/ directory
 * as browser-compatible standalone IIFE files with zero external dependencies.
 * 
 * Run: node bundle.mjs
 */

import { build } from 'esbuild';
import { copyFileSync, mkdirSync, existsSync, readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = __dirname;
const nm   = join(root, 'node_modules');
const v    = join(root, 'vendor');

function ensureDir(dir) {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

ensureDir(join(v, 'pdfjs'));
ensureDir(join(v, 'highlight', 'styles'));
ensureDir(join(v, 'highlight', 'languages'));
ensureDir(join(v, 'docx'));
ensureDir(join(v, 'filesaver'));
ensureDir(join(v, 'pdflib'));

console.log('Bundling vendor libraries...\n');

// ── 1. PDF.js (Legacy build for maximum compatibility across environments) ───
console.log('  pdfjs-dist legacy worker...');
await build({
  entryPoints: [join(nm, 'pdfjs-dist', 'legacy', 'build', 'pdf.worker.min.mjs')],
  bundle: true,
  format: 'iife',
  globalName: 'pdfjsWorker',
  outfile: join(v, 'pdfjs', 'pdf.worker.min.js'),
  minify: false,
  platform: 'browser',
  conditions: ['browser'],
  logLevel: 'warning',
});
const workerContent = readFileSync(join(v, 'pdfjs', 'pdf.worker.min.js'), 'utf8');
writeFileSync(join(v, 'pdfjs', 'pdf.worker.min.js'),
  `(function(){\n${workerContent}\n` +
  `if (typeof window !== "undefined") { window.pdfjsWorker = pdfjsWorker; }\n` +
  `if (typeof globalThis !== "undefined") { globalThis.pdfjsWorker = pdfjsWorker; }\n` +
  `})();\n`
);
console.log('    ✓ pdfjs/pdf.worker.min.js');

console.log('  pdfjs-dist legacy main...');
await build({
  entryPoints: [join(nm, 'pdfjs-dist', 'legacy', 'build', 'pdf.min.mjs')],
  bundle: true,
  format: 'iife',
  globalName: 'pdfjsLib_internal',
  outfile: join(v, 'pdfjs', 'pdf.min.js'),
  minify: false,
  platform: 'browser',
  conditions: ['browser'],
  logLevel: 'warning',
});

const pdfjsContent = readFileSync(join(v, 'pdfjs', 'pdf.min.js'), 'utf8');
writeFileSync(join(v, 'pdfjs', 'pdf.min.js'),
  `(function(){\n${pdfjsContent}\n` +
  `if (typeof window !== "undefined") {\n` +
  `  window['pdfjs-dist/build/pdf'] = pdfjsLib_internal;\n` +
  `  window.pdfjsLib = pdfjsLib_internal;\n` +
  `}\n` +
  `if (typeof globalThis !== "undefined") {\n` +
  `  globalThis['pdfjs-dist/build/pdf'] = pdfjsLib_internal;\n` +
  `  globalThis.pdfjsLib = pdfjsLib_internal;\n` +
  `}\n` +
  `})();\n`
);
console.log('    ✓ pdfjs/pdf.min.js');

// ── 2. Highlight.js ─────────────────────────────────────────────────────────
console.log('  highlight.js...');
await build({
  entryPoints: [join(nm, 'highlight.js', 'lib', 'index.js')],
  bundle: true,
  format: 'iife',
  globalName: 'hljs_internal',
  outfile: join(v, 'highlight', 'highlight.min.js'),
  minify: true,
  platform: 'browser',
  logLevel: 'warning',
});
const hljsContent = readFileSync(join(v, 'highlight', 'highlight.min.js'), 'utf8');
writeFileSync(join(v, 'highlight', 'highlight.min.js'),
  `(function(){\n${hljsContent}\n` +
  `if (typeof window !== "undefined") { window.hljs = hljs_internal; }\n` +
  `if (typeof globalThis !== "undefined") { globalThis.hljs = hljs_internal; }\n` +
  `})();\n`
);
console.log('    ✓ highlight/highlight.min.js');

copyFileSync(
  join(nm, 'highlight.js', 'styles', 'default.min.css'),
  join(v, 'highlight', 'styles', 'default.min.css')
);
console.log('    ✓ highlight/styles/default.min.css');

// ── 3. docx.js ──────────────────────────────────────────────────────────────
console.log('  docx...');
const docxRaw = readFileSync(join(nm, 'docx', 'dist', 'index.iife.js'), 'utf8');
writeFileSync(join(v, 'docx', 'docx.umd.min.js'),
  `(function(){\n${docxRaw}\n` +
  `if (typeof window !== "undefined") { window.docx = docx; }\n` +
  `if (typeof globalThis !== "undefined") { globalThis.docx = docx; }\n` +
  `})();\n`
);
console.log('    ✓ docx/docx.umd.min.js');

// ── 4. FileSaver.js ──────────────────────────────────────────────────────────
console.log('  file-saver...');
const fileSaverRaw = readFileSync(join(nm, 'file-saver', 'dist', 'FileSaver.min.js'), 'utf8');
writeFileSync(join(v, 'filesaver', 'FileSaver.min.js'),
  `(function(){\n${fileSaverRaw}\n` +
  `})();\n`
);
console.log('    ✓ filesaver/FileSaver.min.js');

// ── 5. pdf-lib ──────────────────────────────────────────────────────────────
console.log('  pdf-lib...');
const pdfLibRaw = readFileSync(join(nm, 'pdf-lib', 'dist', 'pdf-lib.min.js'), 'utf8');
writeFileSync(join(v, 'pdflib', 'pdf-lib.min.js'),
  `(function(){\n${pdfLibRaw}\n` +
  `if (typeof window !== "undefined") { window.PDFLib = window.PDFLib || PDFLib; }\n` +
  `if (typeof globalThis !== "undefined") { globalThis.PDFLib = globalThis.PDFLib || PDFLib; }\n` +
  `})();\n`
);
console.log('    ✓ pdflib/pdf-lib.min.js');

console.log('\n✅ All vendor libraries bundled successfully!\n');
