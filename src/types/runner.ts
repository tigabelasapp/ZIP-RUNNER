export interface ZipFileEntry {
  name: string;
  size: number;
  compressedSize: number;
  isDirectory: boolean;
  blob?: Blob;
  url?: string;
  mimeType: string;
}

export interface LoadedProject {
  fileName: string;
  fileSize: number;
  entryCount: number;
  startPage: string;
  entries: Map<string, ZipFileEntry>;
  indexUrl: string;
  loadedAt: Date;
  rawZipBlob: Blob;
}

export interface PhoneSettings {
  deviceType: 'android-flagship' | 'compact-phone' | 'tablet';
  isLandscape: boolean;
  immersiveMode: boolean; // hide status bar and nav bar
  showDeviceFrame: boolean;
  autoFullscreenOnZip: boolean;
  autoInjectDependencies: boolean;
  networkOffline: boolean;
}

export interface ReportConfig {
  title: string;
  subtitle: string;
  pageSize: 'a4' | 'letter' | 'receipt-80mm';
  orientation: 'portrait' | 'landscape';
  includeHeader: boolean;
  includeFooter: boolean;
  themeColor: string;
}
