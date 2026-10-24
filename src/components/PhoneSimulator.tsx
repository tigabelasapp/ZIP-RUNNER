import React, { useRef, useEffect, useState } from 'react';
import {
  RotateCw,
  Maximize2,
  Minimize2,
  RefreshCw,
  Printer,
  ChevronLeft,
  Square,
  Circle,
  Eye,
  EyeOff,
  ExternalLink,
  Smartphone,
  ShieldCheck,
  FileCode,
  Layers,
  Sparkles,
  Upload,
  FolderOpen,
  Code
} from 'lucide-react';
import { LoadedProject, PhoneSettings } from '../types/runner';

interface PhoneSimulatorProps {
  project: LoadedProject | null;
  settings: PhoneSettings;
  onUpdateSettings: (newSettings: Partial<PhoneSettings>) => void;
  onPrintRequest: () => void;
  onOpenFiles: () => void;
  onCloseProject: () => void;
  onOpenFilePicker?: () => void;
  onOpenFolderPicker?: () => void;
  onOpenPasteCode?: () => void;
}

export const PhoneSimulator: React.FC<PhoneSimulatorProps> = ({
  project,
  settings,
  onUpdateSettings,
  onPrintRequest,
  onOpenFiles,
  onCloseProject,
  onOpenFilePicker,
  onOpenFolderPicker,
  onOpenPasteCode,
}) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [currentTime, setCurrentTime] = useState<string>('09:41');
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [viewportWidth, setViewportWidth] = useState<number>(typeof window !== 'undefined' ? window.innerWidth : 1200);

  useEffect(() => {
    const handleResize = () => setViewportWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      setCurrentTime(`${hours}:${minutes}`);
    };
    updateClock();
    const interval = setInterval(updateClock, 10000);
    return () => clearInterval(interval);
  }, []);

  // Listen to fullscreen changes
  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  const toggleBrowserFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        if (containerRef.current) {
          await containerRef.current.requestFullscreen();
          onUpdateSettings({ immersiveMode: true });
        }
      } else {
        await document.exitFullscreen();
      }
    } catch (e) {
      console.warn('Fullscreen error', e);
    }
  };

  const reloadIframe = () => {
    if (iframeRef.current && project?.indexUrl) {
      iframeRef.current.src = project.indexUrl;
    }
  };

  const handleAndroidBack = () => {
    try {
      if (iframeRef.current?.contentWindow) {
        iframeRef.current.contentWindow.history.back();
      }
    } catch (_e) {
      onCloseProject();
    }
  };

  const handleOpenExternal = () => {
    if (project?.indexUrl) {
      window.open(project.indexUrl, '_blank', 'noopener,noreferrer');
    }
  };

  // Dimensions based on device and screen size
  const getDeviceDimensions = () => {
    const isMobileScreen = viewportWidth < 640;

    if (settings.isLandscape) {
      switch (settings.deviceType) {
        case 'tablet':
          return { width: isMobileScreen ? '100%' : '840px', height: isMobileScreen ? '360px' : '540px' };
        case 'compact-phone':
          return { width: isMobileScreen ? '100%' : '660px', height: isMobileScreen ? '320px' : '360px' };
        default:
          return { width: isMobileScreen ? '100%' : '740px', height: isMobileScreen ? '340px' : '390px' };
      }
    } else {
      switch (settings.deviceType) {
        case 'tablet':
          return { width: isMobileScreen ? '100%' : '540px', height: isMobileScreen ? '580px' : '760px' };
        case 'compact-phone':
          return { width: isMobileScreen ? '100%' : '350px', height: isMobileScreen ? '560px' : '660px' };
        default:
          return { width: isMobileScreen ? '100%' : '395px', height: isMobileScreen ? '620px' : '780px' };
      }
    }
  };

  const dimensions = getDeviceDimensions();
  const showFrame = settings.showDeviceFrame !== false && !isFullscreen;

  return (
    <div
      ref={containerRef}
      className={`relative flex flex-col items-center justify-center transition-all duration-300 w-full ${
        isFullscreen ? 'bg-black w-screen h-screen p-0 fixed inset-0 z-50' : 'py-3 px-2 sm:px-4'
      }`}
    >
      {/* Control Toolbar atop Phone */}
      {!isFullscreen && (
        <div className="w-full max-w-2xl mb-4 flex items-center justify-center">
          <div className="flex items-center gap-1.5 p-1.5 bg-[#101420]/85 backdrop-blur-xl border border-white/[0.08] rounded-2xl shadow-[0_12px_40px_-8px_rgba(0,0,0,0.65)] text-xs text-slate-300 max-w-full overflow-x-auto no-scrollbar scroll-smooth">
            {/* Device Profile Selector */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 border-r border-white/[0.07] shrink-0">
              <Smartphone className="w-3.5 h-3.5 text-indigo-300" />
              <select
                value={settings.deviceType}
                onChange={(e) => onUpdateSettings({ deviceType: e.target.value as PhoneSettings['deviceType'] })}
                aria-label="Pilih tipe perangkat HP"
                className="bg-transparent text-slate-200 text-xs font-medium focus:outline-none cursor-pointer"
              >
                <option value="android-flagship" className="bg-[#121622] text-slate-100">Flagship 6.7"</option>
                <option value="compact-phone" className="bg-[#121622] text-slate-100">Compact 6.1"</option>
                <option value="tablet" className="bg-[#121622] text-slate-100">Tablet 10"</option>
              </select>
            </div>

            {/* Toggle Frame vs Edge-to-Edge */}
            <button
              onClick={() => onUpdateSettings({ showDeviceFrame: !showFrame })}
              className={`p-1.5 rounded-xl transition-all duration-200 flex items-center gap-1 shrink-0 ${
                !showFrame ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-400/30' : 'hover:bg-white/[0.06] text-slate-300'
              }`}
              title={showFrame ? "Ubah ke Mode Layar Penuh HP Tanpa Bezel" : "Tampilkan Bingkai Ponsel"}
            >
              <Layers className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{showFrame ? 'Bingkai' : 'Edge-to-Edge'}</span>
            </button>

            {/* Rotate Orientation */}
            <button
              onClick={() => onUpdateSettings({ isLandscape: !settings.isLandscape })}
              className="p-1.5 hover:bg-white/[0.06] rounded-xl text-slate-300 hover:text-white transition-all duration-200 flex items-center gap-1 shrink-0"
              title="Putar Orientasi Layar (Landscape / Portrait)"
            >
              <RotateCw className="w-3.5 h-3.5" />
              <span className="hidden md:inline">{settings.isLandscape ? 'Landscape' : 'Portrait'}</span>
            </button>

            {/* Toggle Immersive Mode */}
            <button
              onClick={() => onUpdateSettings({ immersiveMode: !settings.immersiveMode })}
              className={`p-1.5 rounded-xl transition-all duration-200 flex items-center gap-1 shrink-0 font-medium ${
                settings.immersiveMode ? 'bg-indigo-500/25 text-indigo-200 border border-indigo-400/30' : 'hover:bg-white/[0.06] text-slate-300 hover:text-white'
              }`}
              title="Mode Immersive Layar Penuh (Sembunyikan Status & Navigasi Bar)"
            >
              {settings.immersiveMode ? <EyeOff className="w-3.5 h-3.5 text-indigo-300" /> : <Eye className="w-3.5 h-3.5 text-slate-400" />}
              <span className="hidden sm:inline">Immersive</span>
            </button>

            {/* Reload Webview */}
            <button
              onClick={reloadIframe}
              className="p-1.5 hover:bg-white/[0.06] rounded-xl text-slate-300 hover:text-white transition-all duration-200 shrink-0"
              title="Muat Ulang Halaman (Reload)"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>

            {/* Print & PDF */}
            <button
              onClick={onPrintRequest}
              className="p-1.5 hover:bg-indigo-500/15 text-indigo-300 hover:text-indigo-200 rounded-xl transition-all duration-200 flex items-center gap-1 shrink-0 font-medium"
              title="Cetak & Unduh Laporan PDF"
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden xs:inline">Cetak PDF</span>
            </button>

            {/* Open Virtual Files */}
            <button
              onClick={onOpenFiles}
              className="p-1.5 hover:bg-white/[0.06] rounded-xl text-slate-300 hover:text-white transition-all duration-200 flex items-center gap-1 shrink-0"
              title="Buka Sistem Berkas Virtual Proyek"
            >
              <FileCode className="w-3.5 h-3.5" />
              <span className="hidden lg:inline">Berkas</span>
            </button>

            {/* Open in External Tab */}
            {project?.indexUrl && (
              <button
                onClick={handleOpenExternal}
                className="p-1.5 hover:bg-white/[0.06] rounded-xl text-slate-300 hover:text-white transition-all duration-200 shrink-0 hidden sm:flex items-center gap-1"
                title="Buka di Tab Browser Baru (100% Layar Bersih)"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Fullscreen Modal Toggle */}
            <button
              onClick={toggleBrowserFullscreen}
              className="p-1.5 bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-400 hover:to-indigo-500 text-white rounded-xl transition-all duration-200 flex items-center gap-1 font-semibold ml-0.5 shrink-0 shadow-sm shadow-indigo-500/25 cursor-pointer"
              title="Layar Penuh Layar Monitor / HP"
            >
              <Maximize2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Fullscreen</span>
            </button>
          </div>
        </div>
      )}

      {/* Floating Exit Button in Fullscreen mode */}
      {isFullscreen && (
        <div className="absolute top-4 right-4 z-50 flex items-center gap-2">
          <button
            onClick={onPrintRequest}
            className="px-3.5 py-1.5 bg-indigo-500/90 hover:bg-indigo-400 text-white rounded-full text-xs font-semibold backdrop-blur shadow-lg flex items-center gap-1.5 cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            Cetak PDF
          </button>
          <button
            onClick={toggleBrowserFullscreen}
            className="px-3.5 py-1.5 bg-[#141824]/90 hover:bg-[#1a2030] text-slate-200 rounded-full text-xs font-semibold backdrop-blur shadow-lg border border-white/10 flex items-center gap-1.5 cursor-pointer"
          >
            <Minimize2 className="w-3.5 h-3.5" />
            Keluar Fullscreen
          </button>
        </div>
      )}

      {/* Phone Frame or Edge-to-Edge Container */}
      <div
        style={{
          width: isFullscreen ? '100vw' : showFrame ? dimensions.width : '100%',
          maxWidth: isFullscreen ? '100vw' : showFrame ? dimensions.width : '680px',
          height: isFullscreen ? '100vh' : dimensions.height,
          maxHeight: isFullscreen ? '100vh' : 'calc(100vh - 170px)',
        }}
        className={`relative transition-all duration-300 flex flex-col overflow-hidden ${
          isFullscreen
            ? 'rounded-none border-0 shadow-none bg-black'
            : showFrame
            ? 'rounded-[46px] border-[11px] sm:border-[13px] border-[#151924] bg-[#0a0d14] shadow-[0_30px_90px_-20px_rgba(0,0,0,0.9),0_0_0_1px_rgba(255,255,255,0.08)] ring-1 ring-black'
            : 'rounded-2xl border border-white/[0.08] bg-[#0a0d14] shadow-2xl ring-1 ring-white/[0.04]'
        }`}
      >
        {/* Dynamic Island / Punch Hole Notch (Only if not immersive and frame is active) */}
        {!settings.immersiveMode && showFrame && !isFullscreen && !settings.isLandscape && (
          <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-28 h-5 bg-black rounded-full z-40 flex items-center justify-between px-3 pointer-events-none ring-1 ring-white/10">
            <div className="w-2.5 h-2.5 rounded-full bg-slate-900 ring-1 ring-slate-800 flex items-center justify-center">
              <div className="w-1 h-1 rounded-full bg-blue-400/80"></div>
            </div>
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></div>
          </div>
        )}

        {/* Mobile Status Bar (Hidden in Immersive Mode) */}
        {!settings.immersiveMode && (
          <div className="h-7 w-full bg-[#0a0d14]/95 text-white flex items-center justify-between px-5 text-[11px] font-medium tracking-tight select-none z-30 shrink-0 border-b border-white/[0.04]">
            <span className="text-slate-300 font-medium">{currentTime}</span>
            <div className="flex items-center gap-2 text-slate-300 text-[10px]">
              <span className="font-semibold text-emerald-400/90">5G</span>
              <div className="flex items-end gap-0.5 h-2.5">
                <div className="w-0.5 h-1 bg-white/80 rounded-xs"></div>
                <div className="w-0.5 h-1.5 bg-white/80 rounded-xs"></div>
                <div className="w-0.5 h-2 bg-white/80 rounded-xs"></div>
                <div className="w-0.5 h-2.5 bg-white/80 rounded-xs"></div>
              </div>
              <div className="w-4 h-2.5 border border-white/80 rounded-xs p-0.5 flex items-center">
                <div className="h-full w-3/4 bg-white/90 rounded-xs"></div>
              </div>
            </div>
          </div>
        )}

        {/* Simulated Web Viewport (100% of the screen in immersive mode!) */}
        <div className="relative flex-1 w-full bg-white overflow-hidden">
          {project ? (
            <iframe
              ref={iframeRef}
              src={project.indexUrl}
              title={project.fileName}
              className="w-full h-full border-0 select-auto block"
              allow="camera; microphone; geolocation; fullscreen; clipboard-read; clipboard-write;"
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-modals allow-downloads allow-top-navigation-by-user-activation"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-gradient-to-b from-[#0f1422] via-[#090d16] to-[#080b12] text-slate-300 relative overflow-hidden">
              <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_50%_40%,rgba(99,102,241,0.12),transparent_70%)]" />
              
              <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500/15 to-violet-500/10 border border-white/10 flex items-center justify-center mb-4 shadow-[0_8px_32px_rgba(99,102,241,0.15)]">
                <Smartphone className="w-8 h-8 text-indigo-300" />
              </div>
              
              <h3 className="relative text-base font-bold text-white mb-1.5 tracking-tight">Runner Siap Digunakan</h3>
              <p className="relative text-xs text-slate-400 max-w-xs mb-6 leading-relaxed">
                Pilih atau seret berkas ZIP proyek web Anda atau file <code>index.html</code> untuk langsung dijalankan di WebView HP.
              </p>

              <div className="relative w-full max-w-xs space-y-2.5 mb-6">
                <button
                  onClick={onOpenFilePicker}
                  className="w-full py-2.5 px-4 bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-400 hover:to-indigo-500 text-white rounded-xl text-xs font-semibold transition-all duration-200 flex items-center justify-center gap-2 shadow-[0_4px_16px_rgba(99,102,241,0.3)] border border-indigo-400/30 active:scale-98 cursor-pointer"
                >
                  <Upload className="w-4 h-4" />
                  Pilih Berkas ZIP / index.html
                </button>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={onOpenFolderPicker}
                    className="py-2 px-3 bg-white/[0.04] hover:bg-white/[0.08] text-slate-200 border border-white/[0.08] rounded-xl text-[11px] font-medium transition-all duration-200 flex items-center justify-center gap-1.5 active:scale-98 cursor-pointer"
                  >
                    <FolderOpen className="w-3.5 h-3.5 text-sky-400" />
                    Buka Folder
                  </button>
                  <button
                    onClick={onOpenPasteCode}
                    className="py-2 px-3 bg-white/[0.04] hover:bg-white/[0.08] text-slate-200 border border-white/[0.08] rounded-xl text-[11px] font-medium transition-all duration-200 flex items-center justify-center gap-1.5 active:scale-98 cursor-pointer"
                  >
                    <Code className="w-3.5 h-3.5 text-amber-400" />
                    Tempel Kode
                  </button>
                </div>
              </div>

              <div className="relative flex items-center gap-2 text-[11px] text-emerald-300/90 bg-emerald-500/10 px-3.5 py-1.5 rounded-full border border-emerald-500/20 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>Mode Produksi • Loopback 127.0.0.1 Siap</span>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Android Navigation Bar (Hidden in Immersive Mode) */}
        {!settings.immersiveMode && (
          <div className="h-8 w-full bg-[#0a0d14] flex items-center justify-around px-8 text-slate-400 select-none z-30 shrink-0 border-t border-white/[0.04]">
            <button
              onClick={handleAndroidBack}
              className="p-2 hover:text-white transition"
              title="Android Back Button"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={reloadIframe}
              className="p-2 hover:text-white transition"
              title="Android Home Button"
            >
              <Circle className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onOpenFiles}
              className="p-2 hover:text-white transition"
              title="Android Recents Button"
            >
              <Square className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Immersive Quick Hint Tab (When in Immersive Mode, allows tapping to reveal bars) */}
        {settings.immersiveMode && !isFullscreen && (
          <button
            onClick={() => onUpdateSettings({ immersiveMode: false })}
            className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-28 h-1 bg-white/35 hover:bg-white/70 rounded-full transition-all duration-200 z-50 cursor-pointer"
            title="Klik untuk memunculkan kembali bilah status & navigasi HP"
          />
        )}
      </div>

      {/* Project Status Bar Underneath */}
      {project && !isFullscreen && (
        <div className="mt-3.5 flex items-center justify-center flex-wrap gap-2 text-xs text-slate-400 text-center px-4">
          <span className="flex items-center gap-1.5 text-slate-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            <strong>{project.fileName}</strong>
          </span>
          <span className="text-slate-600">·</span>
          <span>Halaman Awal: <code className="text-indigo-300 font-mono">{project.startPage}</code></span>
          <span className="text-slate-600">·</span>
          <span>{project.entryCount} Berkas</span>
          <span className="text-slate-600">·</span>
          <span className="text-emerald-400/90 font-medium">Mode Immersive</span>
        </div>
      )}
    </div>
  );
};

