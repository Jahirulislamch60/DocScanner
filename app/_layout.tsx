import { useEffect, useRef } from "react";
import { AppState, AppStateStatus } from "react-native";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { isLockEnabled, isUnlocked, markLocked } from "@/lib/appLock";

function LockGate() {
  const router = useRouter();
  const segments = useSegments();
  const appState = useRef(AppState.currentState);

  const checkLock = async () => {
    const enabled = await isLockEnabled();
    const onLockScreen = segments[0] === "lock";
    if (enabled && !isUnlocked() && !onLockScreen) {
      router.replace("/lock");
    }
  };

  useEffect(() => {
    checkLock();
  }, [segments]);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (next: AppStateStatus) => {
      // Re-lock whenever the app goes to the background — the next
      // foreground render's checkLock() will route to /lock if needed.
      if (appState.current === "active" && next.match(/inactive|background/)) {
        markLocked();
      }
      appState.current = next;
    });
    return () => sub.remove();
  }, []);

  return null;
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="light" />
        <LockGate />
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: "#0F172A" },
            headerTintColor: "#F8FAFC",
            headerTitleStyle: { fontWeight: "600" },
            contentStyle: { backgroundColor: "#0F172A" },
          }}
        >
          <Stack.Screen name="index" options={{ title: "ডকুমেন্ট স্ক্যানার" }} />
          <Stack.Screen name="scan" options={{ title: "স্ক্যান করুন", headerShown: false }} />
          <Stack.Screen name="scan-manual" options={{ title: "ম্যানুয়াল স্ক্যান", headerShown: false }} />
          <Stack.Screen name="preview/[id]" options={{ title: "প্রিভিউ" }} />
          <Stack.Screen name="settings" options={{ title: "সেটিংস" }} />
          <Stack.Screen name="lock" options={{ title: "আনলক করুন", headerShown: false }} />
        </Stack>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
