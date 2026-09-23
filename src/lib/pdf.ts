import * as FileSystem from "expo-file-system";
import { PDFDocument } from "pdf-lib";
import { ScanDocument } from "@/types";
import { DOCS_DIR, ensureDocsDir } from "./storage";
import { base64ToBytes, bytesToBase64 } from "./base64";

/**
 * Builds a multi-page PDF from a document's page images and writes it to
 * the app's private documents folder. Returns the file:// URI of the PDF.
 */
export async function exportDocumentToPdf(doc: ScanDocument): Promise<string> {
  await ensureDocsDir();

  const pdf = await PDFDocument.create();

  for (const page of doc.pages) {
    const base64 = await FileSystem.readAsStringAsync(page.uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    const bytes = base64ToBytes(base64);

    // JPEG output from imageProcessing.ts; embed accordingly.
    const image = await pdf.embedJpg(bytes);
    const { width, height } = image.scaleToFit(595, 842); // fit to A4 @ 72dpi
    const pdfPage = pdf.addPage([595, 842]);
    pdfPage.drawImage(image, {
      x: (595 - width) / 2,
      y: (842 - height) / 2,
      width,
      height,
    });
  }

  const pdfBytes = await pdf.save();
  const pdfBase64 = bytesToBase64(pdfBytes);

  const outPath = `${DOCS_DIR}${doc.id}.pdf`;
  await FileSystem.writeAsStringAsync(outPath, pdfBase64, {
    encoding: FileSystem.EncodingType.Base64,
  });

  return outPath;
}
