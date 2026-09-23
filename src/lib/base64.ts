/**
 * Manual base64 <-> Uint8Array helpers. Hermes/React Native do not reliably
 * provide global atob/btoa across all SDK versions, so we avoid depending
 * on them here rather than risk a runtime crash on device.
 */
const CHARS =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

export function base64ToBytes(base64: string): Uint8Array {
  const clean = base64.replace(/[^A-Za-z0-9+/]/g, "");
  const bytes: number[] = [];
  let buffer = 0;
  let bits = 0;

  for (const ch of clean) {
    const value = CHARS.indexOf(ch);
    if (value === -1) continue;
    buffer = (buffer << 6) | value;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      bytes.push((buffer >> bits) & 0xff);
    }
  }

  return Uint8Array.from(bytes);
}

export function bytesToBase64(bytes: Uint8Array): string {
  let result = "";
  let i = 0;

  for (; i + 3 <= bytes.length; i += 3) {
    const chunk = (bytes[i] << 16) | (bytes[i + 1] << 8) | bytes[i + 2];
    result += CHARS[(chunk >> 18) & 63];
    result += CHARS[(chunk >> 12) & 63];
    result += CHARS[(chunk >> 6) & 63];
    result += CHARS[chunk & 63];
  }

  const remaining = bytes.length - i;
  if (remaining === 1) {
    const chunk = bytes[i] << 16;
    result += CHARS[(chunk >> 18) & 63];
    result += CHARS[(chunk >> 12) & 63];
    result += "==";
  } else if (remaining === 2) {
    const chunk = (bytes[i] << 16) | (bytes[i + 1] << 8);
    result += CHARS[(chunk >> 18) & 63];
    result += CHARS[(chunk >> 12) & 63];
    result += CHARS[(chunk >> 6) & 63];
    result += "=";
  }

  return result;
}
