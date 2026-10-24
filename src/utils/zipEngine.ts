import JSZip from 'jszip';
import { ZipFileEntry, LoadedProject } from '../types/runner';

export function getMimeType(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase() || '';
  const mimeMap: Record<string, string> = {
    html: 'text/html; charset=utf-8',
    htm: 'text/html; charset=utf-8',
    css: 'text/css; charset=utf-8',
    js: 'text/javascript; charset=utf-8',
    mjs: 'text/javascript; charset=utf-8',
    cjs: 'text/javascript; charset=utf-8',
    json: 'application/json; charset=utf-8',
    svg: 'image/svg+xml',
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
    webp: 'image/webp',
    ico: 'image/x-icon',
    woff: 'font/woff',
    woff2: 'font/woff2',
    ttf: 'font/ttf',
    otf: 'font/otf',
    pdf: 'application/pdf',
    txt: 'text/plain; charset=utf-8',
    xml: 'application/xml; charset=utf-8',
    mp3: 'audio/mpeg',
    mp4: 'video/mp4',
    webm: 'video/webm',
    ogg: 'audio/ogg',
    wav: 'audio/wav',
    wasm: 'application/wasm',
    csv: 'text/csv; charset=utf-8',
  };
  return mimeMap[ext] || 'application/octet-stream';
}

/**
 * Finds entry point in ZIP matching Android MainActivity logic:
 * index.html -> default.html -> shallowest HTML
 */
