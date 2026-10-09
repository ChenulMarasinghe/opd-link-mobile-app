import { useEffect, useState } from "react";
<<<<<<< HEAD
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
=======
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
>>>>>>> parent of 1bdecc6 (refactor: structure app around IT screens)
import { router } from "expo-router";
import { SymbolView } from "expo-symbols";
import { registerUser } from "../../services/auth";
import { sendVerificationCode } from "../../services/verification";
import { useAuth } from "../../context/AuthContext";
import { isValidEmail, isValidPhone, onlyDigits } from "../../utils/validation";

export default function RegisterScreen() {
  const { user, profile, loading, refreshProfile } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!loading && user && profile) router.replace("/");
  }, [loading, user, profile]);

  const validate = () => {
<<<<<<< HEAD
    const nextErrors: Record<string, string> = {};
    if (!name.trim()) nextErrors.name = "Enter your full name.";
    if (!isValidEmail(email)) nextErrors.email = "Enter a valid email address.";
    if (!isValidPhone(phone)) {
      nextErrors.phone = "Phone number must be exactly 10 digits.";
    }
    if (password.length < 6) nextErrors.password = "Use at least 6 characters.";
    if (password !== confirm) nextErrors.confirm = "Passwords do not match.";
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
=======
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = "Enter your full name.";
    if (!isValidEmail(email)) e.email = "Enter a valid email address.";
    if (!isValidPhone(phone)) e.phone = "Phone number must be exactly 10 digits.";
    if (password.length < 6) e.password = "Use at least 6 characters.";
    if (password !== confirm) e.confirm = "Passwords do not match.";
    setErrors(e);
    return Object.keys(e).length === 0;
>>>>>>> parent of 1bdecc6 (refactor: structure app around IT screens)
  };

  const onRegister = async () => {
    if (!validate()) return;
<<<<<<< HEAD

    try {
      setBusy(true);
      const registeredProfile = await registerUser(name, email, phone, password);
      try {
        await sendVerificationCode(
          registeredProfile.uid,
          registeredProfile.email,
          registeredProfile.name
        );
      } catch {
        // The verification screen allows the user to resend the code.
      }
      await refreshProfile();
    } catch (error: unknown) {
      const code =
        typeof error === "object" && error !== null && "code" in error
          ? error.code
          : undefined;
      Alert.alert(
        "Registration failed",
        code === "auth/email-already-in-use"
=======
    try {
      setBusy(true);
      const p = await registerUser(name, email, phone, password);
      try {
        await sendVerificationCode(p.uid, p.email, p.name);
      } catch {
        // the user can press "Resend code" on the verification screen
      }
      await refreshProfile();
    } catch (e: any) {
      Alert.alert(
        "Registration failed",
        e?.code === "auth/email-already-in-use"
>>>>>>> parent of 1bdecc6 (refactor: structure app around IT screens)
          ? "This email is already registered."
          : "Please check your details and try again."
      );
      setBusy(false);
    }
  };

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      <Image
        source={require("../../../assets/images/logo.png")}
        style={styles.logo}
        resizeMode="contain"
      />
      <Text style={styles.title}>Create account</Text>

<<<<<<< HEAD
      <TextInput
        style={styles.input}
        placeholder="Full name"
        value={name}
        onChangeText={setName}
      />
      {errors.name && <Text style={styles.error}>{errors.name}</Text>}

      <TextInput
        style={styles.input}
        placeholder="Email"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      {errors.email && <Text style={styles.error}>{errors.email}</Text>}

      <TextInput
        style={styles.input}
        placeholder="Phone (10 digits)"
        keyboardType="number-pad"
        maxLength={10}
        value={phone}
        onChangeText={(value) => setPhone(onlyDigits(value))}
      />
      {errors.phone && <Text style={styles.error}>{errors.phone}</Text>}

      <View style={styles.passwordField}>
        <TextInput
          style={styles.passwordInput}
          placeholder="Password"
          secureTextEntry={!showPassword}
          value={password}
          onChangeText={setPassword}
        />
        <Pressable
          style={styles.visibilityButton}
          onPress={() => setShowPassword((visible) => !visible)}
          accessibilityRole="button"
          accessibilityLabel={showPassword ? "Hide password" : "Show password"}
        >
          <SymbolView
            name={{
              ios: showPassword ? "eye.slash" : "eye",
              android: showPassword ? "visibility_off" : "visibility",
              web: showPassword ? "visibility_off" : "visibility",
            }}
=======
      <TextInput style={styles.input} placeholder="Full name" value={name} onChangeText={setName} />
      {errors.name && <Text style={styles.error}>{errors.name}</Text>}

      <TextInput style={styles.input} placeholder="Email" autoCapitalize="none"
        keyboardType="email-address" value={email} onChangeText={setEmail} />
      {errors.email && <Text style={styles.error}>{errors.email}</Text>}

      <TextInput style={styles.input} placeholder="Phone (10 digits)" keyboardType="number-pad"
        maxLength={10} value={phone} onChangeText={(t) => setPhone(onlyDigits(t))} />
      {errors.phone && <Text style={styles.error}>{errors.phone}</Text>}

      <View style={styles.passwordField}>
        <TextInput style={styles.passwordInput} placeholder="Password"
          secureTextEntry={!showPassword} value={password} onChangeText={setPassword} />
        <Pressable style={styles.visibilityButton} onPress={() => setShowPassword((visible) => !visible)} accessibilityRole="button"
          accessibilityLabel={showPassword ? "Hide password" : "Show password"}>
          <SymbolView
            name={{ ios: showPassword ? "eye.slash" : "eye", android: showPassword ? "visibility_off" : "visibility", web: showPassword ? "visibility_off" : "visibility" }}
>>>>>>> parent of 1bdecc6 (refactor: structure app around IT screens)
            tintColor="#4F46E5"
            size={22}
          />
        </Pressable>
      </View>
      {errors.password && <Text style={styles.error}>{errors.password}</Text>}

      <View style={styles.passwordField}>
<<<<<<< HEAD
        <TextInput
          style={styles.passwordInput}
          placeholder="Confirm password"
          secureTextEntry={!showConfirm}
          value={confirm}
          onChangeText={setConfirm}
        />
        <Pressable
          style={styles.visibilityButton}
          onPress={() => setShowConfirm((visible) => !visible)}
          accessibilityRole="button"
          accessibilityLabel={showConfirm ? "Hide confirm password" : "Show confirm password"}
        >
          <SymbolView
            name={{
              ios: showConfirm ? "eye.slash" : "eye",
              android: showConfirm ? "visibility_off" : "visibility",
              web: showConfirm ? "visibility_off" : "visibility",
            }}
=======
        <TextInput style={styles.passwordInput} placeholder="Confirm password"
          secureTextEntry={!showConfirm} value={confirm} onChangeText={setConfirm} />
        <Pressable style={styles.visibilityButton} onPress={() => setShowConfirm((visible) => !visible)} accessibilityRole="button"
          accessibilityLabel={showConfirm ? "Hide confirm password" : "Show confirm password"}>
          <SymbolView
            name={{ ios: showConfirm ? "eye.slash" : "eye", android: showConfirm ? "visibility_off" : "visibility", web: showConfirm ? "visibility_off" : "visibility" }}
>>>>>>> parent of 1bdecc6 (refactor: structure app around IT screens)
            tintColor="#4F46E5"
            size={22}
          />
        </Pressable>
      </View>
      {errors.confirm && <Text style={styles.error}>{errors.confirm}</Text>}

      <Pressable style={styles.button} onPress={onRegister} disabled={busy}>
        <Text style={styles.buttonText}>{busy ? "Creating..." : "Register"}</Text>
      </Pressable>
      <Pressable onPress={() => router.back()}>
        <Text style={styles.link}>Back to login</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, justifyContent: "center", padding: 24, gap: 8 },
  logo: { width: 150, height: 150, alignSelf: "center" },
  title: { fontSize: 28, fontWeight: "700", textAlign: "center", marginBottom: 12 },
  input: { borderWidth: 1, borderColor: "#ccc", borderRadius: 10, padding: 14 },
<<<<<<< HEAD
  passwordField: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 10,
  },
  passwordInput: { flex: 1, padding: 14 },
  visibilityButton: { paddingHorizontal: 14, paddingVertical: 12 },
  error: { color: "#DC2626", fontSize: 12, marginLeft: 4 },
  button: {
    backgroundColor: "#4F46E5",
    borderRadius: 10,
    padding: 14,
    alignItems: "center",
    marginTop: 8,
  },
  buttonText: { color: "#fff", fontWeight: "600" },
  link: { textAlign: "center", color: "#4F46E5", marginTop: 6 },
});
=======
  passwordField: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: "#ccc", borderRadius: 10 },
  passwordInput: { flex: 1, padding: 14 },
  visibilityButton: { paddingHorizontal: 14, paddingVertical: 12 },
  error: { color: "#DC2626", fontSize: 12, marginLeft: 4 },
  button: { backgroundColor: "#4F46E5", borderRadius: 10, padding: 14, alignItems: "center", marginTop: 8 },
  buttonText: { color: "#fff", fontWeight: "600" },
  link: { textAlign: "center", color: "#4F46E5", marginTop: 6 },
});
>>>>>>> parent of 1bdecc6 (refactor: structure app around IT screens)
