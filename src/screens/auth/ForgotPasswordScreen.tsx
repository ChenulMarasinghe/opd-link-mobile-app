import { useState } from "react";
import { Alert, Image, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import { resetPassword } from "../../services/auth";
import { isValidEmail } from "../../utils/validation";

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);

  const onSend = async () => {
    if (!isValidEmail(email)) {
      Alert.alert("Invalid email", "Enter a valid email address.");
      return;
    }
    try {
      setBusy(true);
      await resetPassword(email);
      Alert.alert("Check your email", "A password reset link has been sent.");
      router.back();
    } catch {
      Alert.alert("Could not send", "Check the email address and try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.container}>
      <Image
        source={require("../../../assets/images/logo.png")}
        style={styles.logo}
        resizeMode="contain"
      />
      <Text style={styles.title}>Forgot password</Text>
      <Text style={styles.subtitle}>
        Enter your registered email.
      </Text>
      <TextInput style={styles.input} placeholder="Email" autoCapitalize="none"
        keyboardType="email-address" value={email} onChangeText={setEmail} />
      <Pressable style={styles.button} onPress={onSend} disabled={busy}>
        <Text style={styles.buttonText}>{busy ? "Sending..." : "Send reset link"}</Text>
      </Pressable>
      <Pressable onPress={() => router.back()}>
        <Text style={styles.link}>Back to login</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 24, gap: 12 },
  logo: { width: 150, height: 150, alignSelf: "center" },
  title: { fontSize: 28, fontWeight: "700", textAlign: "center" },
  subtitle: { fontSize: 14, color: "#6B7280", textAlign: "center", marginBottom: 12 },
  input: { borderWidth: 1, borderColor: "#ccc", borderRadius: 10, padding: 14 },
  button: { backgroundColor: "#4F46E5", borderRadius: 10, padding: 14, alignItems: "center" },
  buttonText: { color: "#fff", fontWeight: "600" },
  link: { textAlign: "center", color: "#4F46E5", marginTop: 6 },
});