import * as SecureStore from "expo-secure-store";
import * as LocalAuthentication from "expo-local-authentication";

const PIN_KEY = "docscanner:app_pin";

/**
 * In-memory only — resets on every cold start, which is exactly what we
 * want for an app lock (re-lock every time the app is opened/backgrounded
 * long enough for iOS/Android to kill it).
 */
let unlockedThisSession = false;

export function isUnlocked(): boolean {
  return unlockedThisSession;
}

export function markUnlocked() {
  unlockedThisSession = true;
}

export function markLocked() {
  unlockedThisSession = false;
}

export async function isLockEnabled(): Promise<boolean> {
  const pin = await SecureStore.getItemAsync(PIN_KEY);
  return Boolean(pin);
}

export async function setAppPin(pin: string): Promise<void> {
  await SecureStore.setItemAsync(PIN_KEY, pin);
}

export async function disableAppLock(): Promise<void> {
  await SecureStore.deleteItemAsync(PIN_KEY);
  markUnlocked();
}

export async function verifyPin(pin: string): Promise<boolean> {
  const stored = await SecureStore.getItemAsync(PIN_KEY);
  return stored !== null && stored === pin;
}

export async function isBiometricAvailable(): Promise<boolean> {
  const hasHardware = await LocalAuthentication.hasHardwareAsync();
  const isEnrolled = await LocalAuthentication.isEnrolledAsync();
  return hasHardware && isEnrolled;
}

export async function tryBiometricUnlock(): Promise<boolean> {
  const available = await isBiometricAvailable();
  if (!available) return false;

  const result = await LocalAuthentication.authenticateAsync({
    promptMessage: "DocScanner আনলক করুন",
    cancelLabel: "বাতিল",
    disableDeviceFallback: false,
  });

  return result.success;
}
