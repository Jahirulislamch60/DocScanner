import { useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator, Pressable } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as FileSystem from "expo-file-system";
import { scanWithNativeEdgeDetection } from "@/lib/documentScanner";
import { processPage } from "@/lib/imageProcessing";
import { saveDocument, getDocument, newId, ensureDocsDir, DOCS_DIR } from "@/lib/storage";
import { ScanDocument, ScanPage } from "@/types";

type Phase = "starting" | "processing" | "error" | "empty";

/**
 * Primary scan entry point: launches the OS-native document scanner
 * (auto edge detection + perspective correction — see documentScanner.ts).
 * Falls back to a plain manual camera (/scan-manual) when the native
 * module isn't available, e.g. running inside Expo Go.
 */
export default function ScanScreen() {
  const router = useRouter();
  const { docId, folderId } = useLocalSearchParams<{ docId?: string; folderId?: string }>();
  const [phase, setPhase] = useState<Phase>("starting");
  const [errorMessage, setErrorMessage] = useState("");
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    run();
  }, []);

  const run = async () => {
    try {
      const rawUris = await scanWithNativeEdgeDetection();

      if (rawUris.length === 0) {
        setPhase("empty");
        router.back();
        return;
      }

      setPhase("processing");
      await ensureDocsDir();

      const pages: ScanPage[] = [];
      for (const uri of rawUris) {
        const processedUri = await processPage(uri); // resize/compress only — already cropped
        const id = newId();
        const finalUri = `${DOCS_DIR}${id}.jpg`;
        await FileSystem.copyAsync({ from: processedUri, to: finalUri });
        pages.push({ id, uri: finalUri, createdAt: Date.now() });
      }

      const now = Date.now();

      if (docId) {
        const existing = await getDocument(docId);
        if (existing) {
          await saveDocument({
            ...existing,
            pages: [...existing.pages, ...pages],
            updatedAt: now,
          });
          router.replace(`/preview/${docId}`);
          return;
        }
      }

      const doc: ScanDocument = {
        id: newId(),
        title: `স্ক্যান ${new Date(now).toLocaleDateString("bn-BD")}`,
        pages,
        createdAt: now,
        updatedAt: now,
        folderId: folderId || undefined,
      };
      await saveDocument(doc);
      router.replace(`/preview/${doc.id}`);
    } catch (e) {
      console.warn("Native scan failed", e);
      setErrorMessage(
        "নেটিভ স্ক্যানার চালু করা যায়নি। এটি সম্ভবত Expo Go-তে চলছেন বলে হচ্ছে — dev build লাগবে, অথবা নিচে ম্যানুয়াল ক্যামেরা ব্যবহার করুন।"
      );
      setPhase("error");
    }
  };

  if (phase === "error") {
    return (
      <View style={styles.container}>
        <Ionicons name="alert-circle-outline" size={48} color="#FBBF24" />
        <Text style={styles.errorText}>{errorMessage}</Text>
        <Pressable
          style={styles.manualBtn}
          onPress={() =>
            router.replace({
              pathname: "/scan-manual",
              params: { docId: docId ?? "", folderId: folderId ?? "" },
            })
          }
        >
          <Ionicons name="camera-outline" size={18} color="#0F172A" />
          <Text style={styles.manualBtnText}>ম্যানুয়াল ক্যামেরা ব্যবহার করুন</Text>
        </Pressable>
        <Pressable style={styles.cancelBtn} onPress={() => router.back()}>
          <Text style={styles.cancelBtnText}>বাতিল</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#38BDF8" />
      <Text style={styles.statusText}>
        {phase === "processing" ? "পৃষ্ঠা প্রসেস করা হচ্ছে..." : "স্ক্যানার চালু হচ্ছে..."}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0F172A",
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
    paddingHorizontal: 32,
  },
  statusText: { color: "#94A3B8" },
  errorText: { color: "#E2E8F0", textAlign: "center", lineHeight: 20 },
  manualBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#38BDF8",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 8,
  },
  manualBtnText: { color: "#0F172A", fontWeight: "700" },
  cancelBtn: { paddingVertical: 10 },
  cancelBtnText: { color: "#94A3B8" },
});
