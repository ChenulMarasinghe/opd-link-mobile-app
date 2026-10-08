<<<<<<< Updated upstream
import { useEffect, useState } from "react";
import { Alert, Image, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
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
=======
import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { FirebaseError } from 'firebase/app';
import { loginUser } from '@/services/auth';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!email.trim() || !password) {
      setError('Enter your email and password.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await loginUser(email, password);
      router.replace('/');
    } catch (cause) {
      const code = cause instanceof FirebaseError ? cause.code : '';
      setError(code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found'
        ? 'The email or password is incorrect.'
        : 'Unable to sign in. Check your connection and try again.');
    } finally {
      setSubmitting(false);
>>>>>>> Stashed changes
    }
  };

  return (
<<<<<<< Updated upstream
    <View style={styles.container}>
      <Image
        source={require("../../../assets/images/logo.png")}
        style={styles.logo}
        resizeMode="contain"
      />
      <Text style={styles.subtitle}>Log in to your account</Text>

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
=======
    <KeyboardAvoidingView style={styles.page} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.card}>
        <Text style={styles.title}>OPD Link</Text>
        <Text style={styles.subtitle}>Sign in with your account</Text>
        <TextInput style={styles.input} value={email} onChangeText={setEmail} placeholder="Email" keyboardType="email-address" autoCapitalize="none" autoComplete="email" editable={!submitting} />
        <TextInput style={styles.input} value={password} onChangeText={setPassword} placeholder="Password" secureTextEntry autoCapitalize="none" autoComplete="password" editable={!submitting} onSubmitEditing={submit} />
        {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
        <Pressable accessibilityRole="button" onPress={submit} disabled={submitting} style={({ pressed }) => [styles.button, pressed && styles.pressed, submitting && styles.disabled]}>
          {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Sign in</Text>}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
>>>>>>> Stashed changes
  );
}

const styles = StyleSheet.create({
<<<<<<< Updated upstream
  container: { flex: 1, justifyContent: "center", padding: 24, gap: 12 },
  logo: { width: 150, height: 150, alignSelf: "center" },
  title: { fontSize: 32, fontWeight: "700", textAlign: "center" },
  subtitle: { fontSize: 15, color: "#6B7280", textAlign: "center", marginBottom: 12 },
  input: { borderWidth: 1, borderColor: "#ccc", borderRadius: 10, padding: 14 },
  passwordField: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: "#ccc", borderRadius: 10 },
  passwordInput: { flex: 1, padding: 14 },
  visibilityButton: { paddingHorizontal: 14, paddingVertical: 12 },
  button: { backgroundColor: "#4F46E5", borderRadius: 10, padding: 14, alignItems: "center" },
  buttonText: { color: "#fff", fontWeight: "600" },
  link: { textAlign: "center", color: "#4F46E5", marginTop: 6 },
});
=======
  page: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: '#EEF4FF' },
  card: { padding: 24, borderRadius: 20, backgroundColor: '#fff', gap: 14 },
  title: { color: '#18233A', fontSize: 28, fontWeight: '800', textAlign: 'center' },
  subtitle: { color: '#64748B', textAlign: 'center', marginBottom: 10 },
  input: { minHeight: 50, borderWidth: 1, borderColor: '#D6DFEB', borderRadius: 12, paddingHorizontal: 14, color: '#18233A' },
  error: { color: '#B42318', fontSize: 14 },
  button: { minHeight: 50, justifyContent: 'center', alignItems: 'center', borderRadius: 12, backgroundColor: '#315CEB' },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  pressed: { opacity: 0.8 },
  disabled: { opacity: 0.6 },
});
>>>>>>> Stashed changes