export function findStartPage(entries: string[]): string {
  const htmlFiles = entries.filter((name) => {
    const ext = name.split('.').pop()?.toLowerCase() || '';
    return ext === 'html' || ext === 'htm';
  });

  if (htmlFiles.length === 0) {
    throw new Error('Tidak ditemukan file HTML (index.html, default.html, atau *.html) di dalam berkas/arsip.');
  }

  // 1. Check exact index.html
  const indexMatch = htmlFiles.find((f) => f.split('/').pop()?.toLowerCase() === 'index.html');
  if (indexMatch) return indexMatch;

  // 2. Check default.html
  const defaultMatch = htmlFiles.find((f) => f.split('/').pop()?.toLowerCase() === 'default.html');
  if (defaultMatch) return defaultMatch;

  // 3. Find shallowest HTML
  return htmlFiles.reduce((prev, curr) => {
    const prevSlashes = (prev.match(/\//g) || []).length;
    const currSlashes = (curr.match(/\//g) || []).length;
    return currSlashes < prevSlashes ? curr : prev;
  });
}

/**
 * Resolves a relative path against a base path
 */
export function resolveRelativePath(basePath: string, relativePath: string): string {
  if (
    relativePath.startsWith('/') ||
    relativePath.includes('://') ||
    relativePath.startsWith('data:') ||
    relativePath.startsWith('blob:') ||
    relativePath.startsWith('#')
  ) {
    return relativePath;
  }

  const baseParts = basePath.split('/');
  baseParts.pop(); // remove file name

  const relParts = relativePath.split('/');
  for (const part of relParts) {
    if (part === '.' || part === '') continue;
    if (part === '..') {
      if (baseParts.length > 0) baseParts.pop();
    } else {
      baseParts.push(part);
    }
  }
  return baseParts.join('/');
}

/**
 * Loads a standalone index.html (or any .html file) directly without requiring a pre-zipped archive.
 * It also automatically creates an in-memory virtual ZIP archive so it can be exported or run.
 */
export async function loadHtmlDirectly(
  fileOrText: File | Blob | string,
  fileName: string = 'index.html',
  options: { autoInjectDependencies?: boolean } = {}
): Promise<LoadedProject> {
  const htmlContent = typeof fileOrText === 'string'
    ? fileOrText
    : await fileOrText.text();

  const zip = new JSZip();
  zip.file('index.html', htmlContent);
  const rawZipBlob = await zip.generateAsync({ type: 'blob' });

  const entries = new Map<string, ZipFileEntry>();
  const urlMap: Record<string, string> = {};

  const processed = processHtmlContent(htmlContent, 'index.html', entries, urlMap, options);
  const blob = new Blob([processed], { type: 'text/html; charset=utf-8' });
  const indexUrl = URL.createObjectURL(blob);

  entries.set('index.html', {
    name: 'index.html',
    size: blob.size,
    compressedSize: blob.size,
    isDirectory: false,
    blob,
    url: indexUrl,
    mimeType: 'text/html; charset=utf-8',
  });

  return {
    fileName: fileName || 'index.html',
    fileSize: blob.size,
    entryCount: 1,
    startPage: 'index.html',
    entries,
    indexUrl,
    loadedAt: new Date(),
    rawZipBlob,
  };
}

/**
 * Loads a folder directory directly (from webkitdirectory input) containing index.html, CSS, JS, images, etc.
 */
export async function loadFolderDirectly(
  files: FileList | File[],
  options: { autoInjectDependencies?: boolean } = {}
): Promise<LoadedProject> {
  const fileArray = Array.from(files);
  const zip = new JSZip();
  const entries = new Map<string, ZipFileEntry>();
  const fileNames: string[] = [];
  let totalSize = 0;

  for (const file of fileArray) {
    const relPath = (file as unknown as { webkitRelativePath?: string }).webkitRelativePath || file.name;
    const parts = relPath.replace(/\\/g, '/').split('/');
    const cleanPath = parts.length > 1 ? parts.slice(1).join('/') : relPath;
    if (!cleanPath) continue;

    const blob = file;
    totalSize += file.size;
    zip.file(cleanPath, blob);

    entries.set(cleanPath, {
      name: cleanPath,
      size: file.size,
      compressedSize: file.size,
      isDirectory: false,
      blob,
      mimeType: getMimeType(cleanPath),
    });
    fileNames.push(cleanPath);
  }

  if (fileNames.length === 0) {
    throw new Error('Tidak ada berkas valid yang ditemukan di dalam folder.');
  }

  const startPage = findStartPage(fileNames);

  for (const [path, entry] of entries.entries()) {
    if (entry.blob && !path.endsWith('.html') && !path.endsWith('.htm')) {
      entry.url = URL.createObjectURL(entry.blob);
    }
  }

  const urlMap: Record<string, string> = {};
  for (const [path, entry] of entries.entries()) {
    if (entry.url) urlMap[path] = entry.url;
  }

  for (const [path, entry] of entries.entries()) {
    if (path.endsWith('.html') || path.endsWith('.htm')) {
      const text = await entry.blob!.text();
      const processedHtml = processHtmlContent(text, path, entries, urlMap, options);
      const newBlob = new Blob([processedHtml], { type: 'text/html; charset=utf-8' });
      entry.blob = newBlob;
      entry.url = URL.createObjectURL(newBlob);
    }
  }

  const rawZipBlob = await zip.generateAsync({ type: 'blob' });
  const startEntry = entries.get(startPage);

  return {
    fileName: `Folder Proyek (${fileNames.length} berkas)`,
    fileSize: totalSize,
    entryCount: entries.size,
    startPage,
    entries,
    indexUrl: startEntry!.url!,
    loadedAt: new Date(),
    rawZipBlob,
  };
}

/**
 * Process a ZIP file into an interactive LoadedProject
 */
export async function loadZipProject(
  fileOrBlob: File | Blob,
  fileName: string,
  options: { autoInjectDependencies?: boolean } = {}
): Promise<LoadedProject> {
  const zip = new JSZip();
  const zipContent = await zip.loadAsync(fileOrBlob);

  const entries = new Map<string, ZipFileEntry>();
  const fileNames: string[] = [];

  // 1. Collect all non-directory files
  for (const [rawPath, zipEntry] of Object.entries(zipContent.files)) {
    const normalized = rawPath.replace(/\\/g, '/').replace(/^\/+/, '');
    if (!normalized || zipEntry.dir) continue;

    // Security check: reject malicious traversal
    if (normalized.split('/').some((part) => part === '..')) {
      throw new Error(`Entri tidak aman di dalam ZIP ditolak: ${normalized}`);
    }

    const mimeType = getMimeType(normalized);
    const blob = await zipEntry.async('blob');

    entries.set(normalized, {
      name: normalized,
      size: blob.size,
      compressedSize: (zipEntry as unknown as { _data?: { compressedSize?: number } })._data?.compressedSize || blob.size,
      isDirectory: false,
      blob,
      mimeType,
    });
    fileNames.push(normalized);
  }

  if (fileNames.length === 0) {
    throw new Error('Arsip ZIP kosong atau tidak berisi file valid.');
  }

  // 2. Determine start page (index.html prioritized)
  const startPage = findStartPage(fileNames);

  // 3. Generate Blob URLs for all static assets (images, css, js, fonts, etc.)
  for (const [path, entry] of entries.entries()) {
    if (entry.blob && !path.endsWith('.html') && !path.endsWith('.htm')) {
      entry.url = URL.createObjectURL(entry.blob);
    }
  }

  // Create path-to-blob-url mapping for client-side fetch interception
  const urlMap: Record<string, string> = {};
  for (const [path, entry] of entries.entries()) {
    if (entry.url) {
      urlMap[path] = entry.url;
    }
  }

  // 4. Preprocess HTML files to rewire relative links & inject full localhost bridge
  for (const [path, entry] of entries.entries()) {
    if (path.endsWith('.html') || path.endsWith('.htm')) {
      const text = await entry.blob!.text();
      const processedHtml = processHtmlContent(text, path, entries, urlMap, options);
      const newBlob = new Blob([processedHtml], { type: 'text/html; charset=utf-8' });
      entry.blob = newBlob;
      entry.url = URL.createObjectURL(newBlob);
    }
  }

  const startEntry = entries.get(startPage);
  if (!startEntry?.url) {
    throw new Error(`Gagal menyiapkan URL untuk halaman awal: ${startPage}`);
  }

  return {
    fileName,
    fileSize: fileOrBlob.size,
    entryCount: entries.size,
    startPage,
    entries,
    indexUrl: startEntry.url,
    loadedAt: new Date(),
    rawZipBlob: fileOrBlob,
  };
}

/**
 * Rewrites relative paths in HTML and injects the ZipRunnerBridge and full localhost emulation
 */
function processHtmlContent(
  html: string,
  currentPath: string,
  entries: Map<string, ZipFileEntry>,
  urlMap: Record<string, string>,
  options: { autoInjectDependencies?: boolean }
): string {
  let modified = html;

  // Replace relative URLs in src, href, and url()
  modified = modified.replace(/(href|src)=["']([^"']+)["']/gi, (match, attr, url) => {
    if (
      url.startsWith('#') ||
      url.startsWith('http://') ||
      url.startsWith('https://') ||
      url.startsWith('data:') ||
      url.startsWith('blob:') ||
      url.startsWith('mailto:') ||
      url.startsWith('javascript:')
    ) {
      return match;
    }

    const resolved = resolveRelativePath(currentPath, url);
    const targetEntry = entries.get(resolved);
    if (targetEntry?.url) {
      return `${attr}="${targetEntry.url}"`;
    }
    return match;
  });

  // Inject ZipRunnerBridge script right after <head> or at top
  const bridgeScript = `
  <script>
  (function() {
    if (window.__zipRunnerBridgeInjected) return;
    window.__zipRunnerBridgeInjected = true;

    var virtualMap = ${JSON.stringify(urlMap)};

    // 1. Console Log Interception for DevTools Inspector
    var origLog = console.log;
    var origWarn = console.warn;
    var origError = console.error;
    var origInfo = console.info;

    function sendLog(level, args) {
      try {
        var str = Array.prototype.slice.call(args).map(function(item) {
          if (typeof item === 'object') {
            try { return JSON.stringify(item); } catch(e) { return String(item); }
          }
          return String(item);
        }).join(' ');

        window.parent.postMessage({
          type: 'ZIP_RUNNER_LOG',
          level: level,
          message: str,
          timestamp: new Date().toLocaleTimeString()
        }, '*');
      } catch(e) {}
    }

    console.log = function() { origLog.apply(console, arguments); sendLog('log', arguments); };
    console.info = function() { origInfo.apply(console, arguments); sendLog('info', arguments); };
    console.warn = function() { origWarn.apply(console, arguments); sendLog('warn', arguments); };
    console.error = function() { origError.apply(console, arguments); sendLog('error', arguments); };

    // 2. Fetch Interceptor: Resolves relative paths to in-memory Blob URLs or returns mock 200 JSON
    var origFetch = window.fetch;
    window.fetch = function(input, init) {
      var url = typeof input === 'string' ? input : (input && input.url ? input.url : '');
      if (url && !url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('blob:') && !url.startsWith('data:')) {
        var cleaned = url.replace(/^\\.\\//, '').replace(/^\\//, '');
        if (virtualMap[cleaned]) {
          return origFetch(virtualMap[cleaned], init);
        }
        if (cleaned.startsWith('api/') || (init && init.method && init.method !== 'GET')) {
          console.log('[LocalServer Mock] Responded to local API fetch:', url);
          return Promise.resolve(new Response(JSON.stringify({ status: 'ok', mock: true, url: url }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          }));
        }
      }
      return origFetch.apply(window, arguments);
    };

    // 3. ZipRunnerBridge Implementation
    window.ZipRunnerBridge = {
      printPage: function(pageUrl, html) {
        window.parent.postMessage({
          type: 'ZIP_RUNNER_PRINT',
          pageUrl: pageUrl || window.location.href,
          html: html || ('<!doctype html>' + document.documentElement.outerHTML)
        }, '*');
      },
      savePdf: function(fileName, htmlOrBase64) {
        window.parent.postMessage({
          type: 'ZIP_RUNNER_SAVE_PDF',
          fileName: fileName || ('Laporan_' + Date.now() + '.pdf'),
          content: htmlOrBase64 || ('<!doctype html>' + document.documentElement.outerHTML)
        }, '*');
      },
      saveBase64: function(fileName, mimeType, data) {
        window.parent.postMessage({
          type: 'ZIP_RUNNER_SAVE_BASE64',
          fileName: fileName || 'unduhan',
          mimeType: mimeType || 'application/octet-stream',
          data: data
        }, '*');
      }
    };

    // 4. Hook window.print()
    window.print = function() {
      try {
        var html = '<!doctype html>' + document.documentElement.outerHTML;
        window.ZipRunnerBridge.printPage(String(window.location.href), html);
      } catch (e) {
        console.error('Print request failed', e);
      }
    };

    // 5. Direct PDF export shortcut
    window.exportPdf = function(name) {
      window.ZipRunnerBridge.savePdf(name || ('Laporan_' + Date.now() + '.pdf'));
    };

    // 6. Intercept download links
    document.addEventListener('click', function(ev) {
      var a = ev.target && ev.target.closest ? ev.target.closest('a[download]') : null;
      if (!a) return;
      var href = a.href || '';
      var downloadName = a.download || 'unduhan';

      if (href.indexOf('blob:') === 0 || href.indexOf('data:') === 0) {
        ev.preventDefault();
        window.fetch(href).then(function(r) { return r.blob(); }).then(function(blob) {
          var reader = new FileReader();
          reader.onloadend = function() {
            var res = String(reader.result || '');
            var data = res.split(',')[1] || '';
            var mime = blob.type || (downloadName.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'application/octet-stream');
            window.ZipRunnerBridge.saveBase64(downloadName, mime, data);
          };
          reader.readAsDataURL(blob);
        }).catch(function(e) {
          console.error('Download gagal', e);
        });
      }
    }, true);

    // 7. Hook child iframes
    function hookIframes() {
      try {
        var frames = document.querySelectorAll('iframe');
        frames.forEach(function(f) {
          try {
            if (f.contentWindow && !f.contentWindow.__zipRunnerBridgeInjected) {
              f.contentWindow.ZipRunnerBridge = window.ZipRunnerBridge;
              f.contentWindow.print = window.print;
              f.contentWindow.exportPdf = window.exportPdf;
              f.contentWindow.__zipRunnerBridgeInjected = true;
            }
          } catch(e) {}
        });
      } catch(e) {}
    }
    hookIframes();
    document.addEventListener('load', hookIframes, true);
    window.addEventListener('DOMContentLoaded', hookIframes);
  })();
  </script>
  `;

  let extraHeadTags = '';
  if (options.autoInjectDependencies) {
    extraHeadTags += `
      <!-- Auto-Injected Dependencies (Bootstrap Icons Fallback) -->
      <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css">
    `;
  }

  if (modified.includes('<head>')) {
    modified = modified.replace('<head>', `<head>${bridgeScript}${extraHeadTags}`);
  } else if (modified.includes('<html>')) {
    modified = modified.replace('<html>', `<html><head>${bridgeScript}${extraHeadTags}</head>`);
  } else {
    modified = `${bridgeScript}${extraHeadTags}${modified}`;
  }

  return modified;
}
