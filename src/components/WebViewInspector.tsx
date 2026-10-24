import React, { useState } from 'react';
import {
  Terminal,
  Trash2,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  Camera,
  FolderOpen,
  Printer,
  Database,
  Globe,
  Radio
} from 'lucide-react';

export interface ConsoleLogItem {
  id: string;
  level: 'log' | 'info' | 'warn' | 'error';
  message: string;
  timestamp: string;
}

interface WebViewInspectorProps {
  logs: ConsoleLogItem[];
  onClearLogs: () => void;
  activePort?: string;
  projectFileName?: string;
}

export const WebViewInspector: React.FC<WebViewInspectorProps> = ({
  logs,
  onClearLogs,
  activePort = '127.0.0.1:8080',
  projectFileName,
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'features' | 'console'>('features');
  const [filterLevel, setFilterLevel] = useState<string>('all');
  const [copied, setCopied] = useState<boolean>(false);

  const filteredLogs = logs.filter((log) => {
    if (filterLevel === 'all') return true;
    return log.level === filterLevel;
  });

  const copyLogs = () => {
    const text = logs.map((l) => `[${l.timestamp}] [${l.level.toUpperCase()}] ${l.message}`).join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const featureList = [
    {
      title: 'Localhost HTTP Server',
      status: `Aktif pada http://${activePort}/`,
      icon: <Globe className="w-4 h-4 text-emerald-400" />,
      desc: 'Membaca langsung dari ZIP (NanoHTTPD). Dukungan Range 206 & CORS OPTIONS.',
      badge: 'ONLINE',
      badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    },
    {
      title: 'Kamera, Mic & WebRTC',
      status: 'onPermissionRequest Aktif',
      icon: <Camera className="w-4 h-4 text-indigo-400" />,
      desc: 'Izin otomatis kamera scanner barcode, QR code, dan input audio di WebView.',
      badge: 'FULL SUPPORT',
      badgeColor: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
    },
    {
      title: 'Pemilih Berkas (<input type="file">)',
      status: 'onShowFileChooser Terintegrasi',
      icon: <FolderOpen className="w-4 h-4 text-blue-400" />,
      desc: 'Dukungan upload berkas, dokumen, dan pemilihan foto galeri.',
      badge: 'TERHUBUNG',
      badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    },
    {
      title: 'Dialog Native JS (Alert, Confirm, Prompt)',
      status: 'onJsAlert, onJsConfirm, onJsPrompt',
      icon: <Radio className="w-4 h-4 text-amber-400" />,
      desc: 'Menampilkan AlertDialog Android asli untuk pemanggilan window.alert, confirm, dan prompt.',
      badge: 'NATIVE DIALOG',
      badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    },
    {
      title: 'Penyimpanan Lokal & Cookies',
      status: 'LocalStorage, IndexedDB, Cookies 3P',
      icon: <Database className="w-4 h-4 text-purple-400" />,
      desc: 'Database klien persisten, domStorageEnabled = true, CookieManager third-party allowed.',
      badge: 'PERSISTENT',
      badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
    },
    {
      title: 'Cetak & Ekspor PDF Langsung',
      status: 'PrintManager ISO A4 + savePdf MediaStore',
      icon: <Printer className="w-4 h-4 text-rose-400" />,
      desc: 'Menangkap window.print() (termasuk iframe) dan simpan PDF langsung ke direktori Download HP.',
      badge: 'INTEGRATED',
      badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
    },
  ];

  return (
    <div className="w-full max-w-4xl mx-auto mt-5 bg-[#0d111b]/80 backdrop-blur-xl border border-white/[0.07] rounded-2xl shadow-[0_16px_40px_-10px_rgba(0,0,0,0.5)] overflow-hidden transition-all duration-300">
      {/* Header Bar */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className="px-5 py-3.5 bg-[#0e1320]/70 hover:bg-[#121828]/70 flex items-center justify-between cursor-pointer select-none transition-all duration-200 border-b border-white/[0.05]"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
            <ShieldCheck className="w-4 h-4 text-emerald-300" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-white">
                Kapabilitas WebView Localhost HP 127.0.0.1
              </span>
              <span className="text-[10px] font-mono bg-emerald-500/10 text-emerald-300 border border-emerald-500/25 px-2 py-0.5 rounded-full font-medium">
                FULL NATIVE
              </span>
              {logs.length > 0 && (
                <span className="text-[10px] bg-white/[0.06] text-slate-300 px-2 py-0.5 rounded-full font-mono">
                  {logs.length} log
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400">
              Kamera, File Chooser, Geolocation, Dialog JS, Web Storage, & Media Streaming
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-indigo-300 font-medium hidden sm:inline">
            {isExpanded ? 'Sembunyikan Panel' : 'Lihat Detail & Log'}
          </span>
          <button className="p-1 text-slate-400 hover:text-white transition">
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="p-5 bg-[#0b0e17]/80">
          {/* Sub Navigation */}
          <div className="flex items-center justify-between border-b border-white/[0.06] pb-3 mb-4 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveTab('features')}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all duration-200 flex items-center gap-1.5 ${
                  activeTab === 'features'
                    ? 'bg-indigo-500/20 text-indigo-200 border border-indigo-400/30'
                    : 'bg-white/[0.03] text-slate-400 hover:text-white hover:bg-white/[0.06]'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                Daftar Fitur WebView Normal HP
              </button>
              <button
                onClick={() => setActiveTab('console')}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all duration-200 flex items-center gap-1.5 ${
                  activeTab === 'console'
                    ? 'bg-indigo-500/20 text-indigo-200 border border-indigo-400/30'
                    : 'bg-white/[0.03] text-slate-400 hover:text-white hover:bg-white/[0.06]'
                }`}
              >
                <Terminal className="w-3.5 h-3.5" />
                Console Log WebView ({logs.length})
              </button>
            </div>

            {activeTab === 'console' && (
              <div className="flex items-center gap-2">
                <select
                  value={filterLevel}
                  onChange={(e) => setFilterLevel(e.target.value)}
                  className="bg-[#121624] border border-white/[0.08] text-slate-300 text-xs rounded-lg px-2.5 py-1 focus:outline-none cursor-pointer"
                >
                  <option value="all">Semua Level</option>
                  <option value="log">Log</option>
                  <option value="info">Info</option>
                  <option value="warn">Warn</option>
                  <option value="error">Error</option>
                </select>
                <button
                  onClick={copyLogs}
                  className="p-1.5 bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 rounded-lg transition text-xs flex items-center gap-1 border border-white/[0.06]"
                  title="Salin Log"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
                <button
                  onClick={onClearLogs}
                  className="p-1.5 bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 hover:text-rose-400 rounded-lg transition text-xs flex items-center gap-1 border border-white/[0.06]"
                  title="Bersihkan Log"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* Features Tab */}
          {activeTab === 'features' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              {featureList.map((item, idx) => (
                <div
                  key={idx}
                  className="p-3.5 bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.12] rounded-xl flex items-start gap-3 transition-all duration-200"
                >
                  <div className="p-2 rounded-lg bg-white/[0.04] border border-white/[0.06] shrink-0 mt-0.5">
                    {item.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className="font-semibold text-white truncate">{item.title}</span>
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border shrink-0 ${item.badgeColor}`}>
                        {item.badge}
                      </span>
                    </div>
                    <div className="text-[11px] text-indigo-300 font-mono mb-1">{item.status}</div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Console Tab */}
          {activeTab === 'console' && (
            <div className="bg-[#070a10] rounded-xl border border-white/[0.06] p-3 font-mono text-[11px] max-h-64 overflow-y-auto space-y-1">
              {filteredLogs.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  Belum ada log dari WebView aplikasi. Jalankan fungsi di layar HP untuk memicu log.
                </div>
              ) : (
                filteredLogs.map((log) => {
                  const colorClass =
                    log.level === 'error'
                      ? 'text-rose-300 bg-rose-950/20'
                      : log.level === 'warn'
                      ? 'text-amber-300 bg-amber-950/20'
                      : log.level === 'info'
                      ? 'text-sky-300'
                      : 'text-slate-300';
                  return (
                    <div
                      key={log.id}
                      className={`p-1.5 rounded flex items-start gap-2 ${colorClass}`}
                    >
                      <span className="text-slate-500 shrink-0 text-[10px]">[{log.timestamp}]</span>
                      <span className="font-bold uppercase text-[10px] shrink-0">[{log.level}]</span>
                      <span className="break-all">{log.message}</span>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
