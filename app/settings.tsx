import { useEffect, useState } from "react";
import { View, Text, StyleSheet, Pressable, TextInput, Alert, Switch, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import {
  isLockEnabled,
  setAppPin,
  disableAppLock,
  isBiometricAvailable,
} from "@/lib/appLock";
import { checkForUpdate, downloadAndApplyUpdate, getUpdateInfo } from "@/lib/otaUpdates";
import { colors, gradients, radius, spacing } from "@/theme";
import Constants from "expo-constants";

export default function SettingsScreen() {
  const router = useRouter();
  const [lockEnabled, setLockEnabled] = useState(false);
  const [bioAvailable, setBioAvailable] = useState(false);
  const [settingPin, setSettingPin] = useState(false);
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const updateInfo = getUpdateInfo();

  const load = async () => {
    setLockEnabled(await isLockEnabled());
    setBioAvailable(await isBiometricAvailable());
  };

  useEffect(() => {
    load();
  }, []);

  const onToggleLock = async (value: boolean) => {
    if (value) {
      setSettingPin(true);
    } else {
      Alert.alert("অ্যাপ লক বন্ধ করবেন?", "", [
        { text: "বাতিল", style: "cancel" },
        {
          text: "বন্ধ করুন",
          style: "destructive",
          onPress: async () => {
            await disableAppLock();
            setLockEnabled(false);
          },
        },
      ]);
    }
  };

  const savePin = async () => {
    if (pin.length !== 4) {
      Alert.alert("৪ সংখ্যার PIN দিন");
      return;
    }
    if (pin !== confirmPin) {
      Alert.alert("দুটি PIN মিলেনি", "আবার চেষ্টা করুন");
      setPin("");
      setConfirmPin("");
      return;
    }
    await setAppPin(pin);
    setLockEnabled(true);
    setSettingPin(false);
    setPin("");
    setConfirmPin("");
    Alert.alert("অ্যাপ লক চালু হয়েছে", "এখন থেকে অ্যাপ খুললে PIN চাইবে।");
  };

  const onCheckUpdate = async () => {
    if (!updateInfo.isEnabled) {
      Alert.alert(
        "আপডেট চেক করা যাচ্ছে না",
        "এই বিল্ডে (Expo Go বা ডেভেলপমেন্ট মোডে) OTA আপডেট চালু নেই। প্রোডাকশন/প্রিভিউ বিল্ডে এটা কাজ করবে।"
      );
      return;
    }
    setCheckingUpdate(true);
    try {
      const result = await checkForUpdate();
      if (result.status === "up-to-date") {
        Alert.alert("সর্বশেষ সংস্করণ", "আপনার অ্যাপটি ইতিমধ্যে সর্বশেষ আপডেটেড।");
      } else if (result.status === "available") {
        Alert.alert(
          "নতুন আপডেট পাওয়া গেছে",
          "ডাউনলোড করে এখনই ইন্সটল করবেন?",
          [
            { text: "বাতিল", style: "cancel" },
            {
              text: "ইন্সটল করুন",
              onPress: async () => {
                const ok = await downloadAndApplyUpdate();
                if (!ok) {
                  Alert.alert("সমস্যা হয়েছে", "আপডেট ডাউনলোড করা যায়নি, পরে আবার চেষ্টা করুন।");
                }
              },
            },
          ]
        );
      } else {
        Alert.alert(
          "চেক করা যায়নি",
          "ইন্টারনেট সংযোগ পরীক্ষা করে আবার চেষ্টা করুন।"
        );
      }
    } finally {
      setCheckingUpdate(false);
    }
  };

  return (
    <View style={styles.container}>
      <Pressable onPress={() => router.push("/premium")}>
        <LinearGradient
          colors={gradients.brandSoft}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.premiumRow}
        >
          <View style={styles.premiumIconCircle}>
            <Ionicons name="sparkles" size={18} color={colors.onPrimary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.premiumTitle}>প্রিমিয়াম</Text>
            <Text style={styles.premiumSub}>এক-ট্যাপে সব ডকুমেন্ট Drive-এ ব্যাকআপ (ঐচ্ছিক)</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.8)" />
        </LinearGradient>
      </Pressable>

      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <Text style={styles.rowTitle}>অ্যাপ লক</Text>
          <Text style={styles.rowSub}>
            PIN{bioAvailable ? " / বায়োমেট্রিক" : ""} দিয়ে পুরো অ্যাপ সুরক্ষিত করুন
          </Text>
        </View>
        <Switch
          value={lockEnabled}
          onValueChange={onToggleLock}
          trackColor={{ false: colors.border, true: colors.primary }}
          thumbColor={colors.onPrimary}
        />
      </View>

      {settingPin && (
        <View style={styles.pinSetup}>
          <Ionicons name="keypad-outline" size={28} color={colors.primary} />
          <Text style={styles.pinLabel}>নতুন ৪-সংখ্যার PIN দিন</Text>
          <TextInput
            style={styles.pinInput}
            keyboardType="number-pad"
            maxLength={4}
            secureTextEntry
            value={pin}
            onChangeText={setPin}
            placeholder="****"
            placeholderTextColor="#475569"
          />
          <Text style={styles.pinLabel}>আবার লিখুন</Text>
          <TextInput
            style={styles.pinInput}
            keyboardType="number-pad"
            maxLength={4}
            secureTextEntry
            value={confirmPin}
            onChangeText={setConfirmPin}
            placeholder="****"
            placeholderTextColor="#475569"
          />
          <View style={styles.pinActions}>
            <Pressable
              style={styles.cancelBtn}
              onPress={() => {
                setSettingPin(false);
                setPin("");
                setConfirmPin("");
              }}
            >
              <Text style={styles.cancelBtnText}>বাতিল</Text>
            </Pressable>
            <Pressable onPress={savePin}>
              <LinearGradient
                colors={gradients.brand}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.saveBtn}
              >
                <Text style={styles.saveBtnText}>সেভ করুন</Text>
              </LinearGradient>
            </Pressable>
          </View>
        </View>
      )}

      <Pressable
        style={[styles.row, { marginTop: spacing.md }]}
        onPress={onCheckUpdate}
        disabled={checkingUpdate}
      >
        <View style={{ flex: 1 }}>
          <Text style={styles.rowTitle}>আপডেট চেক করুন</Text>
          <Text style={styles.rowSub}>
            সংস্করণ {Constants.expoConfig?.version ?? "1.0.0"}
            {updateInfo.isEnabled ? ` · চ্যানেল: ${updateInfo.channel ?? "—"}` : " · ডেভেলপমেন্ট মোড"}
          </Text>
        </View>
        {checkingUpdate ? (
          <ActivityIndicator color={colors.primary} />
        ) : (
          <Ionicons name="refresh" size={20} color={colors.primary} />
        )}
      </Pressable>

      <Text style={styles.footnote}>
        PIN ভুলে গেলে অ্যাপ আনইনস্টল করে আবার ইনস্টল করা ছাড়া উপায় নেই — এতে সব লোকাল
        ডকুমেন্ট মুছে যাবে (Drive-এ ব্যাকআপ করা ফাইল থাকবে)। তাই PIN মনে রাখা জরুরি।
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, padding: spacing.lg },
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.borderSoft,
  },
  premiumRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: radius.lg,
    padding: 14,
    marginBottom: spacing.md,
  },
  premiumIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  premiumTitle: { color: colors.onPrimary, fontSize: 15, fontWeight: "700" },
  premiumSub: { color: "rgba(255,255,255,0.85)", fontSize: 12, marginTop: 2 },
  rowTitle: { color: colors.textPrimary, fontSize: 15, fontWeight: "600" },
  rowSub: { color: colors.textSecondary, fontSize: 12, marginTop: 2 },
  pinSetup: {
    marginTop: 20,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: 20,
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: colors.borderSoft,
  },
  pinLabel: { color: "#CBD5E1", fontSize: 13, marginTop: 8 },
  pinInput: {
    color: colors.textPrimary,
    fontSize: 22,
    letterSpacing: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    width: 120,
    textAlign: "center",
    paddingVertical: 6,
  },
  pinActions: { flexDirection: "row", gap: 12, marginTop: 16 },
  cancelBtn: { paddingVertical: 10, paddingHorizontal: 18 },
  cancelBtnText: { color: colors.textSecondary },
  saveBtn: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: radius.sm,
  },
  saveBtnText: { color: colors.onPrimary, fontWeight: "700" },
  footnote: { color: colors.textMuted, fontSize: 12, marginTop: 24, lineHeight: 18 },
});
