import React, { useState, useEffect, useRef } from 'react';
import {
  FileArchive,
  Upload,
  Play,
  Terminal,
  Printer,
  Sparkles,
  Download,
  FolderOpen,
  CheckCircle,
  AlertCircle,
  HelpCircle,
  Layers,
  ArrowRight,
  ShieldCheck,
  Maximize2,
  FileCode,
  Code
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { LoadedProject, PhoneSettings } from './types/runner';
import { loadZipProject, loadHtmlDirectly, loadFolderDirectly } from './utils/zipEngine';
import { PhoneSimulator } from './components/PhoneSimulator';
import { AutomationScriptsModal } from './components/AutomationScriptsModal';
import { FileSystemDrawer } from './components/FileSystemDrawer';
import { PdfExportModal } from './components/PdfExportModal';
import { WebViewInspector, ConsoleLogItem } from './components/WebViewInspector';
import { HtmlEditorModal } from './components/HtmlEditorModal';

export default function App() {
  const [project, setProject] = useState<LoadedProject | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [toastMsg, setToastMsg] = useState<{ title: string; desc: string; type: 'info' | 'success' | 'print' } | null>(null);
  const [logs, setLogs] = useState<ConsoleLogItem[]>([]);

  // Modals state
  const [isAutomationOpen, setIsAutomationOpen] = useState<boolean>(false);
  const [isFilesDrawerOpen, setIsFilesDrawerOpen] = useState<boolean>(false);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState<boolean>(false);
  const [isHtmlEditorOpen, setIsHtmlEditorOpen] = useState<boolean>(false);
  const [capturedHtml, setCapturedHtml] = useState<string | undefined>(undefined);

  // Phone settings
  const [settings, setSettings] = useState<PhoneSettings>({
    deviceType: 'android-flagship',
    isLandscape: false,
    immersiveMode: true, // Default to true as requested!
    showDeviceFrame: true,
    autoFullscreenOnZip: true,
    autoInjectDependencies: true,
    networkOffline: false,
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  // Listen for messages from inside the iframe (ZipRunnerBridge & Console emulation)
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const data = event.data;
      if (!data || typeof data !== 'object') return;

      if (data.type === 'ZIP_RUNNER_LOG') {
        const newLog: ConsoleLogItem = {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          level: data.level || 'log',
          message: data.message || '',
          timestamp: data.timestamp || new Date().toLocaleTimeString(),
        };
        setLogs((prev) => [newLog, ...prev.slice(0, 99)]);
      } else if (data.type === 'ZIP_RUNNER_PRINT') {
        setCapturedHtml(data.html);
        setIsPdfModalOpen(true);
        showToast('🖨️ Permintaan Cetak Diterima', 'Membuka dialog cetak & ekspor PDF laporan...', 'print');
      } else if (data.type === 'ZIP_RUNNER_SAVE_PDF') {
        setCapturedHtml(data.content);
        setIsPdfModalOpen(true);
        showToast('📥 Ekspor PDF Langsung', `Menyiapkan berkas: ${data.fileName}`, 'success');
      } else if (data.type === 'ZIP_RUNNER_SAVE_BASE64') {
        handleSaveBase64(data.fileName, data.mimeType, data.data);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const showToast = (title: string, desc: string, type: 'info' | 'success' | 'print' = 'info') => {
    setToastMsg({ title, desc, type });
    setTimeout(() => setToastMsg(null), 4000);
  };

  const handleSaveBase64 = (fileName: string, mimeType: string, base64Data: string) => {
    try {
      const cleanData = (base64Data || '').replace(/\s/g, '');
      const byteChars = atob(cleanData);
      const byteNumbers = new Array(byteChars.length);
      for (let i = 0; i < byteChars.length; i++) {
        byteNumbers[i] = byteChars.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: mimeType });
      const url = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      showToast('✅ Berkas Berhasil Disimpan', `Tersimpan ke folder Download: ${fileName}`, 'success');
      confetti({ particleCount: 35, spread: 60, origin: { y: 0.85 } });
    } catch (e) {
      console.error('Save base64 error', e);
      showToast('❌ Gagal Menyimpan Berkas', 'Data format tidak valid', 'info');
    }
  };

  // Handles either a .zip or a single .html / .htm file
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const lowerName = file.name.toLowerCase();
    if (lowerName.endsWith('.html') || lowerName.endsWith('.htm')) {
      await processDirectHtml(file, file.name);
    } else {
      await processZip(file, file.name);
    }
    // reset input so same file can be re-selected if needed
    e.target.value = '';
  };

  // Handles a folder directory containing index.html, styles, scripts
  const handleFolderSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      const loaded = await loadFolderDirectly(files, {
        autoInjectDependencies: settings.autoInjectDependencies,
      });
      setProject(loaded);
      setSettings((prev) => ({ ...prev, immersiveMode: true }));
      showToast('⚡ Folder Berhasil Dimuat!', `Menjalankan: ${loaded.startPage} (${loaded.entryCount} berkas)`, 'success');
      confetti({ particleCount: 50, spread: 70, origin: { y: 0.6 } });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal memproses folder';
      setErrorMsg(msg);
      showToast('❌ Gagal Membuka Folder', msg, 'info');
    } finally {
      setLoading(false);
      e.target.value = '';
    }
  };

  // Run index.html directly from file or raw text
  const processDirectHtml = async (fileOrText: File | string, name: string = 'index.html') => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const loaded = await loadHtmlDirectly(fileOrText, name, {
        autoInjectDependencies: settings.autoInjectDependencies,
      });
      setProject(loaded);
      setSettings((prev) => ({ ...prev, immersiveMode: true }));
      showToast('🚀 index.html Langsung Jalan!', `Menjalankan: ${name} (100% Native Web Mode)`, 'success');
      confetti({ particleCount: 50, spread: 70, origin: { y: 0.6 } });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal menjalankan file HTML';
      setErrorMsg(msg);
      showToast('❌ Gagal Menjalankan HTML', msg, 'info');
    } finally {
      setLoading(false);
    }
  };

  const processZip = async (blobOrFile: Blob | File, name: string) => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const loaded = await loadZipProject(blobOrFile, name, {
        autoInjectDependencies: settings.autoInjectDependencies,
      });
      setProject(loaded);

      // Immediately run in immersive mode
      setSettings((prev) => ({ ...prev, immersiveMode: true }));

      showToast('⚡ ZIP Berhasil Dimuat!', `Menjalankan: ${loaded.startPage} (${loaded.entryCount} berkas)`, 'success');
      confetti({ particleCount: 50, spread: 70, origin: { y: 0.6 } });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal memproses arsip ZIP';
      setErrorMsg(msg);
      showToast('❌ Gagal Membuka ZIP', msg, 'info');
    } finally {
      setLoading(false);
    }
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };
  const handleDragLeave = () => setIsDragging(false);
  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      const lower = file.name.toLowerCase();
      if (lower.endsWith('.html') || lower.endsWith('.htm')) {
        await processDirectHtml(file, file.name);
      } else if (lower.endsWith('.zip') || file.type.includes('zip') || file.type === 'application/octet-stream') {
        await processZip(file, file.name);
      } else {
        showToast('⚠️ Berkas Ditolak', 'Pilih berkas berekstensi .zip, .html, atau folder proyek.', 'info');
      }
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className="min-h-screen bg-[#080b11] text-slate-100 flex flex-col selection:bg-indigo-500/30 selection:text-indigo-200 relative overflow-x-hidden"
    >
      {/* Subtle atmospheric ambient glow */}
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(ellipse_80%_50%_at_50%_-15%,rgba(99,102,241,0.08),transparent)]" />

      {/* Hidden file input for ZIP or HTML */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".zip,.html,.htm,application/zip,application/x-zip-compressed,text/html,application/xhtml+xml,application/octet-stream"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Hidden file input for Directory / Folder */}
      <input
        ref={folderInputRef}
        type="file"
        // @ts-expect-error webkitdirectory is standard in modern browsers
        webkitdirectory=""
        directory=""
        multiple
        onChange={handleFolderSelect}
        className="hidden"
      />

      {/* Top Main Navigation Bar */}
      <header className="sticky top-0 z-40 bg-[#0b0f19]/80 backdrop-blur-xl border-b border-white/[0.07] px-3 sm:px-6 py-2.5 sm:py-3.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 sm:gap-4">
          {/* Logo & Brand */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-indigo-500/20 via-violet-500/15 to-purple-500/10 border border-white/[0.12] flex items-center justify-center shadow-[0_0_24px_rgba(99,102,241,0.18)] shrink-0">
              <Sparkles className="w-5 h-5 text-indigo-300" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="font-bold text-white tracking-tight text-xs sm:text-base truncate max-w-[170px] sm:max-w-none">
                  ZIP-to-WebView Runner Pro
                </span>
                <span className="text-[9px] sm:text-[10px] font-semibold text-emerald-300/90 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full shrink-0">
                  PRODUKSI
                </span>
              </div>
              <p className="text-[10px] sm:text-[11px] text-slate-400 hidden md:block">
                Jalankan index.html & ZIP Langsung di Layar HP Immersive • Cetak & Unduh PDF
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Direct Run File Button (ZIP or HTML) */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-3 sm:px-3.5 py-2 bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-400 hover:to-indigo-500 text-white rounded-xl text-xs font-semibold shadow-[0_4px_16px_rgba(99,102,241,0.35)] border border-indigo-400/30 transition-all duration-200 flex items-center gap-1.5 shrink-0 active:scale-98 cursor-pointer"
              title="Pilih berkas ZIP atau berkas index.html untuk langsung dijalankan"
            >
              <Upload className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden sm:inline">Jalankan index.html / ZIP</span>
              <span className="sm:hidden">Pilih File</span>
            </button>

            {/* Folder Picker */}
            <button
              onClick={() => folderInputRef.current?.click()}
              className="px-3 py-2 bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 hover:text-white rounded-xl text-xs font-medium border border-white/[0.08] transition-all duration-200 hidden sm:flex items-center gap-1.5 shrink-0 active:scale-98 cursor-pointer"
              title="Buka satu folder proyek web yang berisi index.html, style.css, js, dll."
            >
              <FolderOpen className="w-3.5 h-3.5 text-sky-400 shrink-0" />
              <span>Buka Folder</span>
            </button>

            {/* Paste HTML Code Button */}
            <button
              onClick={() => setIsHtmlEditorOpen(true)}
              className="px-2.5 sm:px-3 py-2 bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 hover:text-white rounded-xl text-xs font-medium border border-white/[0.08] transition-all duration-200 flex items-center gap-1.5 shrink-0 active:scale-98 cursor-pointer"
              title="Tempelkan kode HTML langsung untuk diuji di layar HP"
            >
              <Code className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className="hidden xs:inline">Tempel Kode</span>
            </button>

            {/* Automation Scripts Modal Button */}
            <button
              onClick={() => setIsAutomationOpen(true)}
              className="px-2.5 sm:px-3 py-2 bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 hover:text-white rounded-xl text-xs font-medium border border-white/[0.08] transition-all duration-200 flex items-center gap-1.5 shrink-0 active:scale-98 cursor-pointer"
              title="Lihat & Salin Skrip Otomasi Dependensi Android (SDK 35, Build-tools, Wrapper)"
            >
              <Terminal className="w-3.5 h-3.5 text-indigo-300 shrink-0" />
              <span className="hidden lg:inline">Skrip Otomasi</span>
              <span className="lg:hidden">Skrip</span>
            </button>

            {/* Direct Android ZIP Download */}
            <a
              href="/assets/ZIP-to-WebView-Runner-v0.5.0-PRO-PENGGILAS.zip"
              download="ZIP-to-WebView-Runner-v0.5.0-PRO-PENGGILAS.zip"
              className="px-3 py-2 bg-emerald-500/10 hover:bg-emerald-500/15 text-emerald-300 rounded-xl text-xs font-medium border border-emerald-500/25 transition-all duration-200 hidden xl:flex items-center gap-1.5 shrink-0 cursor-pointer"
              title="Unduh Source Code Android Kotlin Terbaru yang sudah di-upgrade"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Unduh Android ZIP</span>
            </a>
          </div>
        </div>
      </header>

      {/* Production Workspace Status Bar */}
      <div className="bg-[#0e121d]/75 backdrop-blur-md border-b border-white/[0.05] px-3 sm:px-6 py-2.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between flex-wrap gap-2 text-xs">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${project ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'}`}></span>
            <span className="text-slate-300 font-medium text-[11px] sm:text-xs">
              {project ? (
                <>
                  Aktif: <strong className="text-white">{project.fileName}</strong> • Halaman Utama: <code className="text-indigo-300 font-mono">{project.startPage}</code> ({project.entryCount} berkas)
                </>
              ) : (
                'Engine Produksi Siap: Menunggu input berkas ZIP atau index.html'
              )}
            </span>
          </div>

          <div className="flex items-center gap-3 text-slate-400 text-[11px]">
            {project && (
              <button
                onClick={() => setProject(null)}
                className="px-2 py-0.5 bg-white/[0.05] hover:bg-white/[0.1] text-slate-300 hover:text-white rounded-md text-[10px] transition border border-white/[0.08] cursor-pointer"
                title="Tutup proyek dan kembali ke layar awal"
              >
                Tutup Proyek
              </button>
            )}
            <span className="flex items-center gap-1.5 text-emerald-400/90 font-medium">
              <ShieldCheck className="w-3.5 h-3.5 shrink-0 text-emerald-400" />
              Loopback 127.0.0.1:8080 • Immersive Fullscreen
            </span>
          </div>
        </div>
      </div>

      {/* Main Runner Stage */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 flex flex-col items-center justify-start relative z-10">
        {/* Loading Overlay */}
        {loading && (
          <div className="mb-4 p-3 bg-indigo-950/40 border border-indigo-500/25 rounded-2xl text-xs text-indigo-200 flex items-center gap-2.5 backdrop-blur-md animate-pulse">
            <div className="w-3.5 h-3.5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin"></div>
            <span>Memvalidasi dan menyiapkan file ke virtual loopback server...</span>
          </div>
        )}

        {/* Error Notification */}
        {errorMsg && (
          <div className="mb-4 p-3.5 bg-red-950/40 border border-red-500/30 rounded-2xl text-xs text-red-200 flex items-center justify-between gap-2 max-w-xl w-full backdrop-blur-md">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
            <button onClick={() => setErrorMsg(null)} className="text-red-400 hover:text-white">
              ✕
            </button>
          </div>
        )}

        {/* Smartphone Simulator */}
        <PhoneSimulator
          project={project}
          settings={settings}
          onUpdateSettings={(newSet) => setSettings((prev) => ({ ...prev, ...newSet }))}
          onPrintRequest={() => setIsPdfModalOpen(true)}
          onOpenFiles={() => setIsFilesDrawerOpen(true)}
          onCloseProject={() => setProject(null)}
          onOpenFilePicker={() => fileInputRef.current?.click()}
          onOpenFolderPicker={() => folderInputRef.current?.click()}
          onOpenPasteCode={() => setIsHtmlEditorOpen(true)}
        />

        {/* WebView DevTools Inspector & Diagnostics Console */}
        <WebViewInspector
          logs={logs}
          onClearLogs={() => setLogs([])}
          activePort="127.0.0.1:8080"
          projectFileName={project?.fileName}
        />
      </main>

      {/* Feature Highlight Cards Bar at Bottom */}
      <footer className="border-t border-white/[0.06] bg-[#090c14]/80 backdrop-blur-md p-4 sm:p-6 mt-auto relative z-10">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-3.5 text-xs">
          <div className="p-4 bg-white/[0.02] hover:bg-white/[0.04] rounded-2xl border border-white/[0.06] flex items-start gap-3.5 transition-all duration-200">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shrink-0">
              <FileCode className="w-4 h-4 text-indigo-300" />
            </div>
            <div>
              <div className="font-semibold text-white mb-0.5">Eksekusi index.html Langsung</div>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                Mendukung eksekusi langsung dari file ZIP, berkas <code>index.html</code> tunggal, folder proyek, maupun tempel kode HTML tanpa konfigurasi rumit.
              </p>
            </div>
          </div>

          <div className="p-4 bg-white/[0.02] hover:bg-white/[0.04] rounded-2xl border border-white/[0.06] flex items-start gap-3.5 transition-all duration-200">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
              <Printer className="w-4 h-4 text-emerald-300" />
            </div>
            <div>
              <div className="font-semibold text-white mb-0.5">Cetak & Unduh PDF Terintegrasi</div>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                Menangkap <code>window.print()</code> dan jembatan <code>ZipRunnerBridge.savePdf</code> untuk cetak faktur dan laporan resmi ISO A4.
              </p>
            </div>
          </div>

          <div className="p-4 bg-white/[0.02] hover:bg-white/[0.04] rounded-2xl border border-white/[0.06] flex items-start gap-3.5 transition-all duration-200">
            <div className="w-8 h-8 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center shrink-0">
              <Maximize2 className="w-4 h-4 text-violet-300" />
            </div>
            <div>
              <div className="font-semibold text-white mb-0.5">Layar Penuh HP Immersive</div>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                Saat berkas masuk, layar langsung menyembunyikan status bar & bar navigasi sistem untuk pengalaman aplikasi native penuh.
              </p>
            </div>
          </div>
        </div>
      </footer>

      {/* Floating Drag Overlay */}
      {isDragging && (
        <div className="fixed inset-0 z-50 bg-indigo-600/30 backdrop-blur-sm border-4 border-dashed border-indigo-400 flex flex-col items-center justify-center pointer-events-none animate-pulse">
          <Upload className="w-16 h-16 text-white mb-4 animate-bounce" />
          <h2 className="text-2xl font-black text-white">Lepaskan File ZIP atau index.html Di Sini</h2>
          <p className="text-sm text-indigo-100 mt-2">
            Akan langsung dibuka dan dijalankan otomatis dalam mode immersive layar HP!
          </p>
        </div>
      )}

      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 p-4 bg-slate-900/95 border border-slate-700 text-white rounded-2xl shadow-2xl backdrop-blur-md max-w-sm animate-slide-up">
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
              toastMsg.type === 'success'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : toastMsg.type === 'print'
                ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
                : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
            }`}
          >
            {toastMsg.type === 'success' ? (
              <CheckCircle className="w-5 h-5" />
            ) : toastMsg.type === 'print' ? (
              <Printer className="w-5 h-5" />
            ) : (
              <Sparkles className="w-5 h-5" />
            )}
          </div>
          <div>
            <div className="font-bold text-xs">{toastMsg.title}</div>
            <div className="text-[11px] text-slate-400">{toastMsg.desc}</div>
          </div>
        </div>
      )}

      {/* Modals */}
      <AutomationScriptsModal
        isOpen={isAutomationOpen}
        onClose={() => setIsAutomationOpen(false)}
      />

      <HtmlEditorModal
        isOpen={isHtmlEditorOpen}
        onClose={() => setIsHtmlEditorOpen(false)}
        onRunHtml={(html, title) => processDirectHtml(html, title)}
      />

      <FileSystemDrawer
        isOpen={isFilesDrawerOpen}
        onClose={() => setIsFilesDrawerOpen(false)}
        project={project}
        onSelectPage={(path) => {
          const entry = project?.entries.get(path);
          if (entry?.url) {
            setProject((prev) => (prev ? { ...prev, indexUrl: entry.url! } : null));
            setIsFilesDrawerOpen(false);
            showToast('📄 Berpindah Halaman', `Membuka ${path}`, 'info');
          }
        }}
      />

      <PdfExportModal
        isOpen={isPdfModalOpen}
        onClose={() => setIsPdfModalOpen(false)}
        documentHtml={capturedHtml}
        projectName={project?.fileName}
      />
    </div>
  );
}
