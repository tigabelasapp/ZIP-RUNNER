#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# PENGGILAS ZIP RUNNER - Automated Dependency Installer & Environment Setup
# Versi: 0.5.0 Pro
# Target: Ubuntu / Debian / macOS / Arch / WSL / Linux Containers
# ==============================================================================

echo "=========================================================="
echo "⚡ PENGGILAS ZIP-to-WebView Runner: Setup Otomatis Dependensi"
echo "=========================================================="

WORK_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$WORK_DIR"

ANDROID_SDK_DIR="${ANDROID_SDK_ROOT:-${ANDROID_HOME:-$HOME/android-sdk}}"
export ANDROID_HOME="$ANDROID_SDK_DIR"
export ANDROID_SDK_ROOT="$ANDROID_SDK_DIR"

# 1. Cek Java / OpenJDK 17
echo "🔍 [1/4] Memeriksa instalasi Java (JDK 17)..."
if command -v java >/dev/null 2>&1; then
    JAVA_VER=$(java -version 2>&1 | head -n 1 | awk -F '"' '{print $2}' | cut -d'.' -f1)
    echo "   Java terdeteksi: $(java -version 2>&1 | head -n 1)"
else
    echo "   Java tidak ditemukan. Menginstal OpenJDK 17..."
    if command -v apt-get >/dev/null 2>&1; then
        sudo apt-get update -qq && sudo apt-get install -y -qq openjdk-17-jdk wget curl unzip
    elif command -v brew >/dev/null 2>&1; then
        brew install openjdk@17
    elif command -v pacman >/dev/null 2>&1; then
        sudo pacman -Sy --noconfirm jdk17-openjdk wget curl unzip
    else
        echo "   ⚠️ Harap pasang OpenJDK 17 secara manual untuk distribusi Anda."
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
else
    echo "   ⚠️ sdkmanager belum terdeteksi di PATH saat ini."
fi

# 4. Siapkan Gradle Wrapper jika belum ada
echo "⚙️ [4/4] Menyiapkan Gradle Wrapper 8.9..."
mkdir -p gradle/wrapper
cat << 'EOF' > gradle/wrapper/gradle-wrapper.properties
distributionBase=GRADLE_USER_HOME
distributionPath=wrapper/dists
distributionUrl=https\://services.gradle.org/distributions/gradle-8.9-bin.zip
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
echo "atau di GitHub Actions: Jalankan workflow 'Build ZIP Runner APK'"
echo "=========================================================="
