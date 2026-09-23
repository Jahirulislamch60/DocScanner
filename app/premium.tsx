import { useEffect, useState } from "react";
import { View, Text, StyleSheet, Pressable, ActivityIndicator, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import type { PurchasesPackage } from "react-native-purchases";
import { colors, gradients, radius, spacing, shadows } from "@/theme";
import {
  initPurchases,
  isPurchasesConfigured,
  isPremiumUser,
  getPremiumOffering,
  purchasePremium,
  restorePurchases,
} from "@/lib/subscription";
import { useGoogleDriveAuth } from "@/lib/googleAuth";
import { listDocuments } from "@/lib/storage";
import { backupAllDocumentsToDrive, OfflineError } from "@/lib/cloudBackup";
import { saveDocument } from "@/lib/storage";

export default function PremiumScreen() {
  const [loading, setLoading] = useState(true);
  const [configured, setConfigured] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const [pkg, setPkg] = useState<PurchasesPackage | null>(null);
  const [busy, setBusy] = useState(false);
  const [backingUp, setBackingUp] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const { signIn } = useGoogleDriveAuth();

  useEffect(() => {
    (async () => {
      await initPurchases();
      const ok = isPurchasesConfigured();
      setConfigured(ok);
      if (ok) {
        const [premium, offering] = await Promise.all([
          isPremiumUser(),
          getPremiumOffering(),
        ]);
        setIsPremium(premium);
        setPkg(offering?.availablePackages[0] ?? null);
      }
      setLoading(false);
    })();
  }, []);

  const onSubscribe = async () => {
    if (!pkg) return;
    setBusy(true);
    try {
      const active = await purchasePremium(pkg);
      setIsPremium(active);
      if (active) {
        Alert.alert(
          "প্রিমিয়াম চালু হয়েছে",
          "ধন্যবাদ! এখন থেকে এক-ট্যাপে সব ডকুমেন্ট Drive-এ ব্যাকআপ করতে পারবেন।"
        );
      }
    } catch (e: any) {
      if (!e?.userCancelled) {
        Alert.alert("সমস্যা হয়েছে", "সাবস্ক্রিপশন সম্পন্ন করা যায়নি, আবার চেষ্টা করুন।");
      }
    } finally {
      setBusy(false);
    }
  };

  const onRestore = async () => {
    setBusy(true);
    try {
      const active = await restorePurchases();
      setIsPremium(active);
      Alert.alert(active ? "পুনরুদ্ধার সম্পন্ন" : "কোনো সক্রিয় সাবস্ক্রিপশন পাওয়া যায়নি");
    } finally {
      setBusy(false);
    }
  };

  const onBackupAll = async () => {
    setBackingUp(true);
    setProgress(null);
    try {
      const token = await signIn();
      if (!token) return;
      const docs = await listDocuments();
      if (docs.length === 0) {
        Alert.alert("কোনো ডকুমেন্ট নেই", "ব্যাকআপ করার মতো কোনো ডকুমেন্ট এখনো নেই।");
        return;
      }
      const { updated, failed } = await backupAllDocumentsToDrive(docs, token, (done, total) =>
        setProgress({ done, total })
      );
      await Promise.all(updated.map((d) => saveDocument(d)));
      Alert.alert(
        "ব্যাকআপ সম্পন্ন",
        `${updated.length}টি ডকুমেন্ট ব্যাকআপ হয়েছে${
          failed.length ? `, ${failed.length}টি ব্যর্থ হয়েছে` : ""
        }।`
      );
    } catch (e) {
      if (e instanceof OfflineError) {
        Alert.alert("অফলাইন", e.message);
      } else {
        Alert.alert("সমস্যা হয়েছে", "ব্যাকআপ সম্পন্ন করা যায়নি, আবার চেষ্টা করুন।");
      }
    } finally {
      setBackingUp(false);
      setProgress(null);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.heroIconCircle}>
        <LinearGradient
          colors={gradients.brand}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <Ionicons name="cloud-upload-outline" size={40} color={colors.onPrimary} />
      </View>
      <Text style={styles.title}>প্রিমিয়াম</Text>
      <Text style={styles.benefit}>এক-ট্যাপে সব ডকুমেন্ট Google Drive-এ ব্যাকআপ</Text>
      <Text style={styles.desc}>
        ফ্রি ভার্সনে একটা একটা করে ডকুমেন্ট খুলে ব্যাকআপ করতে হয়। প্রিমিয়ামে একটা বাটনে চাপলেই
        আপনার সব ডকুমেন্ট একসাথে Drive-এ ব্যাকআপ হয়ে যাবে — সময় বাঁচবে, কোনো ডকুমেন্ট বাদ পড়বে না।
        বাকি সবকিছু — স্ক্যান, PDF, OCR, ফোল্ডার, অ্যাপ লক — আগের মতোই সম্পূর্ণ ফ্রি থাকবে, কোনো
        জোরপূর্বক পেওয়াল নেই।
      </Text>

      {!configured ? (
        <Text style={styles.notice}>
          সাবস্ক্রিপশন এখনো কনফিগার করা হয়নি — RevenueCat + Play Console/App Store Connect-এ সেটআপ
          করার পর এখান থেকে সাবস্ক্রাইব করা যাবে (বিস্তারিত README-তে)।
        </Text>
      ) : isPremium ? (
        <View style={styles.activeBadge}>
          <Ionicons name="checkmark-circle" size={18} color="#4ADE80" />
          <Text style={styles.activeText}>প্রিমিয়াম সক্রিয় আছে</Text>
        </View>
      ) : (
        <>
          <Pressable onPress={onSubscribe} disabled={busy || !pkg}>
            <LinearGradient
              colors={gradients.brand}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.subscribeBtn, (busy || !pkg) && { opacity: 0.6 }]}
            >
              {busy ? (
                <ActivityIndicator color={colors.onPrimary} />
              ) : (
                <Text style={styles.subscribeBtnText}>
                  {pkg ? `সাবস্ক্রাইব করুন — ${pkg.product.priceString}/মাস` : "প্যাকেজ লোড হচ্ছে…"}
                </Text>
              )}
            </LinearGradient>
          </Pressable>
          <Pressable onPress={onRestore} disabled={busy}>
            <Text style={styles.restoreText}>আগের সাবস্ক্রিপশন পুনরুদ্ধার করুন</Text>
          </Pressable>
        </>
      )}

      {isPremium && (
        <Pressable onPress={onBackupAll} disabled={backingUp}>
          <LinearGradient
            colors={gradients.success}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.backupBtn, backingUp && { opacity: 0.7 }]}
          >
            {backingUp ? (
              <>
                <ActivityIndicator color={colors.bg} />
                {progress && (
                  <Text style={styles.backupBtnText}>
                    {" "}
                    {progress.done}/{progress.total}
                  </Text>
                )}
              </>
            ) : (
              <Text style={styles.backupBtnText}>সব ডকুমেন্ট এখনই ব্যাকআপ করুন</Text>
            )}
          </LinearGradient>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: "center",
    padding: spacing.xl,
    paddingTop: 60,
    gap: 10,
  },
  center: { flex: 1, backgroundColor: colors.bg, alignItems: "center", justifyContent: "center" },
  heroIconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    ...shadows.glow,
  },
  title: { color: colors.textPrimary, fontSize: 22, fontWeight: "700", marginTop: 8 },
  benefit: { color: colors.primary, fontSize: 15, fontWeight: "600", textAlign: "center", marginTop: 4 },
  desc: {
    color: colors.textSecondary,
    fontSize: 13,
    textAlign: "center",
    lineHeight: 20,
    marginTop: 4,
    marginBottom: 12,
  },
  notice: { color: colors.warning, fontSize: 12, textAlign: "center", marginTop: 12, lineHeight: 18 },
  activeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.successSoft,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.md,
    marginTop: 8,
    borderWidth: 1,
    borderColor: "rgba(74, 222, 128, 0.35)",
  },
  activeText: { color: colors.success, fontWeight: "600" },
  subscribeBtn: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: radius.lg,
    marginTop: 12,
    minWidth: 240,
    alignItems: "center",
    ...shadows.glow,
  },
  subscribeBtnText: { color: colors.onPrimary, fontWeight: "700", fontSize: 15 },
  restoreText: { color: colors.textMuted, fontSize: 12, marginTop: 14, textDecorationLine: "underline" },
  backupBtn: {
    flexDirection: "row",
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: radius.lg,
    marginTop: 20,
    minWidth: 240,
    alignItems: "center",
    justifyContent: "center",
  },
  backupBtnText: { color: colors.bg, fontWeight: "700", fontSize: 15 },
});
