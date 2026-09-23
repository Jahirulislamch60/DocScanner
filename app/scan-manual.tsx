import { useRef, useState } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Image,
  FlatList,
  ActivityIndicator,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as FileSystem from "expo-file-system";
import { processPage } from "@/lib/imageProcessing";
import { saveDocument, getDocument, newId, ensureDocsDir, DOCS_DIR } from "@/lib/storage";
import { ScanDocument, ScanPage } from "@/types";

export default function ScanManualScreen() {
  const router = useRouter();
  const { docId, folderId } = useLocalSearchParams<{ docId?: string; folderId?: string }>();
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [pages, setPages] = useState<ScanPage[]>([]);
  const [capturing, setCapturing] = useState(false);
  const [finishing, setFinishing] = useState(false);

  if (!permission) {
    return <View style={styles.container} />;
  }

  if (!permission.granted) {
    return (
      <View style={[styles.container, styles.center]}>
        <Ionicons name="camera-outline" size={48} color="#94A3B8" />
        <Text style={styles.permText}>স্ক্যান করার জন্য ক্যামেরা অনুমতি প্রয়োজন</Text>
        <Pressable style={styles.permButton} onPress={requestPermission}>
          <Text style={styles.permButtonText}>অনুমতি দিন</Text>
        </Pressable>
      </View>
    );
  }

  const capture = async () => {
    if (!cameraRef.current || capturing) return;
    setCapturing(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.9 });
      if (!photo) return;

      await ensureDocsDir();
      const processedUri = await processPage(photo.uri);

      // Persist the processed page into our own storage dir so it survives
      // cache clears / OS temp-file cleanup.
      const id = newId();
      const finalUri = `${DOCS_DIR}${id}.jpg`;
      await FileSystem.copyAsync({ from: processedUri, to: finalUri });

      setPages((prev) => [
        ...prev,
        { id, uri: finalUri, createdAt: Date.now() },
      ]);
    } catch (e) {
      console.warn("Capture failed", e);
    } finally {
      setCapturing(false);
    }
  };

  const removePage = (id: string) => {
    setPages((prev) => prev.filter((p) => p.id !== id));
  };

  const finish = async () => {
    if (pages.length === 0) return;
    setFinishing(true);
    const now = Date.now();

    if (docId) {
      const existing = await getDocument(docId);
      if (existing) {
        const updated: ScanDocument = {
          ...existing,
          pages: [...existing.pages, ...pages],
          updatedAt: now,
        };
        await saveDocument(updated);
        setFinishing(false);
        router.replace(`/preview/${updated.id}`);
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
    setFinishing(false);
    router.replace(`/preview/${doc.id}`);
  };

  return (
    <View style={styles.container}>
      <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="back">
        <View style={styles.guideFrame} pointerEvents="none" />
      </CameraView>

      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} style={styles.iconButton}>
          <Ionicons name="close" size={24} color="#F8FAFC" />
        </Pressable>
        <Text style={styles.pageCount}>{pages.length} পৃষ্ঠা যোগ হয়েছে</Text>
        <View style={{ width: 40 }} />
      </View>

      {pages.length > 0 && (
        <FlatList
          horizontal
          data={pages}
          keyExtractor={(p) => p.id}
          style={styles.thumbStrip}
          contentContainerStyle={{ gap: 8, paddingHorizontal: 12 }}
          renderItem={({ item }) => (
            <Pressable onLongPress={() => removePage(item.id)}>
              <Image source={{ uri: item.uri }} style={styles.thumb} />
            </Pressable>
          )}
        />
      )}

      <View style={styles.bottomBar}>
        <View style={{ width: 64 }} />
        <Pressable
          style={styles.shutter}
          onPress={capture}
          disabled={capturing}
        >
          {capturing ? (
            <ActivityIndicator color="#0F172A" />
          ) : (
            <View style={styles.shutterInner} />
          )}
        </Pressable>
        <Pressable
          style={[styles.doneButton, pages.length === 0 && { opacity: 0.4 }]}
          onPress={finish}
          disabled={pages.length === 0 || finishing}
        >
          {finishing ? (
            <ActivityIndicator color="#0F172A" />
          ) : (
            <Text style={styles.doneText}>শেষ</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  center: { alignItems: "center", justifyContent: "center", gap: 12, paddingHorizontal: 32 },
  permText: { color: "#CBD5E1", textAlign: "center" },
  permButton: {
    backgroundColor: "#38BDF8",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  permButtonText: { color: "#0F172A", fontWeight: "700" },
  guideFrame: {
    position: "absolute",
    top: "12%",
    left: "6%",
    right: "6%",
    bottom: "22%",
    borderWidth: 2,
    borderColor: "rgba(56,189,248,0.85)",
    borderRadius: 12,
  },
  topBar: {
    position: "absolute",
    top: 50,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(15,23,42,0.6)",
    alignItems: "center",
    justifyContent: "center",
  },
  pageCount: { color: "#F8FAFC", fontWeight: "600" },
  thumbStrip: { position: "absolute", bottom: 130, left: 0, right: 0 },
  thumb: {
    width: 48,
    height: 64,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#F8FAFC",
  },
  bottomBar: {
    position: "absolute",
    bottom: 36,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 28,
  },
  shutter: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    justifyContent: "center",
  },
  shutterInner: {
    width: 62,
    height: 62,
    borderRadius: 31,
    borderWidth: 3,
    borderColor: "#0F172A",
  },
  doneButton: {
    width: 64,
    height: 44,
    borderRadius: 10,
    backgroundColor: "#38BDF8",
    alignItems: "center",
    justifyContent: "center",
  },
  doneText: { color: "#0F172A", fontWeight: "700" },
});
