import { useEffect, useState } from "react";
import { View, Text, StyleSheet, Pressable, ActivityIndicator, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { PurchasesPackage } from "react-native-purchases";
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
        <ActivityIndicator color="#38BDF8" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Ionicons name="cloud-upload-outline" size={48} color="#38BDF8" />
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
          <Pressable style={styles.subscribeBtn} onPress={onSubscribe} disabled={busy || !pkg}>
            {busy ? (
              <ActivityIndicator color="#0F172A" />
            ) : (
              <Text style={styles.subscribeBtnText}>
                {pkg ? `সাবস্ক্রাইব করুন — ${pkg.product.priceString}/মাস` : "প্যাকেজ লোড হচ্ছে…"}
              </Text>
            )}
          </Pressable>
          <Pressable onPress={onRestore} disabled={busy}>
            <Text style={styles.restoreText}>আগের সাবস্ক্রিপশন পুনরুদ্ধার করুন</Text>
          </Pressable>
        </>
      )}

      {isPremium && (
        <Pressable style={styles.backupBtn} onPress={onBackupAll} disabled={backingUp}>
          {backingUp ? (
            <>
              <ActivityIndicator color="#0F172A" />
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
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0F172A",
    alignItems: "center",
    padding: 24,
    paddingTop: 60,
    gap: 10,
  },
  center: { flex: 1, backgroundColor: "#0F172A", alignItems: "center", justifyContent: "center" },
  title: { color: "#F8FAFC", fontSize: 22, fontWeight: "700", marginTop: 8 },
  benefit: { color: "#38BDF8", fontSize: 15, fontWeight: "600", textAlign: "center", marginTop: 4 },
  desc: {
    color: "#94A3B8",
    fontSize: 13,
    textAlign: "center",
    lineHeight: 20,
    marginTop: 4,
    marginBottom: 12,
  },
  notice: { color: "#FBBF24", fontSize: 12, textAlign: "center", marginTop: 12, lineHeight: 18 },
  activeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#14532D",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    marginTop: 8,
  },
  activeText: { color: "#4ADE80", fontWeight: "600" },
  subscribeBtn: {
    backgroundColor: "#38BDF8",
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginTop: 12,
    minWidth: 240,
    alignItems: "center",
  },
  subscribeBtnText: { color: "#0F172A", fontWeight: "700", fontSize: 15 },
  restoreText: { color: "#64748B", fontSize: 12, marginTop: 14, textDecorationLine: "underline" },
  backupBtn: {
    flexDirection: "row",
    backgroundColor: "#4ADE80",
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginTop: 20,
    minWidth: 240,
    alignItems: "center",
    justifyContent: "center",
  },
  backupBtnText: { color: "#0F172A", fontWeight: "700", fontSize: 15 },
});
