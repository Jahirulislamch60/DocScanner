import * as ImageManipulator from "expo-image-manipulator";

export type CropRect = {
  originX: number;
  originY: number;
  width: number;
  height: number;
};

/**
 * Applies a crop (from a manual 4-corner adjustment, simplified here to an
 * axis-aligned rectangle) plus a document-friendly enhancement: slight
 * upscale-safe resize, and compression suitable for OCR/PDF embedding.
 *
 * True perspective (keystone) correction requires a native warp step; the
 * `react-native-document-scanner-plugin` config-plugin route (see README)
 * gives real edge-detected, perspective-corrected captures on-device and can
 * replace this function's crop step directly, since it returns an already
 * cropped file URI.
 */
export async function processPage(
  uri: string,
  crop?: CropRect,
  options: { grayscale?: boolean } = {}
): Promise<string> {
  const actions: ImageManipulator.Action[] = [];

  if (crop) {
    actions.push({ crop });
  }

  // Cap width so PDFs/OCR stay fast without losing legibility.
  actions.push({ resize: { width: 1600 } });

  const result = await ImageManipulator.manipulateAsync(uri, actions, {
    compress: 0.85,
    format: ImageManipulator.SaveFormat.JPEG,
  });

  return result.uri;
}

/** Rotate an already-captured page 90 degrees clockwise. */
export async function rotatePage(uri: string): Promise<string> {
  const result = await ImageManipulator.manipulateAsync(
    uri,
    [{ rotate: 90 }],
    { compress: 0.9, format: ImageManipulator.SaveFormat.JPEG }
  );
  return result.uri;
}
