import TextRecognition from "@react-native-ml-kit/text-recognition";

/**
 * On-device OCR for a single page image. Uses Google ML Kit on Android and
 * Apple Vision (via the same JS API) on iOS — both fully on-device, no
 * network call, so it works offline and keeps documents private.
 *
 * IMPORTANT: this native module cannot run inside Expo Go. It requires a
 * custom dev client / EAS build (see README "Running the app").
 */
export async function recognizeText(imageUri: string): Promise<string> {
  const result = await TextRecognition.recognize(imageUri);
  return result.text;
}

export async function recognizeTextForPages(uris: string[]): Promise<string> {
  const texts = await Promise.all(uris.map((u) => recognizeText(u)));
  return texts.join("\n\n--- Page Break ---\n\n");
}
