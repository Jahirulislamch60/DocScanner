import { useEffect, useRef } from "react";
import { AppState, AppStateStatus, Alert } from "react-native";
import * as Updates from "expo-updates";

/**
 * Over-the-air (OTA) update check — lets us push JS/asset changes (bug fixes,
 * small tweaks) straight to phones that already have the app installed,
 * without going through a new Play Store / App Store release.
 *
 * Native-code changes (a new native module, permission, or SDK version) are
 * NOT covered by this — those still need a normal store update. This only
 * ships JS bundle + asset changes within the same "runtime version" (see
 * app.json's `runtimeVersion` policy).
 *
 * Safe no-op in Expo Go / local dev builds, where `Updates.isEnabled` is
 * false — every function below checks that first.
 */

export type UpdateCheckResult =
  | { status: "disabled" }
  | { status: "up-to-date" }
  | { status: "available" }
  | { status: "error"; error: unknown };

/** Checks the configured EAS Update channel for a newer published update. */
export async function checkForUpdate(): Promise<UpdateCheckResult> {
  if (!Updates.isEnabled) {
    return { status: "disabled" };
  }
  try {
    const result = await Updates.checkForUpdateAsync();
    return result.isAvailable ? { status: "available" } : { status: "up-to-date" };
  } catch (e) {
    // Network hiccup, or offline — this is expected often, since the app is
    // designed to work fully offline. Never block the user on this.
    console.warn("Update check failed (probably offline)", e);
    return { status: "error", error: e };
  }
}

/**
 * Downloads the newest published update in the background and restarts the
 * app to apply it. Call this only after checkForUpdate() returned
 * "available", ideally with the user's confirmation (see useAppUpdate()).
 */
export async function downloadAndApplyUpdate(): Promise<boolean> {
  if (!Updates.isEnabled) return false;
  try {
    await Updates.fetchUpdateAsync();
    await Updates.reloadAsync();
    return true;
  } catch (e) {
    console.warn("Failed to download/apply update", e);
    return false;
  }
}

/** Human-readable info for a settings-screen "current version" row. */
export function getUpdateInfo() {
  return {
    isEnabled: Updates.isEnabled,
    updateId: Updates.updateId,
    channel: Updates.channel,
    runtimeVersion: Updates.runtimeVersion,
    createdAt: Updates.createdAt,
  };
}

async function checkDownloadAndPrompt() {
  const check = await checkForUpdate();
  if (check.status !== "available") return;

  // Download it in the background first, so the restart (if the user says
  // yes) is instant rather than waiting on the network.
  if (!Updates.isEnabled) return;
  try {
    await Updates.fetchUpdateAsync();
  } catch (e) {
    console.warn("Background update download failed", e);
    return;
  }

  Alert.alert(
    "নতুন আপডেট এসেছে",
    "অ্যাপের একটি নতুন সংস্করণ ডাউনলোড হয়ে গেছে। এখনই চালু করবেন?",
    [
      { text: "পরে", style: "cancel" },
      {
        text: "এখনই",
        onPress: () => {
          Updates.reloadAsync().catch((e) =>
            console.warn("Reload after update failed", e)
          );
        },
      },
    ]
  );
}

/**
 * Drop this in the root layout: silently checks for a new OTA update on
 * app launch and every time the app comes back to the foreground, and asks
 * the user (in Bengali) whether to apply it now or on the next natural
 * restart. Fully offline-safe — a failed/absent network check just no-ops.
 */
export function useAutoUpdateCheck() {
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    // Don't block first paint — check shortly after launch.
    const initialTimer = setTimeout(() => {
      checkDownloadAndPrompt();
    }, 2000);

    const sub = AppState.addEventListener("change", (next: AppStateStatus) => {
      if (appState.current.match(/inactive|background/) && next === "active") {
        checkDownloadAndPrompt();
      }
      appState.current = next;
    });

    return () => {
      clearTimeout(initialTimer);
      sub.remove();
    };
  }, []);
}
