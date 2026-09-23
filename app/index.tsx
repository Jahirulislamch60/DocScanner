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
import { LinearGradient } from "expo-linear-gradient";
import { ScanDocument, Folder } from "@/types";
import {
  listDocuments,
  listDocumentsInFolder,
  listFolders,
  createFolder,
  deleteDocument,
} from "@/lib/storage";
import { useIsOnline } from "@/lib/network";
import { colors, gradients, radius, spacing, shadows } from "@/theme";

function Chip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  if (active) {
    return (
      <Pressable onPress={onPress}>
        <LinearGradient
          colors={gradients.brandSoft}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.chip}
        >
          <Text style={styles.chipTextActive}>{label}</Text>
        </LinearGradient>
      </Pressable>
    );
  }
  return (
    <Pressable style={[styles.chip, styles.chipInactive]} onPress={onPress}>
      <Text style={styles.chipText}>{label}</Text>
    </Pressable>
  );
}

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
        <Chip label="সব" active={!selectedFolder} onPress={() => setSelectedFolder(undefined)} />
        {folders.map((f) => (
          <Chip
            key={f.id}
            label={f.name}
            active={selectedFolder === f.id}
            onPress={() => setSelectedFolder(f.id)}
          />
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
          <Pressable style={[styles.chip, styles.chipInactive]} onPress={() => setAddingFolder(true)}>
            <Ionicons name="add" size={16} color={colors.primary} />
          </Pressable>
        )}
      </ScrollView>

      {docs.length === 0 && !loading ? (
        <View style={styles.empty}>
          <View style={styles.emptyIconCircle}>
            <Ionicons name="document-text-outline" size={40} color={colors.primary} />
          </View>
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
        onPress={() => router.push({ pathname: "/scan", params: { folderId: selectedFolder ?? "" } })}
        style={styles.fabWrap}
      >
        <LinearGradient
          colors={gradients.brand}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.fab}
        >
          <Ionicons name="camera" size={28} color={colors.onPrimary} />
        </LinearGradient>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  offlineBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.warningSoft,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  offlineBannerText: { color: colors.warning, fontSize: 12 },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  headerTitle: { color: colors.textPrimary, fontSize: 15, fontWeight: "700" },
  settingsBtn: {
    padding: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
  },
  chipRow: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md, gap: 8, alignItems: "center" },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.pill,
    marginRight: 8,
  },
  chipInactive: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSoft,
  },
  chipText: { color: colors.textSecondary, fontSize: 13, fontWeight: "600" },
  chipTextActive: { color: colors.onPrimary, fontSize: 13, fontWeight: "700" },
  newFolderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: colors.borderSoft,
  },
  newFolderInput: { color: colors.textPrimary, minWidth: 100, fontSize: 13 },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 32,
  },
  emptyIconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.primarySoftBorder,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  emptyText: { color: colors.textPrimary, fontSize: 16, fontWeight: "700", marginTop: 12 },
  emptySub: { color: colors.textMuted, fontSize: 13, textAlign: "center" },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: 10,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    ...shadows.card,
  },
  thumb: { width: 52, height: 68, borderRadius: radius.sm, backgroundColor: colors.surfaceRaised },
  thumbPlaceholder: { alignItems: "center", justifyContent: "center" },
  cardTitle: { color: colors.textPrimary, fontSize: 15, fontWeight: "600" },
  cardMeta: { color: colors.textSecondary, fontSize: 12, marginTop: 2 },
  fabWrap: {
    position: "absolute",
    right: 20,
    bottom: 28,
    borderRadius: 32,
    ...shadows.glow,
  },
  fab: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
  },
});
