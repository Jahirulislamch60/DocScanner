import { ScanDocument } from "@/types";
import { exportDocumentToPdf } from "./pdf";
import { uploadPdfToDrive, updateDriveFile } from "./googleDrive";
import { checkOnlineNow } from "./network";

export class OfflineError extends Error {
  constructor() {
    super("ইন্টারনেট সংযোগ নেই — অফলাইনে ব্যাকআপ করা যায় না, তবে বাকি সব ফিচার কাজ করবে।");
    this.name = "OfflineError";
  }
}

/**
 * Backs up one document's PDF to Google Drive. Generates the PDF first if
 * it hasn't been exported yet. Re-uploads (PATCH) in place on repeat calls
 * so the same Drive file gets updated rather than duplicated.
 *
 * Everything else in the app (capture, crop, PDF export, OCR, local list)
 * works fully offline — this is the only function that touches the network,
 * and only runs when the user explicitly taps "Backup to Drive".
 */
export async function backupDocumentToDrive(
  doc: ScanDocument,
  accessToken: string
): Promise<ScanDocument> {
  if (!(await checkOnlineNow())) {
    throw new OfflineError();
  }

  const pdfUri = doc.pdfUri ?? (await exportDocumentToPdf(doc));

  if (doc.driveFileId) {
    await updateDriveFile(accessToken, doc.driveFileId, pdfUri);
    return { ...doc, pdfUri, driveSyncedAt: Date.now() };
  }

  const uploaded = await uploadPdfToDrive(accessToken, pdfUri, doc.title);
  return {
    ...doc,
    pdfUri,
    driveFileId: uploaded.id,
    driveSyncedAt: Date.now(),
  };
}

/**
 * Premium feature: back up every local document to Drive in one tap instead
 * of opening each one and backing it up individually (the free-tier flow).
 * Continues past individual failures so one bad document doesn't block the
 * rest; returns which documents succeeded and which didn't.
 */
export async function backupAllDocumentsToDrive(
  docs: ScanDocument[],
  accessToken: string,
  onProgress?: (done: number, total: number) => void
): Promise<{ updated: ScanDocument[]; failed: ScanDocument[] }> {
  if (!(await checkOnlineNow())) {
    throw new OfflineError();
  }

  const updated: ScanDocument[] = [];
  const failed: ScanDocument[] = [];

  for (let i = 0; i < docs.length; i++) {
    try {
      updated.push(await backupDocumentToDrive(docs[i], accessToken));
    } catch {
      failed.push(docs[i]);
    }
    onProgress?.(i + 1, docs.length);
  }

  return { updated, failed };
}
