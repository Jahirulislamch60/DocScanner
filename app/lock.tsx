import { useEffect, useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import {
  verifyPin,
  markUnlocked,
  isBiometricAvailable,
  tryBiometricUnlock,
} from "@/lib/appLock";
import { colors, gradients, shadows } from "@/theme";

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "del"];

export default function LockScreen() {
  const router = useRouter();
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);
  const [bioAvailable, setBioAvailable] = useState(false);

  useEffect(() => {
    isBiometricAvailable().then(setBioAvailable);
    // Offer biometric immediately on entry for a fast unlock.
    attemptBiometric();
  }, []);

  const attemptBiometric = async () => {
    const ok = await tryBiometricUnlock();
    if (ok) unlock();
  };

  const unlock = () => {
    markUnlocked();
    router.replace("/");
  };

  const onKeyPress = async (key: string) => {
    if (key === "del") {
      setPin((p) => p.slice(0, -1));
      return;
    }
    if (!key) return;

    const next = (pin + key).slice(0, 6);
    setPin(next);
    setError(false);

    if (next.length === 4 || next.length === 6) {
      const ok = await verifyPin(next);
      if (ok) {
        unlock();
      } else if (next.length >= 6) {
        setError(true);
        setPin("");
      }
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.iconCircle}>
        <LinearGradient
          colors={gradients.brand}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <Ionicons name="lock-closed" size={32} color={colors.onPrimary} />
      </View>
      <Text style={styles.title}>Scanvexa লক করা আছে</Text>
      <Text style={styles.subtitle}>PIN দিন{bioAvailable ? " অথবা ফিঙ্গারপ্রিন্ট/ফেস আইডি ব্যবহার করুন" : ""}</Text>

      <View style={styles.dots}>
        {[0, 1, 2, 3].map((i) => (
          <View
            key={i}
            style={[
              styles.dot,
              i < pin.length && styles.dotFilled,
              error && styles.dotError,
            ]}
          />
        ))}
      </View>

      {error && <Text style={styles.errorText}>ভুল PIN, আবার চেষ্টা করুন</Text>}

      <View style={styles.keypad}>
        {KEYS.map((key, i) => (
          <Pressable
            key={i}
            style={[styles.key, !key && styles.keyEmpty]}
            onPress={() => onKeyPress(key)}
            disabled={!key}
          >
            {key === "del" ? (
              <Ionicons name="backspace-outline" size={22} color="#F8FAFC" />
            ) : (
              <Text style={styles.keyText}>{key}</Text>
            )}
          </Pressable>
        ))}
      </View>

      {bioAvailable && (
        <Pressable style={styles.bioBtn} onPress={attemptBiometric}>
          <Ionicons name="finger-print" size={20} color={colors.primary} />
          <Text style={styles.bioBtnText}>বায়োমেট্রিক দিয়ে আনলক করুন</Text>
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
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 32,
  },
  iconCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    marginBottom: 4,
    ...shadows.glow,
  },
  title: { color: colors.textPrimary, fontSize: 18, fontWeight: "700", marginTop: 8 },
  subtitle: { color: colors.textSecondary, fontSize: 13, marginBottom: 12, textAlign: "center" },
  dots: { flexDirection: "row", gap: 14, marginBottom: 8 },
  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  dotFilled: { backgroundColor: colors.primary, borderColor: colors.primary },
  dotError: { borderColor: colors.danger },
  errorText: { color: colors.danger, fontSize: 12, marginBottom: 8 },
  keypad: {
    flexDirection: "row",
    flexWrap: "wrap",
    width: 260,
    justifyContent: "center",
    marginTop: 16,
  },
  key: {
    width: 76,
    height: 64,
    alignItems: "center",
    justifyContent: "center",
  },
  keyEmpty: {},
  keyText: { color: colors.textPrimary, fontSize: 24, fontWeight: "500" },
  bioBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 20,
  },
  bioBtnText: { color: colors.primary, fontWeight: "600" },
});
