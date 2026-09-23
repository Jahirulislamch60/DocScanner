import * as FileSystem from "expo-file-system";
import { base64ToBytes } from "./base64";

const UPLOAD_URL =
  "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart";

const BOUNDARY = "docscanner-boundary-7a1f2c";

/**
 * Uploads a single PDF to the signed-in user's Google Drive as a new file
 * (multipart/related upload — metadata + base64 content in one request).
 * Requires only the `drive.file` scope, so this app can see/manage just the
 * files it creates, not the user's whole Drive.
 */
export async function uploadPdfToDrive(
  accessToken: string,
  pdfUri: string,
  fileName: string
): Promise<{ id: string; webViewLink?: string }> {
  const base64 = await FileSystem.readAsStringAsync(pdfUri, {
    encoding: FileSystem.EncodingType.Base64,
  });

  const metadata = JSON.stringify({
    name: fileName.endsWith(".pdf") ? fileName : `${fileName}.pdf`,
    mimeType: "application/pdf",
  });

  const body =
    `--${BOUNDARY}\r\n` +
    `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
    `${metadata}\r\n` +
    `--${BOUNDARY}\r\n` +
    `Content-Type: application/pdf\r\n` +
    `Content-Transfer-Encoding: base64\r\n\r\n` +
    `${base64}\r\n` +
    `--${BOUNDARY}--`;

  const response = await fetch(
    `${UPLOAD_URL}&fields=id,webViewLink`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": `multipart/related; boundary=${BOUNDARY}`,
      },
      body,
    }
  );

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Drive আপলোড ব্যর্থ (${response.status}): ${text}`);
  }

  return response.json();
}

/** Replaces the content of an already-uploaded file (re-backup after edits). */
export async function updateDriveFile(
  accessToken: string,
  fileId: string,
  pdfUri: string
): Promise<void> {
  const base64 = await FileSystem.readAsStringAsync(pdfUri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  const bytes = base64ToBytes(base64);
  // React Native's fetch typings want an ArrayBuffer, not a typed-array
  // view; slice out exactly this view's range in case it's a subarray.
  const arrayBuffer = bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength
  ) as ArrayBuffer;

  const response = await fetch(
    `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/pdf",
      },
      body: arrayBuffer,
    }
  );

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Drive আপডেট ব্যর্থ (${response.status}): ${text}`);
  }
}
