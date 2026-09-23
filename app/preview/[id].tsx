import { useCallback, useState } from "react";
import {
  View,
  Text,
  Image,
  FlatList,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Alert,
  TextInput,
  ScrollView,
} from "react-native";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Sharing from "expo-sharing";
import { ScanDocument } from "@/types";
import { getDocument, saveDocument, listFolders, moveDocumentToFolder } from "@/lib/storage";
import { exportDocumentToPdf } from "@/lib/pdf";
import { recognizeTextForPages } from "@/lib/ocr";
import { rotatePage } from "@/lib/imageProcessing";
import { useIsOnline } from "@/lib/network";
import { useGoogleDriveAuth } from "@/lib/googleAuth";
import { backupDocumentToDrive, OfflineError } from "@/lib/cloudBackup";

export default function PreviewScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [doc, setDoc] = useState<ScanDocument | null>(null);
  const [busy, setBusy] = useState<"pdf" | "ocr" | "backup" | null>(null);
  const [showOcr, setShowOcr] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");
  const { isOnline } = useIsOnline();
  const { signIn, isConfigured } = useGoogleDriveAuth();

  const load = useCallback(async () => {
    if (!id) return;
    const d = await getDocument(id);
    if (d) {
      setDoc(d);
      setTitleDraft(d.title);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  if (!doc) {
    return (
      <View style={styles.centerFill}>
        <ActivityIndicator color="#38BDF8" />
      </View>
    );
  }

  const persist = async (next: ScanDocument) => {
    next.updatedAt = Date.now();
    await saveDocument(next);
    setDoc(next);
  };

  const onRename = async () => {
    if (!titleDraft.trim()) return;
    await persist({ ...doc, title: titleDraft.trim() });
  };

  const onRotate = async (pageId: string) => {
    const page = doc.pages.find((p) => p.id === pageId);
    if (!page) return;
    const newUri = await rotatePage(page.uri);
    await persist({
      ...doc,
      pages: doc.pages.map((p) => (p.id === pageId ? { ...p, uri: newUri } : p)),
    });
  };

  const onDeletePage = async (pageId: string) => {
    const remaining = doc.pages.filter((p) => p.id !== pageId);
    if (remaining.length === 0) {
      Alert.alert("অন্তত একটি পৃষ্ঠা রাখতে হবে");
      return;
    }
    await persist({ ...doc, pages: remaining });
  };

  const onExportPdf = async () => {
    setBusy("pdf");
    try {
      const pdfUri = await exportDocumentToPdf(doc);
      const next = { ...doc, pdfUri };
      await persist(next);
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(pdfUri, {
          mimeType: "application/pdf",
          dialogTitle: doc.title,
        });
      }
    } catch (e) {
      console.warn(e);
      Alert.alert("PDF তৈরি করা যায়নি", "আবার চেষ্টা করুন।");
    } finally {
      setBusy(null);
    }
  };

  const onBackupToDrive = async () => {
    if (!isConfigured) {
      Alert.alert(
        "Google সংযুক্ত করা হয়নি",
        "Google Drive ব্যাকআপ চালু করতে app.json-এ OAuth client ID বসাতে হবে — README-এর 'Google Drive backup setup' অংশ দেখুন।"
      );
      return;
    }
    if (!isOnline) {
      Alert.alert("অফলাইন", "ব্যাকআপের জন্য ইন্টারনেট সংযোগ দরকার। বাকি সব ফিচার অফলাইনেই কাজ করবে।");
      return;
    }
    setBusy("backup");
    try {
      const token = await signIn();
      if (!token) {
        setBusy(null);
        return; // user cancelled sign-in
      }
      const next = await backupDocumentToDrive(doc, token);
      await persist(next);
      Alert.alert("ব্যাকআপ সম্পন্ন", "ডকুমেন্টটি আপনার Google Drive-এ সেভ হয়েছে।");
    } catch (e) {
      if (e instanceof OfflineError) {
        Alert.alert("অফলাইন", e.message);
      } else {
        console.warn(e);
        Alert.alert("ব্যাকআপ ব্যর্থ হয়েছে", "আবার চেষ্টা করুন।");
      }
    } finally {
      setBusy(null);
    }
  };

  const onMoveToFolder = async () => {
    const folders = await listFolders();
    const buttons: { text: string; onPress: () => void; style?: "destructive" }[] = [
      {
        text: "কোনো ফোল্ডার না (সব ডকুমেন্ট)",
        onPress: async () => {
          await moveDocumentToFolder(doc.id, undefined);
          await load();
        },
      },
      ...folders.map((f) => ({
        text: f.name,
        onPress: async () => {
          await moveDocumentToFolder(doc.id, f.id);
          await load();
        },
      })),
    ];
    Alert.alert(
      "ফোল্ডারে সরান",
      folders.length === 0 ? "এখনো কোনো ফোল্ডার তৈরি হয়নি — হোম স্ক্রিনে '+' চেপে বানান।" : undefined,
      [...buttons, { text: "বাতিল", style: "cancel", onPress: () => {} }]
    );
  };

  const onExtractText = async () => {
    setBusy("ocr");
    try {
      const text = await recognizeTextForPages(doc.pages.map((p) => p.uri));
      await persist({ ...doc, ocrText: text });
      setShowOcr(true);
    } catch (e) {
      console.warn(e);
      Alert.alert(
        "টেক্সট বের করা যায়নি",
        "নোট: OCR ফিচারটি Expo Go-তে কাজ করে না — এটি চালাতে EAS dev build লাগবে। README দেখুন।"
      );
    } finally {
      setBusy(null);
    }
  };

  return (
    <View style={styles.container}>
      {!isOnline && (
        <View style={styles.offlineBanner}>
          <Ionicons name="cloud-offline-outline" size={14} color="#FBBF24" />
          <Text style={styles.offlineBannerText}>
            অফলাইন — স্ক্যান, PDF, OCR সব কাজ করবে, শুধু Drive ব্যাকআপ এখন করা যাবে না
          </Text>
        </View>
      )}

      <View style={styles.titleRow}>
        <TextInput
          value={titleDraft}
          onChangeText={setTitleDraft}
          onEndEditing={onRename}
          style={styles.titleInput}
          placeholderTextColor="#64748B"
        />
        {doc.driveSyncedAt && (
          <View style={styles.syncedRow}>
            <Ionicons name="cloud-done-outline" size={14} color="#4ADE80" />
            <Text style={styles.syncedText}>
              Drive-এ ব্যাকআপ হয়েছে ·{" "}
              {new Date(doc.driveSyncedAt).toLocaleString("bn-BD")}
            </Text>
          </View>
        )}
      </View>

      <FlatList
        horizontal
        data={doc.pages}
        keyExtractor={(p) => p.id}
        contentContainerStyle={{ gap: 12, padding: 16 }}
        renderItem={({ item, index }) => (
          <View style={styles.pageCard}>
            <Image source={{ uri: item.uri }} style={styles.pageImage} />
            <Text style={styles.pageLabel}>পৃষ্ঠা {index + 1}</Text>
            <View style={styles.pageActions}>
              <Pressable onPress={() => onRotate(item.id)} style={styles.pageActionBtn}>
                <Ionicons name="reload" size={16} color="#F8FAFC" />
              </Pressable>
              <Pressable onPress={() => onDeletePage(item.id)} style={styles.pageActionBtn}>
                <Ionicons name="trash" size={16} color="#F87171" />
              </Pressable>
            </View>
          </View>
        )}
      />

      <View style={styles.rowBtns}>
        <Pressable
          style={[styles.addMoreBtn, { flex: 1 }]}
          onPress={() => router.push({ pathname: "/scan", params: { docId: doc.id } })}
        >
          <Ionicons name="add" size={18} color="#38BDF8" />
          <Text style={styles.addMoreText}>আরো পৃষ্ঠা যোগ করুন</Text>
        </Pressable>
        <Pressable style={[styles.addMoreBtn, { flex: 1 }]} onPress={onMoveToFolder}>
          <Ionicons name="folder-outline" size={18} color="#38BDF8" />
          <Text style={styles.addMoreText}>ফোল্ডারে সরান</Text>
        </Pressable>
      </View>

      {showOcr && doc.ocrText !== undefined && (
        <ScrollView style={styles.ocrBox}>
          <Text style={styles.ocrText}>{doc.ocrText || "কোনো টেক্সট পাওয়া যায়নি"}</Text>
        </ScrollView>
      )}

      <View style={styles.actionsBar}>
        <Pressable
          style={[styles.actionBtn, styles.secondaryBtn]}
          onPress={onExtractText}
          disabled={busy !== null}
        >
          {busy === "ocr" ? (
            <ActivityIndicator color="#38BDF8" />
          ) : (
            <>
              <Ionicons name="text" size={18} color="#38BDF8" />
              <Text style={styles.secondaryBtnText}>টেক্সট বের করুন</Text>
            </>
          )}
        </Pressable>

        <Pressable
          style={[styles.actionBtn, styles.primaryBtn]}
          onPress={onExportPdf}
          disabled={busy !== null}
        >
          {busy === "pdf" ? (
            <ActivityIndicator color="#0F172A" />
          ) : (
            <>
              <Ionicons name="share-outline" size={18} color="#0F172A" />
              <Text style={styles.primaryBtnText}>PDF শেয়ার করুন</Text>
            </>
          )}
        </Pressable>
      </View>

      <View style={[styles.actionsBar, { paddingTop: 0 }]}>
        <Pressable
          style={[
            styles.actionBtn,
            styles.secondaryBtn,
            !isOnline && { opacity: 0.4 },
          ]}
          onPress={onBackupToDrive}
          disabled={busy !== null || !isOnline}
        >
          {busy === "backup" ? (
            <ActivityIndicator color="#38BDF8" />
          ) : (
            <>
              <Ionicons name="cloud-upload-outline" size={18} color="#38BDF8" />
              <Text style={styles.secondaryBtnText}>
                {doc.driveFileId ? "Drive-এ আবার ব্যাকআপ করুন" : "Google Drive-এ ব্যাকআপ করুন"}
              </Text>
            </>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0F172A" },
  centerFill: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#0F172A" },
  titleRow: { paddingHorizontal: 16, paddingTop: 16 },
  titleInput: {
    color: "#F8FAFC",
    fontSize: 18,
    fontWeight: "700",
    borderBottomWidth: 1,
    borderBottomColor: "#334155",
    paddingBottom: 6,
  },
  offlineBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#422006",
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  offlineBannerText: { color: "#FBBF24", fontSize: 12, flex: 1 },
  syncedRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 8 },
  syncedText: { color: "#4ADE80", fontSize: 12 },
  pageCard: { width: 160 },
  pageImage: { width: 160, height: 220, borderRadius: 10, backgroundColor: "#1E293B" },
  pageLabel: { color: "#94A3B8", fontSize: 12, marginTop: 6, textAlign: "center" },
  pageActions: { flexDirection: "row", justifyContent: "center", gap: 12, marginTop: 6 },
  pageActionBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#1E293B",
    alignItems: "center",
    justifyContent: "center",
  },
  rowBtns: { flexDirection: "row", gap: 10, marginHorizontal: 16 },
  addMoreBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#334155",
    borderStyle: "dashed",
  },
  addMoreText: { color: "#38BDF8", fontWeight: "600" },
  ocrBox: {
    margin: 16,
    padding: 12,
    backgroundColor: "#1E293B",
    borderRadius: 10,
    maxHeight: 160,
  },
  ocrText: { color: "#E2E8F0", fontSize: 13, lineHeight: 20 },
  actionsBar: {
    flexDirection: "row",
    gap: 12,
    padding: 16,
    paddingBottom: 28,
  },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
  },
  primaryBtn: { backgroundColor: "#38BDF8" },
  primaryBtnText: { color: "#0F172A", fontWeight: "700" },
  secondaryBtn: { backgroundColor: "#1E293B", borderWidth: 1, borderColor: "#334155" },
  secondaryBtnText: { color: "#38BDF8", fontWeight: "700" },
});
