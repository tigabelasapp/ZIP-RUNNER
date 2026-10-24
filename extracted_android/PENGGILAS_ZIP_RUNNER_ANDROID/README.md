# ZIP-to-WebView Runner v0.5.0 — PENGGILAS PRO

Native Android app that serves HTML/CSS/JavaScript projects from a selected ZIP archive through a loopback HTTP server and Android WebView with automatic edge-to-edge immersive mode and direct PDF export.

## Fitur Unggulan v0.5.0 Pro
- **Mode Immersive Otomatis**: Saat aplikasi dibuka atau file ZIP dimuat, layar langsung masuk ke immersive fullscreen HP (menyembunyikan status bar dan bar navigasi sistem secara halus).
- **Cetak & Unduh Laporan PDF Instan**:
  - `window.print()` otomatis ditangkap dan diarahkan ke Android PrintManager (ukuran ISO A4).
  - Jembatan `ZipRunnerBridge.savePdf(fileName, content)` dan `window.exportPdf(...)` untuk unduh PDF langsung ke folder Download tanpa harus lewat dialog printer.
  - Dukungan dokumen di dalam `<iframe>` (misalnya nota kasir, invoice, dan laporan tabel).
- **Skrip Otomasi Instalasi Dependensi**:
  - File `scripts/install-dependencies.sh` yang secara otomatis menginstal JDK 17, Android SDK cmdline-tools, platform 35, dan build-tools.
  - File `scripts/build-apk.sh` untuk kompilasi APK satu perintah.
- **Integrasi Sistem Berkas & Cache Berperforma Tinggi**:
  - Berkas dibaca langsung dari arsip ZIP tanpa diekstrak ke disk storage.
  - Micro-cache memori internal untuk file teks, JS, CSS, dan SVG kecil agar render instan tanpa jeda I/O berulang.
- **Mendukung Intent Android**:
  - File ZIP dapat dibuka langsung dari File Manager, WhatsApp, Telegram, atau browser melalui aksi "Open with...".
- **Navigasi Intuitif**:
  - Tombol Back Android menavigasi riwayat halaman web, dan kembali ke pemilih ZIP saat berada di halaman awal.

## Cara Build APK Cepat
### Opsi 1: Otomasi Skrip Lokal
```bash
# 1. Jalankan instalasi dependensi (hanya perlu sekali)
chmod +x scripts/*.sh
./scripts/install-dependencies.sh

# 2. Kompilasi APK Debug
./scripts/build-apk.sh
```
File APK akan tersimpan di: `release/PENGGILAS-ZIP-RUNNER-v0.5.0-debug.apk`

### Opsi 2: GitHub Actions (Cloud Builder Otomatis)
1. Unggah seluruh isi folder proyek ini ke repositori GitHub Anda.
2. Buka tab **Actions** dan jalankan workflow **Build ZIP Runner APK**.
3. Unduh berkas `PENGGILAS-ZIP-RUNNER-debug-apk` setelah build selesai.