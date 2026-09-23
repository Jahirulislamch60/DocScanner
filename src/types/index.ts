export type ScanPage = {
  id: string;
  uri: string; // local file:// uri of the processed page image
  createdAt: number;
};

export type ScanDocument = {
  id: string;
  title: string;
  pages: ScanPage[];
  createdAt: number;
  updatedAt: number;
  pdfUri?: string; // set once exported
  ocrText?: string; // cached extracted text, if OCR has been run
  driveFileId?: string; // set once backed up to Google Drive
  driveSyncedAt?: number; // timestamp of last successful backup
  folderId?: string; // undefined = "সব ডকুমেন্ট" (unfiled)
};

export type Folder = {
  id: string;
  name: string;
  createdAt: number;
};
