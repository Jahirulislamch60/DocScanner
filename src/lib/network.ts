import { useEffect, useState } from "react";
import * as Network from "expo-network";

/**
 * Polling-based connectivity hook (expo-network has no push/subscribe API,
 * so we check periodically and whenever the screen using it wants a fresh
 * read via `refresh`). Good enough for gating a manual "backup" button —
 * we don't need instant reactivity, just an accurate answer at tap time.
 */
export function useIsOnline(pollMs = 5000) {
  const [isOnline, setIsOnline] = useState(true);

  const refresh = async () => {
    try {
      const state = await Network.getNetworkStateAsync();
      setIsOnline(Boolean(state.isConnected && state.isInternetReachable !== false));
    } catch {
      // If the check itself fails, don't block the user — cloud calls will
      // surface their own error if there's really no connection.
      setIsOnline(true);
    }
  };

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, pollMs);
    return () => clearInterval(interval);
  }, [pollMs]);

  return { isOnline, refresh };
}

export async function checkOnlineNow(): Promise<boolean> {
  try {
    const state = await Network.getNetworkStateAsync();
    return Boolean(state.isConnected && state.isInternetReachable !== false);
  } catch {
    return true;
  }
}
