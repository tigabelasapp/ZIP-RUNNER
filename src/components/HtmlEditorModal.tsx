import React, { useState } from 'react';
import {
  X,
  Play,
  Code,
  Sparkles,
  FileCode,
  Copy,
  Check
} from 'lucide-react';

interface HtmlEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRunHtml: (htmlContent: string, title?: string) => void;
}

const DEFAULT_STARTER_HTML = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>Aplikasi Web Saya</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, system-ui, sans-serif;
      background: #0f172a;
      color: #f8fafc;
      padding: 20px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      text-align: center;
    }
    .card {
      background: #1e293b;
      border: 1px solid #334155;
      border-radius: 16px;
      padding: 24px;
      max-width: 340px;
      width: 100%;
      box-shadow: 0 10px 25px rgba(0,0,0,0.3);
    }
    .emoji { font-size: 42px; margin-bottom: 12px; }
    h1 { font-size: 18px; font-weight: 800; color: #38bdf8; margin-bottom: 8px; }
    p { font-size: 13px; color: #94a3b8; line-height: 1.5; margin-bottom: 16px; }
    .btn {
      width: 100%;
      padding: 12px;
      background: #6366f1;
      color: #fff;
      border: none;
      border-radius: 10px;
      font-weight: 700;
      font-size: 13px;
      cursor: pointer;
      margin-bottom: 8px;
    }
    .btn:active { transform: scale(0.97); }
    .btn-outline {
      background: transparent;
      border: 1px solid #475569;
      color: #cbd5e1;
    }
    .status {
      margin-top: 14px;
      font-size: 11px;
      color: #34d399;
      background: #064e3b;
      padding: 4px 10px;
      border-radius: 20px;
      display: inline-block;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="emoji">🚀</div>
    <h1>index.html Langsung Jalan!</h1>
    <p>Halaman ini dijalankan langsung oleh ZIP-to-WebView Runner Pro dengan mode immersive fullscreen.</p>
    <button class="btn" onclick="testCetak()">🖨️ Uji Cetak Laporan PDF</button>
    <button class="btn btn-outline" onclick="testDialog()">💬 Uji Dialog Alert</button>
    <div class="status">● Localhost HP Aktif</div>
  </div>

  <script>
    function testCetak() {
      window.print();
    }
    function testDialog() {
      alert('Selamat! Kode index.html berhasil dijalankan langsung di WebView HP.');
    }
  </script>
</body>
</html>`;

export const HtmlEditorModal: React.FC<HtmlEditorModalProps> = ({
  isOpen,
  onClose,
  onRunHtml,
}) => {
  const [code, setCode] = useState<string>(DEFAULT_STARTER_HTML);
  const [copied, setCopied] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleRun = () => {
    onRunHtml(code, 'Custom_index.html');
    onClose();
  };

  const copyCode = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-3xl bg-[#0c101b] border border-white/[0.08] rounded-2xl shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06] bg-[#0f1422]/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
              <Code className="w-5 h-5 text-indigo-300" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white flex items-center gap-2">
                Jalankan index.html Langsung (Editor / Tempel Kode)
              </h2>
              <p className="text-xs text-slate-400">
                Tempelkan atau edit kode HTML/JS/CSS di bawah untuk langsung dijalankan di layar HP tanpa perlu di-zip.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-white/[0.06] rounded-xl transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Code Editor Area */}
        <div className="flex-1 p-5 bg-[#07090f] overflow-hidden flex flex-col">
          <div className="flex items-center justify-between pb-2.5 text-xs text-slate-400">
            <span className="flex items-center gap-1.5 font-mono text-[11px] text-slate-300">
              <FileCode className="w-3.5 h-3.5 text-amber-400" />
              index.html
            </span>
            <button
              onClick={copyCode}
              className="px-2.5 py-1 bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 rounded-lg text-xs flex items-center gap-1 transition border border-white/[0.06]"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              {copied ? 'Tersalin' : 'Salin'}
            </button>
          </div>
          <textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Ketik atau tempelkan kode <!DOCTYPE html> di sini..."
            className="w-full flex-1 min-h-[340px] bg-[#0c101b] border border-white/[0.06] rounded-xl p-3.5 font-mono text-xs text-slate-200 focus:outline-none focus:border-indigo-400/50 resize-none selection:bg-indigo-500/30"
            spellCheck={false}
          />
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-3.5 border-t border-white/[0.06] bg-[#0f1422]/60 flex items-center justify-between">
          <button
            onClick={() => setCode(DEFAULT_STARTER_HTML)}
            className="px-3.5 py-2 bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 rounded-xl text-xs font-medium transition border border-white/[0.06]"
          >
            Reset Template Standar
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 rounded-xl text-xs font-medium transition border border-white/[0.06]"
            >
              Batal
            </button>
            <button
              onClick={handleRun}
              className="px-5 py-2 bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-400 hover:to-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-[0_4px_16px_rgba(99,102,241,0.3)] border border-indigo-400/30 transition-all duration-200 cursor-pointer"
            >
              <Play className="w-3.5 h-3.5" />
              Jalankan index.html Sekarang
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
