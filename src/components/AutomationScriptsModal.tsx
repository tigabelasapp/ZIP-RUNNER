import React, { useState } from 'react';
import {
  X,
  Copy,
  Check,
  Download,
  Terminal,
  Cpu,
  ShieldCheck,
  FileArchive,
  Workflow,
  Sparkles
} from 'lucide-react';

interface AutomationScriptsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AutomationScriptsModal: React.FC<AutomationScriptsModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'install' | 'build' | 'workflow' | 'package'>('install');
  const [copied, setCopied] = useState<string | null>(null);

  if (!isOpen) return null;

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const downloadTextFile = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const installScriptContent = `#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# PENGGILAS ZIP RUNNER - Automated Dependency Installer & Environment Setup
# Versi: 0.5.0 Pro
# Target: Ubuntu / Debian / macOS / Arch / WSL / Linux Containers
# ==============================================================================

echo "=========================================================="
echo "⚡ PENGGILAS ZIP-to-WebView Runner: Setup Otomatis Dependensi"
echo "=========================================================="

WORK_DIR="$(cd "$(dirname "\${BASH_SOURCE[0]}")/.." && pwd)"
cd "$WORK_DIR"

ANDROID_SDK_DIR="\${ANDROID_SDK_ROOT:-\${ANDROID_HOME:-$HOME/android-sdk}}"
export ANDROID_HOME="$ANDROID_SDK_DIR"
export ANDROID_SDK_ROOT="$ANDROID_SDK_DIR"

# 1. Cek Java / OpenJDK 17
echo "🔍 [1/4] Memeriksa instalasi Java (JDK 17)..."
if command -v java >/dev/null 2>&1; then
    echo "   Java terdeteksi: $(java -version 2>&1 | head -n 1)"
else
    echo "   Java tidak ditemukan. Menginstal OpenJDK 17..."
    if command -v apt-get >/dev/null 2>&1; then
        sudo apt-get update -qq && sudo apt-get install -y -qq openjdk-17-jdk wget curl unzip
    elif command -v brew >/dev/null 2>&1; then
        brew install openjdk@17
    elif command -v pacman >/dev/null 2>&1; then
        sudo pacman -Sy --noconfirm jdk17-openjdk wget curl unzip
    fi
fi

# 2. Cek & Siapkan Android Command-Line Tools
echo "🔍 [2/4] Memeriksa Android Command-Line Tools & SDK..."
mkdir -p "$ANDROID_HOME/cmdline-tools"

if [ ! -d "$ANDROID_HOME/cmdline-tools/latest" ]; then
    echo "   Mengunduh Android command-line tools resmi..."
    TMP_DL="/tmp/cmdline-tools.zip"
    CMDLINE_URL="https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip"
    if [[ "$OSTYPE" == "darwin"* ]]; then
        CMDLINE_URL="https://dl.google.com/android/repository/commandlinetools-mac-11076708_latest.zip"
    fi
    curl -sS -o "$TMP_DL" "$CMDLINE_URL"
    mkdir -p /tmp/cmdline-extracted
    unzip -q -o "$TMP_DL" -d /tmp/cmdline-extracted
    mv /tmp/cmdline-extracted/cmdline-tools "$ANDROID_HOME/cmdline-tools/latest"
    rm -rf "$TMP_DL" /tmp/cmdline-extracted
    echo "   ✅ Android Command-Line Tools berhasil diinstal di $ANDROID_HOME"
fi

export PATH="$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools:$PATH"

# 3. Menerima Lisensi & Mengunduh Platform 35 dan Build Tools 35.0.0
echo "📥 [3/4] Menginstal Android Platform SDK 35 & Build-Tools 35.0.0..."
if command -v sdkmanager >/dev/null 2>&1; then
    yes | sdkmanager --licenses >/dev/null 2>&1 || true
    sdkmanager --install "platforms;android-35" "build-tools;35.0.0" "platform-tools"
    echo "   ✅ Android SDK Platform 35 & Build Tools siap!"
fi

# 4. Siapkan Gradle Wrapper 8.9
echo "⚙️ [4/4] Menyiapkan Gradle Wrapper 8.9..."
mkdir -p gradle/wrapper
cat << 'EOF' > gradle/wrapper/gradle-wrapper.properties
distributionBase=GRADLE_USER_HOME
distributionPath=wrapper/dists
distributionUrl=https\\://services.gradle.org/distributions/gradle-8.9-bin.zip
networkTimeout=10000
validateDistributionUrl=true
zipStoreBase=GRADLE_USER_HOME
zipStorePath=wrapper/dists
EOF

echo ""
echo "=========================================================="
echo "🎉 SEMUA DEPENDENSI BERHASIL DIINSTAL!"
echo "Untuk mengompilasi APK debug, jalankan:"
echo "   ./scripts/build-apk.sh"
echo "=========================================================="
`;

  const buildScriptContent = `#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# PENGGILAS ZIP RUNNER - One-Command APK Build Script
# ==============================================================================

WORK_DIR="$(cd "$(dirname "\${BASH_SOURCE[0]}")/.." && pwd)"
cd "$WORK_DIR"

echo "⚡ Memulai proses kompilasi APK Debug PENGGILAS ZIP Runner..."

if [ -f "./gradlew" ]; then
    chmod +x ./gradlew
    ./gradlew --no-daemon --stacktrace assembleDebug
elif command -v gradle >/dev/null 2>&1; then
    gradle --no-daemon --stacktrace assembleDebug
else
    echo "❌ Gradle tidak ditemukan. Jalankan ./scripts/install-dependencies.sh terlebih dahulu."
    exit 1
fi

OUTPUT_APK="app/build/outputs/apk/debug/app-debug.apk"
if [ -f "$OUTPUT_APK" ]; then
    mkdir -p release
    cp "$OUTPUT_APK" release/PENGGILAS-ZIP-RUNNER-v0.5.0-debug.apk
    echo "=========================================================="
    echo "✅ SUKSES! APK berhasil dikompilasi:"
    echo "   📁 Lokasi: $WORK_DIR/release/PENGGILAS-ZIP-RUNNER-v0.5.0-debug.apk"
    echo "   📦 Ukuran: $(du -h release/PENGGILAS-ZIP-RUNNER-v0.5.0-debug.apk | cut -f1)"
    echo "=========================================================="
else
    echo "❌ File output APK tidak ditemukan di $OUTPUT_APK"
    exit 1
fi
`;

  const workflowContent = `name: Build ZIP Runner APK
on:
  workflow_dispatch:
  push:
    branches: [ main, master ]
permissions:
  contents: read
jobs:
  build:
    runs-on: ubuntu-latest
    timeout-minutes: 30
    steps:
      - name: Checkout source
        uses: actions/checkout@v4
      - name: Set up JDK 17
        uses: actions/setup-java@v4
        with:
          distribution: temurin
          java-version: '17'
      - name: Set up Android SDK
        uses: android-actions/setup-android@v3
      - name: Install Android SDK platform
        run: sdkmanager "platforms;android-35" "build-tools;35.0.0"
      - name: Set up Gradle 8.9
        uses: gradle/actions/setup-gradle@v4
        with:
          gradle-version: '8.9'
      - name: Build debug APK
        run: gradle --no-daemon --stacktrace assembleDebug
      - name: Verify APK exists
        run: test -s app/build/outputs/apk/debug/app-debug.apk
      - name: Upload APK artifact
        uses: actions/upload-artifact@v4
        with:
          name: PENGGILAS-ZIP-RUNNER-debug-apk
          path: app/build/outputs/apk/debug/app-debug.apk
          if-no-files-found: error
          retention-days: 14
`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-4xl bg-[#0c101b] border border-white/[0.08] rounded-2xl shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06] bg-[#0f1422]/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
              <Terminal className="w-5 h-5 text-indigo-300" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white flex items-center gap-2">
                Pusat Otomasi & Skrip Dependensi
                <span className="text-[10px] font-medium bg-indigo-500/10 text-indigo-300 border border-indigo-500/25 px-2 py-0.5 rounded-full">
                  v0.5.2 PRO
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Skrip instalasi otomatis JDK 17, Android SDK 35, Build-Tools, dan kompilasi APK mandiri.
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

        {/* Tab Buttons */}
        <div className="flex items-center gap-2 px-6 pt-2 bg-[#0a0d15]/50 border-b border-white/[0.06] overflow-x-auto">
          <button
            onClick={() => setActiveTab('install')}
            className={`px-3.5 py-2 text-xs font-medium rounded-t-xl transition-all duration-200 flex items-center gap-2 border-b-2 cursor-pointer ${
              activeTab === 'install'
                ? 'border-indigo-400 text-indigo-200 bg-[#121624]'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            1. install-dependencies.sh
          </button>
          <button
            onClick={() => setActiveTab('build')}
            className={`px-3.5 py-2 text-xs font-medium rounded-t-xl transition-all duration-200 flex items-center gap-2 border-b-2 cursor-pointer ${
              activeTab === 'build'
                ? 'border-indigo-400 text-indigo-200 bg-[#121624]'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            2. build-apk.sh
          </button>
          <button
            onClick={() => setActiveTab('workflow')}
            className={`px-3.5 py-2 text-xs font-medium rounded-t-xl transition-all duration-200 flex items-center gap-2 border-b-2 cursor-pointer ${
              activeTab === 'workflow'
                ? 'border-indigo-400 text-indigo-200 bg-[#121624]'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Workflow className="w-3.5 h-3.5" />
            3. GitHub Actions CI/CD
          </button>
          <button
            onClick={() => setActiveTab('package')}
            className={`px-3.5 py-2 text-xs font-medium rounded-t-xl transition-all duration-200 flex items-center gap-2 border-b-2 cursor-pointer ${
              activeTab === 'package'
                ? 'border-emerald-400 text-emerald-300 bg-[#121624]'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileArchive className="w-3.5 h-3.5" />
            Paket ZIP Lengkap Source Code
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 p-6 overflow-y-auto bg-[#090c13]/70">
          {activeTab === 'install' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white">Skrip Otomasi Instalasi Dependensi</h3>
                  <p className="text-xs text-slate-400">
                    Mengecek dan memasang OpenJDK 17, Android SDK cmdline-tools, platform 35, serta menerima lisensi otomatis.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => copyToClipboard(installScriptContent, 'install')}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium flex items-center gap-1.5 transition"
                  >
                    {copied === 'install' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied === 'install' ? 'Tersalin!' : 'Salin Skrip'}
                  </button>
                  <button
                    onClick={() => downloadTextFile(installScriptContent, 'install-dependencies.sh')}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-medium flex items-center gap-1.5 transition"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Unduh .sh
                  </button>
                </div>
              </div>

              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs font-mono text-slate-300 overflow-x-auto max-h-80 select-all">
                <pre>{installScriptContent}</pre>
              </div>

              <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-xs text-indigo-300 flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                <div>
                  <strong>Cara Menjalankan:</strong> Simpan skrip sebagai <code>install-dependencies.sh</code> di folder proyek, lalu jalankan:
                  <div className="bg-slate-950/80 p-2 rounded mt-1 font-mono text-slate-200">
                    chmod +x scripts/install-dependencies.sh && ./scripts/install-dependencies.sh
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'build' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white">Skrip Build APK Satu Perintah</h3>
                  <p className="text-xs text-slate-400">
                    Menjalankan kompilasi Gradle assembleDebug dan menyimpan berkas siap pasang ke direktori <code>release/</code>.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => copyToClipboard(buildScriptContent, 'build')}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium flex items-center gap-1.5 transition"
                  >
                    {copied === 'build' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied === 'build' ? 'Tersalin!' : 'Salin Skrip'}
                  </button>
                  <button
                    onClick={() => downloadTextFile(buildScriptContent, 'build-apk.sh')}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-medium flex items-center gap-1.5 transition"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Unduh .sh
                  </button>
                </div>
              </div>

              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs font-mono text-slate-300 overflow-x-auto max-h-80 select-all">
                <pre>{buildScriptContent}</pre>
              </div>

              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs text-emerald-300 flex items-start gap-2">
                <Sparkles className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <strong>Output File:</strong> File APK hasil kompilasi langsung siap install di Android:
                  <div className="bg-slate-950/80 p-2 rounded mt-1 font-mono text-emerald-200">
                    release/PENGGILAS-ZIP-RUNNER-v0.5.0-debug.apk
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'workflow' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white">GitHub Actions Automated Cloud Build</h3>
                  <p className="text-xs text-slate-400">
                    Letakkan berkas ini di <code>.github/workflows/build-apk.yml</code> untuk kompilasi APK otomatis di GitHub tanpa perlu pasang SDK di laptop.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => copyToClipboard(workflowContent, 'workflow')}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium flex items-center gap-1.5 transition"
                  >
                    {copied === 'workflow' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied === 'workflow' ? 'Tersalin!' : 'Salin YAML'}
                  </button>
                  <button
                    onClick={() => downloadTextFile(workflowContent, 'build-apk.yml')}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-medium flex items-center gap-1.5 transition"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Unduh .yml
                  </button>
                </div>
              </div>

              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs font-mono text-slate-300 overflow-x-auto max-h-80 select-all">
                <pre>{workflowContent}</pre>
              </div>
            </div>
          )}

          {activeTab === 'package' && (
            <div className="space-y-4">
              <div className="p-5 bg-gradient-to-r from-indigo-950/60 to-purple-950/60 border border-indigo-500/30 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center shrink-0">
                    <FileArchive className="w-7 h-7 text-indigo-400" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">
                      ZIP-to-WebView-Runner-v0.5.0-PRO-PENGGILAS.zip
                    </h3>
                    <p className="text-xs text-slate-300 mt-0.5">
                      Paket source code Android lengkap yang sudah diperbaiki: Mode Immersive otomatis, Cetak & Download PDF langsung, jembatan bridge, dan skrip otomasi.
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-[11px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded">Kotlin 2.0.21</span>
                      <span className="text-[11px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded">SDK 35</span>
                      <span className="text-[11px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded font-semibold">Siap Kompilasi</span>
                    </div>
                  </div>
                </div>

                <a
                  href="/assets/ZIP-to-WebView-Runner-v0.5.0-PRO-PENGGILAS.zip"
                  download="ZIP-to-WebView-Runner-v0.5.0-PRO-PENGGILAS.zip"
                  className="px-5 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-lg transition flex items-center gap-2 shrink-0 text-sm"
                >
                  <Download className="w-4 h-4" />
                  Unduh Source ZIP (766 KB)
                </a>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-slate-300">
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                  <div className="font-semibold text-white mb-1">🌟 Perubahan Terkini di v0.5.0:</div>
                  <ul className="list-disc list-inside space-y-1 text-slate-400">
                    <li>Mode immersive edge-to-edge otomatis saat aplikasi dibuka.</li>
                    <li>Ekspor PDF langsung via MediaStore tanpa popup printer.</li>
                    <li>Penanganan intent untuk membuka file ZIP langsung dari File Manager.</li>
                    <li>Micro-cache in-memory LocalServer untuk render instan.</li>
                  </ul>
                </div>
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                  <div className="font-semibold text-white mb-1">🛡️ Struktur Berkas Aman:</div>
                  <ul className="list-disc list-inside space-y-1 text-slate-400">
                    <li>Membaca ZIP langsung tanpa diekstrak ke disk.</li>
                    <li>Pencegahan path traversal <code>..</code> dan entri berbahaya.</li>
                    <li>Dukungan multi-page, modul JS ES, font, dan iframe.</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold transition"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
