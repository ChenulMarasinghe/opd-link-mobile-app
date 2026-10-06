import { useEffect, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import { SymbolView } from "expo-symbols";
import { loginUser } from "../../services/auth";
import { useAuth } from "../../context/AuthContext";
import { isValidEmail } from "../../utils/validation";

export default function LoginScreen() {
  const { user, profile, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && user && profile) router.replace("/");
  }, [loading, user, profile]);

  const onLogin = async () => {
    if (!isValidEmail(email) || !password) {
      Alert.alert("Invalid details", "Enter a valid email and your password.");
      return;
    }
    try {
      setBusy(true);
      await loginUser(email, password);
      // no router.replace here: the effect above handles it
    } catch {
      Alert.alert("Login failed", "Check your email and password and try again.");
      setBusy(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>OPD Link</Text>
      <TextInput style={styles.input} placeholder="Email" autoCapitalize="none"
        keyboardType="email-address" value={email} onChangeText={setEmail} />
      <View style={styles.passwordField}>
        <TextInput style={styles.passwordInput} placeholder="Password"
          secureTextEntry={!showPassword} value={password} onChangeText={setPassword} />
        <Pressable style={styles.visibilityButton} onPress={() => setShowPassword((visible) => !visible)} accessibilityRole="button"
          accessibilityLabel={showPassword ? "Hide password" : "Show password"}>
          <SymbolView
            name={{ ios: showPassword ? "eye.slash" : "eye", android: showPassword ? "visibility_off" : "visibility", web: showPassword ? "visibility_off" : "visibility" }}
            tintColor="#4F46E5"
            size={22}
          />
        </Pressable>
      </View>
      <Pressable style={styles.button} onPress={onLogin} disabled={busy}>
        <Text style={styles.buttonText}>{busy ? "Logging in..." : "Log in"}</Text>
      </Pressable>
      <Pressable onPress={() => router.push("/forgot-password")}>
        <Text style={styles.link}>Forgot password?</Text>
      </Pressable>
      <Pressable onPress={() => router.push("/register")}>
        <Text style={styles.link}>Create an account</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 24, gap: 12 },
  title: { fontSize: 32, fontWeight: "700", textAlign: "center", marginBottom: 16 },
  input: { borderWidth: 1, borderColor: "#ccc", borderRadius: 10, padding: 14 },
  passwordField: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: "#ccc", borderRadius: 10 },
  passwordInput: { flex: 1, padding: 14 },
  visibilityButton: { paddingHorizontal: 14, paddingVertical: 12 },
  button: { backgroundColor: "#4F46E5", borderRadius: 10, padding: 14, alignItems: "center" },
  buttonText: { color: "#fff", fontWeight: "600" },
  link: { textAlign: "center", color: "#4F46E5", marginTop: 6 },
});