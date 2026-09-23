import { Platform } from "react-native";
import Constants from "expo-constants";
import Purchases, {
  CustomerInfo,
  PurchasesOffering,
  PurchasesPackage,
} from "react-native-purchases";

/**
 * Optional premium subscription, powered by RevenueCat (a single API on top
 * of Google Play Billing + Apple StoreKit — no custom backend needed).
 *
 * This is entirely OPT-IN: nothing in the app is locked behind it, no nag
 * screens, no forced trial. Until a real RevenueCat API key is put in
 * app.json → expo.extra.revenueCat, every function here silently no-ops and
 * the app behaves exactly like the free version.
 *
 * Setup (done once, outside this codebase, by the app owner):
 *  1. Create a free account at https://app.revenuecat.com
 *  2. Add the app there, connect it to a Google Play Console app + an App
 *     Store Connect app (each needs its own developer account).
 *  3. In Play Console / App Store Connect, create a subscription product
 *     (e.g. "scanvexa_premium_monthly") and attach it to an "premium"
 *     entitlement in RevenueCat.
 *  4. Copy RevenueCat's iOS and Android public SDK keys into
 *     app.json → expo.extra.revenueCat.{ios,android}.
 *  5. Rebuild the dev client (`eas build --profile development`) — IAP is
 *     native code, it will not work inside Expo Go.
 */

const PREMIUM_ENTITLEMENT_ID = "premium";

let initialized = false;

function getApiKey(): string | null {
  const keys = Constants.expoConfig?.extra?.revenueCat as
    | { ios?: string; android?: string }
    | undefined;
  if (!keys) return null;
  const key = Platform.OS === "ios" ? keys.ios : keys.android;
  if (!key || key.startsWith("YOUR_")) return null;
  return key;
}

/** Call once near app startup (see app/_layout.tsx). Safe to call multiple
 *  times; safe to call with no API key configured. */
export async function initPurchases(): Promise<void> {
  if (initialized) return;
  const apiKey = getApiKey();
  if (!apiKey) return;
  try {
    Purchases.configure({ apiKey });
    initialized = true;
  } catch {
    // Native module not available (e.g. running in Expo Go) — ignore.
  }
}

/** Whether a real RevenueCat key is configured, i.e. whether the premium
 *  screen should offer a real "Subscribe" button at all. */
export function isPurchasesConfigured(): boolean {
  return initialized;
}

export async function isPremiumUser(): Promise<boolean> {
  if (!initialized) return false;
  try {
    const info = await Purchases.getCustomerInfo();
    return Boolean(info.entitlements.active[PREMIUM_ENTITLEMENT_ID]);
  } catch {
    return false;
  }
}

/** The current default offering configured in RevenueCat (usually one
 *  monthly + one yearly package), or null if not configured / not loaded. */
export async function getPremiumOffering(): Promise<PurchasesOffering | null> {
  if (!initialized) return null;
  try {
    const offerings = await Purchases.getOfferings();
    return offerings.current ?? null;
  } catch {
    return null;
  }
}

export async function purchasePremium(pkg: PurchasesPackage): Promise<boolean> {
  const { customerInfo } = await Purchases.purchasePackage(pkg);
  return Boolean(customerInfo.entitlements.active[PREMIUM_ENTITLEMENT_ID]);
}

export async function restorePurchases(): Promise<boolean> {
  if (!initialized) return false;
  const info: CustomerInfo = await Purchases.restorePurchases();
  return Boolean(info.entitlements.active[PREMIUM_ENTITLEMENT_ID]);
}
