import { useCallback, useState } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
  Alert,
  Image,
  TextInput,
  ScrollView,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { ScanDocument, Folder } from "@/types";
import {
  listDocuments,
  listDocumentsInFolder,
  listFolders,
  createFolder,
  deleteDocument,
} from "@/lib/storage";
import { useIsOnline } from "@/lib/network";

export default function HomeScreen() {
  const router = useRouter();
  const [docs, setDocs] = useState<ScanDocument[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [addingFolder, setAddingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const { isOnline } = useIsOnline();

  const load = useCallback(async (folderId?: string) => {
    setLoading(true);
    const [docList, folderList] = await Promise.all([
      folderId ? listDocumentsInFolder(folderId) : listDocuments(),
      listFolders(),
    ]);
    setDocs(docList);
    setFolders(folderList);
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load(selectedFolder);
    }, [load, selectedFolder])
  );

  const onDelete = (doc: ScanDocument) => {
    Alert.alert("ডিলিট করবেন?", doc.title, [
      { text: "বাতিল", style: "cancel" },
      {
        text: "ডিলিট",
        style: "destructive",
        onPress: async () => {
          await deleteDocument(doc.id);
          load(selectedFolder);
        },
      },
    ]);
  };

  const onCreateFolder = async () => {
    const name = newFolderName.trim();
    if (!name) return;
    await createFolder(name);
    setNewFolderName("");
    setAddingFolder(false);
    load(selectedFolder);
  };

  return (
    <View style={styles.container}>
      {!isOnline && (
        <View style={styles.offlineBanner}>
          <Ionicons name="cloud-offline-outline" size={13} color="#FBBF24" />
          <Text style={styles.offlineBannerText}>
            অফলাইন মোড — স্ক্যান করা ও PDF বানানো এখনো কাজ করবে
          </Text>
        </View>
      )}

      <View style={styles.headerRow}>
        <Text style={styles.headerTitle}>ফোল্ডার</Text>
        <Pressable onPress={() => router.push("/settings")} style={styles.settingsBtn}>
          <Ionicons name="settings-outline" size={20} color="#94A3B8" />
        </Pressable>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipRow}
      >
        <Pressable
          style={[styles.chip, !selectedFolder && styles.chipActive]}
          onPress={() => setSelectedFolder(undefined)}
        >
          <Text style={[styles.chipText, !selectedFolder && styles.chipTextActive]}>সব</Text>
        </Pressable>
        {folders.map((f) => (
          <Pressable
            key={f.id}
            style={[styles.chip, selectedFolder === f.id && styles.chipActive]}
            onPress={() => setSelectedFolder(f.id)}
          >
            <Text
              style={[styles.chipText, selectedFolder === f.id && styles.chipTextActive]}
            >
              {f.name}
            </Text>
          </Pressable>
        ))}
        {addingFolder ? (
          <View style={styles.newFolderRow}>
            <TextInput
              value={newFolderName}
              onChangeText={setNewFolderName}
              placeholder="ফোল্ডারের নাম"
              placeholderTextColor="#64748B"
              style={styles.newFolderInput}
              autoFocus
              onSubmitEditing={onCreateFolder}
            />
            <Pressable onPress={onCreateFolder}>
              <Ionicons name="checkmark-circle" size={22} color="#4ADE80" />
            </Pressable>
            <Pressable onPress={() => setAddingFolder(false)}>
              <Ionicons name="close-circle" size={22} color="#F87171" />
            </Pressable>
          </View>
        ) : (
          <Pressable style={styles.chip} onPress={() => setAddingFolder(true)}>
            <Ionicons name="add" size={16} color="#38BDF8" />
          </Pressable>
        )}
      </ScrollView>

      {docs.length === 0 && !loading ? (
        <View style={styles.empty}>
          <Ionicons name="document-outline" size={56} color="#475569" />
          <Text style={styles.emptyText}>এখানে এখনো কোনো ডকুমেন্ট নেই</Text>
          <Text style={styles.emptySub}>নিচের বাটনে চেপে প্রথম স্ক্যানটি করুন</Text>
        </View>
      ) : (
        <FlatList
          data={docs}
          keyExtractor={(d) => d.id}
          contentContainerStyle={{ padding: 16, gap: 12 }}
          renderItem={({ item }) => (
            <Pressable
              style={styles.card}
              onPress={() => router.push(`/preview/${item.id}`)}
              onLongPress={() => onDelete(item)}
            >
              {item.pages[0] ? (
                <Image source={{ uri: item.pages[0].uri }} style={styles.thumb} />
              ) : (
                <View style={[styles.thumb, styles.thumbPlaceholder]} />
              )}
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle} numberOfLines={1}>
                  {item.title}
                </Text>
                <Text style={styles.cardMeta}>
                  {item.pages.length} পৃষ্ঠা ·{" "}
                  {new Date(item.updatedAt).toLocaleDateString("bn-BD")}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#64748B" />
            </Pressable>
          )}
        />
      )}

      <Pressable
        style={styles.fab}
        onPress={() => router.push({ pathname: "/scan", params: { folderId: selectedFolder ?? "" } })}
      >
        <Ionicons name="camera" size={28} color="#0F172A" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0F172A" },
  offlineBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#422006",
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  offlineBannerText: { color: "#FBBF24", fontSize: 12 },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  headerTitle: { color: "#F8FAFC", fontSize: 15, fontWeight: "700" },
  settingsBtn: { padding: 4 },
  chipRow: { paddingHorizontal: 16, paddingVertical: 12, gap: 8, alignItems: "center" },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    backgroundColor: "#1E293B",
    marginRight: 8,
  },
  chipActive: { backgroundColor: "#38BDF8" },
  chipText: { color: "#CBD5E1", fontSize: 13, fontWeight: "600" },
  chipTextActive: { color: "#0F172A" },
  newFolderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#1E293B",
    borderRadius: 18,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  newFolderInput: { color: "#F8FAFC", minWidth: 100, fontSize: 13 },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 32,
  },
  emptyText: { color: "#CBD5E1", fontSize: 16, fontWeight: "600", marginTop: 12 },
  emptySub: { color: "#64748B", fontSize: 13, textAlign: "center" },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#1E293B",
    borderRadius: 14,
    padding: 10,
  },
  thumb: { width: 52, height: 68, borderRadius: 8, backgroundColor: "#334155" },
  thumbPlaceholder: { alignItems: "center", justifyContent: "center" },
  cardTitle: { color: "#F8FAFC", fontSize: 15, fontWeight: "600" },
  cardMeta: { color: "#94A3B8", fontSize: 12, marginTop: 2 },
  fab: {
    position: "absolute",
    right: 20,
    bottom: 28,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#38BDF8",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
});
