import React, { useState } from 'react';
import {
  X,
  Printer,
  Download,
  FileText,
  Settings,
  Sparkles,
  CheckCircle,
  FileCode
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import { ReportConfig } from '../types/runner';

interface PdfExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentHtml?: string;
  projectName?: string;
}

export const PdfExportModal: React.FC<PdfExportModalProps> = ({
  isOpen,
  onClose,
  documentHtml,
  projectName,
}) => {
  const [config, setConfig] = useState<ReportConfig>({
    title: 'Laporan Dokumen Resmi',
    subtitle: 'Diekspor dari ZIP-to-WebView Runner Pro',
    pageSize: 'a4',
    orientation: 'portrait',
    includeHeader: true,
    includeFooter: true,
    themeColor: '#4f46e5',
  });
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleNativePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      window.print();
      return;
    }
    const htmlToPrint = documentHtml || `
      <!doctype html>
      <html>
        <head>
          <title>${config.title}</title>
          <style>
            body { font-family: -apple-system, sans-serif; padding: 30px; color: #1e293b; }
            h1 { color: ${config.themeColor}; border-bottom: 2px solid ${config.themeColor}; padding-bottom: 8px; }
            p { font-size: 14px; line-height: 1.6; }
            .meta { font-size: 12px; color: #64748b; margin-bottom: 20px; }
          </style>
        </head>
        <body>
          <h1>${config.title}</h1>
          <p class="meta">${config.subtitle} • Waktu Cetak: ${new Date().toLocaleString('id-ID')}</p>
          <hr/>
          <p>Dokumen berhasil diproses melalui integrasi cetak sistem PENGGILAS ZIP-to-WebView Runner.</p>
        </body>
      </html>
    `;
    printWindow.document.write(htmlToPrint);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 350);
  };

  const handleDownloadPdf = async () => {
    setIsExporting(true);
    try {
      const doc = new jsPDF({
        orientation: config.orientation,
        unit: 'mm',
        format: config.pageSize === 'receipt-80mm' ? [80, 200] : config.pageSize,
      });

      // Title & Header
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(config.pageSize === 'receipt-80mm' ? 14 : 18);
      doc.setTextColor(config.themeColor);
      doc.text(config.title, 14, 20);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      doc.text(
        `${config.subtitle} | Tanggal: ${new Date().toLocaleDateString('id-ID')} | Proyek: ${projectName || 'ZIP Web App'}`,
        14,
        28
      );

      // Decorative divider
      doc.setDrawColor(203, 213, 225);
      doc.setLineWidth(0.5);
      doc.line(14, 32, config.pageSize === 'receipt-80mm' ? 66 : 196, 32);

      // Extract real text from documentHtml or provide clean document metadata
      let bodyLines: string[] = [];
      if (documentHtml) {
        try {
          const parser = new DOMParser();
          const parsedDoc = parser.parseFromString(documentHtml, 'text/html');
          const textContent = parsedDoc.body.innerText || parsedDoc.body.textContent || '';
          bodyLines = textContent
            .split('\n')
            .map((l) => l.trim())
            .filter((l) => l.length > 0)
            .slice(0, 35);
        } catch (_err) {
          bodyLines = [];
        }
      }

      if (bodyLines.length === 0) {
        bodyLines = [
          `Dokumen: ${projectName || 'Aplikasi Web'}`,
          `Status: Dokumen resmi telah diproses melalui engine cetak PDF terintegrasi.`
        ];
      }

      let y = 42;
      const maxColWidth = config.pageSize === 'receipt-80mm' ? 52 : 180;
      doc.setFontSize(9);
      doc.setTextColor(30, 41, 59);

      bodyLines.forEach((line) => {
        if (y > (config.pageSize === 'receipt-80mm' ? 170 : 265)) return;
        const splitText = doc.splitTextToSize(line, maxColWidth);
        doc.text(splitText, 14, y);
        y += splitText.length * 4.5 + 2;
      });

      // Footer
      if (config.includeFooter) {
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184);
        doc.text(
          `Dokumen resmi - Dicetak melalui engine PDF terintegrasi.`,
          14,
          config.pageSize === 'receipt-80mm' ? 185 : 282
        );
      }

      const safeName = `${config.title.replace(/[^a-zA-Z0-9_-]/g, '_')}_${Date.now()}.pdf`;
      doc.save(safeName);

      setSuccessMsg(`Berhasil mengunduh: ${safeName}`);
      setTimeout(() => setSuccessMsg(null), 3500);
    } catch (e) {
      console.error('Gagal generate PDF', e);
      handleNativePrint();
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownloadHtml = () => {
    const content = documentHtml || '<!doctype html><html><body>Dokumen kosong</body></html>';
    const blob = new Blob([content], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Dokumen_${projectName || 'Laporan'}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-xl bg-[#0c101b] border border-white/[0.08] rounded-2xl shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06] bg-[#0f1422]/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
              <Printer className="w-5 h-5 text-indigo-300" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white flex items-center gap-2">
                Cetak & Ekspor Laporan PDF Langsung
              </h3>
              <p className="text-xs text-slate-400">
                Integrasi PrintManager & engine ekspor berkas PDF langsung ke perangkat.
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

        {/* Form Body */}
        <div className="p-6 space-y-4 text-xs">
          {successMsg && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-300 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          <div>
            <label className="block text-slate-300 font-medium mb-1.5">Judul Laporan / Dokumen</label>
            <input
              type="text"
              value={config.title}
              onChange={(e) => setConfig({ ...config, title: e.target.value })}
              className="w-full bg-[#121624] border border-white/[0.08] rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-indigo-400/50"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-medium mb-1.5">Subjudul / Keterangan</label>
            <input
              type="text"
              value={config.subtitle}
              onChange={(e) => setConfig({ ...config, subtitle: e.target.value })}
              className="w-full bg-[#121624] border border-white/[0.08] rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-indigo-400/50"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-medium mb-1.5">Ukuran Kertas</label>
              <select
                value={config.pageSize}
                onChange={(e) => setConfig({ ...config, pageSize: e.target.value as ReportConfig['pageSize'] })}
                className="w-full bg-[#121624] border border-white/[0.08] rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-indigo-400/50 cursor-pointer"
              >
                <option value="a4">ISO A4 (Standar Resmi)</option>
                <option value="letter">US Letter</option>
                <option value="receipt-80mm">Struk Kasir Thermal (80mm)</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1.5">Orientasi</label>
              <select
                value={config.orientation}
                onChange={(e) => setConfig({ ...config, orientation: e.target.value as 'portrait' | 'landscape' })}
                className="w-full bg-[#121624] border border-white/[0.08] rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-indigo-400/50 cursor-pointer"
              >
                <option value="portrait">Tegak (Portrait)</option>
                <option value="landscape">Mendatar (Landscape)</option>
              </select>
            </div>
          </div>

          <div className="p-3 bg-white/[0.02] rounded-xl border border-white/[0.06] flex items-center justify-between text-slate-300">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-300" />
              <span>Sertakan Header & Tanda Tangan Resmi</span>
            </div>
            <input
              type="checkbox"
              checked={config.includeHeader}
              onChange={(e) => setConfig({ ...config, includeHeader: e.target.checked })}
              className="rounded accent-indigo-500 w-4 h-4 cursor-pointer"
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-white/[0.06] bg-[#0f1422]/60 flex items-center justify-between gap-3">
          <button
            onClick={handleDownloadHtml}
            className="px-3.5 py-2 bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 rounded-xl text-xs font-medium flex items-center gap-1.5 transition border border-white/[0.06] cursor-pointer"
          >
            <FileCode className="w-3.5 h-3.5 text-amber-400" />
            Simpan HTML
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={handleNativePrint}
              className="px-4 py-2 bg-white/[0.04] hover:bg-white/[0.08] text-slate-200 rounded-xl text-xs font-medium flex items-center gap-1.5 transition border border-white/[0.06] cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              Cetak (Print Dialog)
            </button>
            <button
              onClick={handleDownloadPdf}
              disabled={isExporting}
              className="px-4.5 py-2 bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-400 hover:to-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-[0_4px_16px_rgba(99,102,241,0.3)] border border-indigo-400/30 transition-all duration-200 disabled:opacity-50 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              {isExporting ? 'Memproses...' : 'Unduh PDF Langsung'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
