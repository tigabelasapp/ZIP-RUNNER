#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# PENGGILAS ZIP RUNNER - Automated APK Build Script
# ==============================================================================

WORK_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
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
