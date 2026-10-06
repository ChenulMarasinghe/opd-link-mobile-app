import { useEffect, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import { useAuth } from "../../context/AuthContext";
import { logoutUser } from "../../services/auth";
import { sendVerificationCode, verifyCode } from "../../services/verification";
import { onlyDigits } from "../../utils/validation";

export default function VerifyEmailScreen() {
  const { user, profile, refreshProfile } = useAuth();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(30);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const onVerify = async () => {
    if (!user || code.length !== 6) {
      Alert.alert("Invalid code", "Enter the 6-digit code from your email.");
      return;
    }
    setBusy(true);
    const result = await verifyCode(user.uid, code);
    setBusy(false);
    if (result === "ok") {
      await refreshProfile();
      router.replace("/");
      return;
    }
    const messages = {
      wrong: "That code is not correct.",
      expired: "That code has expired. Request a new one.",
      locked: "Too many wrong attempts. Request a new code.",
      missing: "No code found. Request a new one.",
    };
    Alert.alert("Verification failed", messages[result]);
  };

  const onResend = async () => {
    if (!user || !profile || cooldown > 0) return;
    try {
      await sendVerificationCode(user.uid, profile.email, profile.name);
      setCode("");
      setCooldown(30);
      Alert.alert("Code sent", "Check your email, including spam.");
    } catch {
      Alert.alert("Could not send", "Please try again in a moment.");
    }
  };

  const onLogout = async () => {
    await logoutUser();
    router.replace("/login");
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Verify your email</Text>
      <Text style={styles.sub}>We sent a 6-digit code to {profile?.email}</Text>
      <TextInput
        style={styles.input}
        placeholder="000000"
        keyboardType="number-pad"
        maxLength={6}
        value={code}
        onChangeText={(t) => setCode(onlyDigits(t))}
      />
      <Pressable style={styles.button} onPress={onVerify} disabled={busy}>
        <Text style={styles.buttonText}>{busy ? "Checking..." : "Verify"}</Text>
      </Pressable>
      <Pressable onPress={onResend} disabled={cooldown > 0}>
        <Text style={[styles.link, cooldown > 0 && { opacity: 0.5 }]}>
          {cooldown > 0 ? `Resend code in ${cooldown}s` : "Resend code"}
        </Text>
      </Pressable>
      <Pressable onPress={onLogout}>
        <Text style={styles.link}>Use a different account</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 24, gap: 12 },
  title: { fontSize: 28, fontWeight: "700", textAlign: "center" },
  sub: { textAlign: "center", color: "#555" },
  input: { borderWidth: 1, borderColor: "#ccc", borderRadius: 10, padding: 14, fontSize: 24, textAlign: "center", letterSpacing: 8 },
  button: { backgroundColor: "#4F46E5", borderRadius: 10, padding: 14, alignItems: "center" },
  buttonText: { color: "#fff", fontWeight: "600" },
  link: { textAlign: "center", color: "#4F46E5", marginTop: 6 },
});