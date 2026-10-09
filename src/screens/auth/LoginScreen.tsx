import { useEffect, useState } from 'react';
import { Alert, Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { FirebaseError } from 'firebase/app';
import { useAuth } from '@/context/AuthContext';
import { loginUser } from '@/services/auth';
import { isValidEmail } from '@/utils/validation';

export default function LoginScreen() {
  const { user, profile, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && user && profile) router.replace('/');
  }, [loading, user, profile]);

  const submit = async () => {
    if (!isValidEmail(email) || !password) {
      Alert.alert('Invalid details', 'Enter a valid email and your password.');
      return;
    }
    setBusy(true);
    try {
      await loginUser(email, password);
      router.replace('/');
    } catch (cause) {
      const code = cause instanceof FirebaseError ? cause.code : '';
      const message = code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found'
        ? 'The email or password is incorrect.'
        : 'Unable to sign in. Check your connection and try again.';
      Alert.alert('Login failed', message);
      setBusy(false);
    }
  };

  return (
    <View style={styles.container}>
      <Image source={require('../../../assets/images/logo.png')} style={styles.logo} resizeMode="contain" />
      <Text style={styles.subtitle}>Log in to your account</Text>
      <TextInput style={styles.input} placeholder="Email" autoCapitalize="none" keyboardType="email-address" autoComplete="email" value={email} onChangeText={setEmail} editable={!busy} />
      <TextInput style={styles.input} placeholder="Password" secureTextEntry autoCapitalize="none" autoComplete="password" value={password} onChangeText={setPassword} editable={!busy} onSubmitEditing={submit} />
      <Pressable style={[styles.button, busy && styles.disabled]} onPress={submit} disabled={busy}>
        <Text style={styles.buttonText}>{busy ? 'Logging in...' : 'Log in'}</Text>
      </Pressable>
      <Pressable onPress={() => router.push('/forgot-password')}><Text style={styles.link}>Forgot password?</Text></Pressable>
      <Pressable onPress={() => router.push('/register')}><Text style={styles.link}>Create an account</Text></Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24, gap: 12, backgroundColor: '#fff' },
  logo: { width: 150, height: 150, alignSelf: 'center' },
  subtitle: { fontSize: 15, color: '#6B7280', textAlign: 'center', marginBottom: 12 },
  input: { minHeight: 50, borderWidth: 1, borderColor: '#ccc', borderRadius: 10, padding: 14 },
  button: { backgroundColor: '#4F46E5', borderRadius: 10, minHeight: 50, padding: 14, alignItems: 'center', justifyContent: 'center' },
  buttonText: { color: '#fff', fontWeight: '600' },
  link: { textAlign: 'center', color: '#4F46E5', marginTop: 6 },
  disabled: { opacity: 0.65 },
});
