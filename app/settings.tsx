import { useEffect, useState } from "react";
import { View, Text, StyleSheet, Pressable, TextInput, Alert, Switch } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  isLockEnabled,
  setAppPin,
  disableAppLock,
  isBiometricAvailable,
} from "@/lib/appLock";

export default function SettingsScreen() {
  const [lockEnabled, setLockEnabled] = useState(false);
  const [bioAvailable, setBioAvailable] = useState(false);
  const [settingPin, setSettingPin] = useState(false);
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");

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

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <Text style={styles.rowTitle}>অ্যাপ লক</Text>
          <Text style={styles.rowSub}>
            PIN{bioAvailable ? " / বায়োমেট্রিক" : ""} দিয়ে পুরো অ্যাপ সুরক্ষিত করুন
          </Text>
        </View>
        <Switch value={lockEnabled} onValueChange={onToggleLock} />
      </View>

      {settingPin && (
        <View style={styles.pinSetup}>
          <Ionicons name="keypad-outline" size={28} color="#38BDF8" />
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
            <Pressable style={styles.saveBtn} onPress={savePin}>
              <Text style={styles.saveBtnText}>সেভ করুন</Text>
            </Pressable>
          </View>
        </View>
      )}

      <Text style={styles.footnote}>
        PIN ভুলে গেলে অ্যাপ আনইনস্টল করে আবার ইনস্টল করা ছাড়া উপায় নেই — এতে সব লোকাল
        ডকুমেন্ট মুছে যাবে (Drive-এ ব্যাকআপ করা ফাইল থাকবে)। তাই PIN মনে রাখা জরুরি।
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0F172A", padding: 16 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1E293B",
    borderRadius: 12,
    padding: 14,
  },
  rowTitle: { color: "#F8FAFC", fontSize: 15, fontWeight: "600" },
  rowSub: { color: "#94A3B8", fontSize: 12, marginTop: 2 },
  pinSetup: {
    marginTop: 20,
    backgroundColor: "#1E293B",
    borderRadius: 12,
    padding: 20,
    alignItems: "center",
    gap: 8,
  },
  pinLabel: { color: "#CBD5E1", fontSize: 13, marginTop: 8 },
  pinInput: {
    color: "#F8FAFC",
    fontSize: 22,
    letterSpacing: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#334155",
    width: 120,
    textAlign: "center",
    paddingVertical: 6,
  },
  pinActions: { flexDirection: "row", gap: 12, marginTop: 16 },
  cancelBtn: { paddingVertical: 10, paddingHorizontal: 18 },
  cancelBtnText: { color: "#94A3B8" },
  saveBtn: {
    backgroundColor: "#38BDF8",
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 10,
  },
  saveBtnText: { color: "#0F172A", fontWeight: "700" },
  footnote: { color: "#64748B", fontSize: 12, marginTop: 24, lineHeight: 18 },
});
