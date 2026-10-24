import React, { useState } from 'react';
import {
  X,
  Search,
  FileCode,
  FileText,
  Image as ImageIcon,
  File,
  Download,
  FolderOpen,
  Play,
  Eye
} from 'lucide-react';
import { LoadedProject, ZipFileEntry } from '../types/runner';

interface FileSystemDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  project: LoadedProject | null;
  onSelectPage: (path: string) => void;
}

export const FileSystemDrawer: React.FC<FileSystemDrawerProps> = ({
  isOpen,
  onClose,
  project,
  onSelectPage,
}) => {
  const [search, setSearch] = useState<string>('');
  const [selectedFile, setSelectedFile] = useState<ZipFileEntry | null>(null);
  const [fileContent, setFileContent] = useState<string | null>(null);

  if (!isOpen) return null;

  const entriesList = project ? Array.from(project.entries.values()) : [];
  const filtered = entriesList.filter((e) =>
    e.name.toLowerCase().includes(search.toLowerCase())
  );

  const getFileIcon = (name: string) => {
    const ext = name.split('.').pop()?.toLowerCase();
    if (ext === 'html' || ext === 'htm') return <FileCode className="w-4 h-4 text-orange-400" />;
    if (ext === 'css') return <FileCode className="w-4 h-4 text-blue-400" />;
    if (ext === 'js' || ext === 'mjs' || ext === 'ts') return <FileCode className="w-4 h-4 text-yellow-400" />;
    if (['png', 'jpg', 'jpeg', 'svg', 'webp', 'gif'].includes(ext || ''))
      return <ImageIcon className="w-4 h-4 text-emerald-400" />;
    if (ext === 'pdf') return <FileText className="w-4 h-4 text-red-400" />;
    return <File className="w-4 h-4 text-slate-400" />;
  };

  const handlePreview = async (entry: ZipFileEntry) => {
    setSelectedFile(entry);
    if (entry.blob && (entry.mimeType.startsWith('text/') || entry.mimeType.includes('json') || entry.mimeType.includes('javascript'))) {
      const text = await entry.blob.text();
      setFileContent(text.slice(0, 50000));
    } else {
      setFileContent(null);
    }
  };

  const downloadSingleFile = (entry: ZipFileEntry) => {
    if (!entry.blob) return;
    const url = URL.createObjectURL(entry.blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = entry.name.split('/').pop() || 'file';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-2xl h-full bg-[#0c101b] border-l border-white/[0.08] shadow-2xl flex flex-col">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-white/[0.06] flex items-center justify-between bg-[#0f1422]/70">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
              <FolderOpen className="w-4.5 h-4.5 text-indigo-300" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Sistem Berkas Virtual ZIP</h3>
              <p className="text-[11px] text-slate-400">
                {project ? `${project.entryCount} Berkas • Ukuran: ${formatSize(project.fileSize)}` : 'Tidak ada berkas aktif'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-white/[0.06] rounded-xl transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="p-3.5 border-b border-white/[0.06] bg-[#090c13]/50">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari file di dalam arsip ZIP..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[#121624] border border-white/[0.08] rounded-xl pl-9.5 pr-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-400/50"
            />
          </div>
        </div>

        {/* Main Split Body */}
        <div className="flex-1 flex overflow-hidden">
          {/* File List */}
          <div className="w-1/2 border-r border-white/[0.06] overflow-y-auto p-2.5 space-y-1 bg-[#090c13]/30">
            {filtered.length === 0 ? (
              <div className="text-center py-10 text-xs text-slate-500">
                Tidak ada berkas yang cocok
              </div>
            ) : (
              filtered.map((entry) => {
                const isSelected = selectedFile?.name === entry.name;
                const isHtml = entry.name.endsWith('.html') || entry.name.endsWith('.htm');
                const isStart = entry.name === project?.startPage;

                return (
                  <div
                    key={entry.name}
                    onClick={() => handlePreview(entry)}
                    className={`p-2.5 rounded-xl text-xs cursor-pointer flex items-center justify-between transition-all duration-200 ${
                      isSelected
                        ? 'bg-indigo-500/20 border border-indigo-400/35 text-white'
                        : 'hover:bg-white/[0.04] text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate pr-2">
                      {getFileIcon(entry.name)}
                      <span className="truncate font-mono">{entry.name}</span>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {isStart && (
                        <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded font-semibold">
                          START
                        </span>
                      )}
                      {isHtml && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectPage(entry.name);
                          }}
                          className="p-1 hover:bg-indigo-500/30 text-indigo-300 rounded transition"
                          title="Buka Halaman Ini di Layar HP"
                        >
                          <Play className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* File Preview */}
          <div className="w-1/2 flex flex-col bg-slate-950/40 overflow-hidden">
            {selectedFile ? (
              <div className="flex flex-col h-full">
                <div className="p-3 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
                  <div className="truncate pr-2">
                    <div className="text-xs font-bold text-white truncate font-mono">
                      {selectedFile.name.split('/').pop()}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      {formatSize(selectedFile.size)} • {selectedFile.mimeType}
                    </div>
                  </div>
                  <button
                    onClick={() => downloadSingleFile(selectedFile)}
                    className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-md transition flex items-center gap-1 text-[11px] shrink-0"
                    title="Unduh Berkas Ini"
                  >
                    <Download className="w-3 h-3" />
                    Unduh
                  </button>
                </div>

                <div className="flex-1 p-3 overflow-auto font-mono text-[11px] text-slate-300">
                  {selectedFile.mimeType.startsWith('image/') ? (
                    <div className="flex items-center justify-center h-full p-4">
                      <img
                        src={selectedFile.url}
                        alt={selectedFile.name}
                        className="max-h-64 object-contain rounded-lg border border-slate-800"
                      />
                    </div>
                  ) : fileContent !== null ? (
                    <pre className="whitespace-pre-wrap select-all">{fileContent}</pre>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-slate-500 text-xs">
                      <Eye className="w-6 h-6 mb-2 opacity-50" />
                      Pratinjau tidak tersedia untuk berkas biner.
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-xs text-slate-500 p-6 text-center">
                Pilih berkas di sisi kiri untuk melihat isi atau mengunduh.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
