import DocumentScanner from "react-native-document-scanner-plugin";

/**
 * Launches the OS-native document scanner UI:
 *  - Android: Google ML Kit Document Scanner (auto edge detection,
 *    perspective/"keystone" correction, multi-page capture, built-in
 *    cleanup filters) — Google's own official on-device scanning API.
 *  - iOS: Apple VisionKit's VNDocumentCameraViewController — same engine
 *    behind Apple's own Notes scanner.
 *
 * Both already return cropped, perspective-corrected page images, so no
 * manual crop step is needed afterwards — only resize/compress.
 *
 * IMPORTANT: this is a native module and cannot run inside Expo Go. It
 * needs a dev client / EAS build (see README).
 */
export async function scanWithNativeEdgeDetection(
  maxPages = 20
): Promise<string[]> {
  const { scannedImages, status } = await DocumentScanner.scanDocument({
    maxNumDocuments: maxPages,
    croppedImageQuality: 90,
  });

  if (status === "cancel" || !scannedImages || scannedImages.length === 0) {
    return [];
  }

  return scannedImages;
}
