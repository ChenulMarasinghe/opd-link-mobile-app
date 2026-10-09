import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { logoutUser, updateUserProfile } from '@/services/auth';

export default function AdminProfileScreen() {
  const router = useRouter();
  const { user, profile, loading, refreshProfile } = useAuth();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState('');

  const beginEdit = () => {
    setName(profile?.name ?? user?.displayName ?? '');
    setPhone(profile?.phone ?? '');
    setFeedback('');
    setEditing(true);
  };

  const save = async () => {
    if (!user) return;
    const cleanName = name.trim();
    const cleanPhone = phone.trim();
    if (!cleanName) {
      setFeedback('Enter your name.');
      return;
    }
    if (cleanPhone && !/^\+?[0-9 ()-]{7,18}$/.test(cleanPhone)) {
      setFeedback('Enter a valid phone number.');
      return;
    }
    setSaving(true);
    setFeedback('');
    try {
      await updateUserProfile(user.uid, { name: cleanName, phone: cleanPhone });
      await refreshProfile();
      setEditing(false);
      setFeedback('Profile updated.');
    } catch {
      setFeedback('Could not update your profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const confirmLogout = () => Alert.alert('Log out', 'Are you sure you want to log out?', [
    { text: 'Cancel', style: 'cancel' },
    {
      text: 'Log out',
      style: 'destructive',
      onPress: async () => {
        try {
          await logoutUser();
        } finally {
          router.replace('/(auth)/login');
        }
      },
    },
  ]);

  const displayName = profile?.name || user?.displayName || 'Administrator';

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>My Profile</Text>
        <Text style={styles.subtitle}>Administrator account details</Text>
      </View>
      {loading ? <ActivityIndicator style={styles.loader} color="#635BFF" /> : (
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.profileCard}>
            <View style={styles.avatar}><Text style={styles.avatarText}>{displayName.charAt(0).toUpperCase()}</Text></View>
            <View style={styles.profileSummary}>
              <Text style={styles.profileName}>{displayName}</Text>
              <Text style={styles.accountId}>Administrator account</Text>
            </View>
            {editing ? (
              <View style={styles.actions}>
                <Pressable style={styles.cancelButton} onPress={() => setEditing(false)} disabled={saving}><Text style={styles.cancelText}>Cancel</Text></Pressable>
                <Pressable style={styles.editButton} onPress={save} disabled={saving}>
                  {saving ? <ActivityIndicator size="small" color="#5B6CF8" /> : <Text style={styles.editText}>Save</Text>}
                </Pressable>
              </View>
            ) : <Pressable style={styles.editButton} onPress={beginEdit}><Text style={styles.editText}>Edit profile</Text></Pressable>}
          </View>

          <Text style={styles.sectionLabel}>PERSONAL INFORMATION</Text>
          <View style={styles.infoCard}>
            <ProfileRow label="Full name" value={editing ? name : profile?.name || user?.displayName || ''} editing={editing} onChangeText={setName} />
            <ProfileRow label="Phone" value={editing ? phone : profile?.phone || ''} editing={editing} onChangeText={setPhone} keyboardType="phone-pad" />
            <ProfileRow label="Email" value={profile?.email || user?.email || ''} />
            <ProfileRow label="Role" value={profile?.role || 'admin'} />
          </View>
          {feedback ? <Text style={feedback === 'Profile updated.' ? styles.successText : styles.errorText}>{feedback}</Text> : null}

          <Pressable style={styles.logoutButton} onPress={confirmLogout} accessibilityRole="button">
            <Text style={styles.logoutText}>Log out</Text>
          </Pressable>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function ProfileRow({
  label,
  value,
  editing = false,
  onChangeText,
  keyboardType,
}: {
  label: string;
  value: string;
  editing?: boolean;
  onChangeText?: (value: string) => void;
  keyboardType?: 'default' | 'phone-pad';
}) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      {editing && onChangeText ? (
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          keyboardType={keyboardType ?? 'default'}
          autoCapitalize={label === 'Full name' ? 'words' : 'none'}
          placeholder={`Enter ${label.toLowerCase()}`}
        />
      ) : <Text style={styles.infoValue}>{value || 'Not set'}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F4F7FC' },
  header: { paddingHorizontal: 20, paddingVertical: 18, backgroundColor: '#FFFFFF' },
  title: { color: '#1D2A3B', fontSize: 22, fontWeight: '800' },
  subtitle: { color: '#8391A4', fontSize: 12, marginTop: 4 },
  loader: { marginTop: 40 },
  content: { padding: 16, paddingBottom: 32 },
  profileCard: { minHeight: 106, backgroundColor: '#FFFFFF', borderRadius: 18, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: '#E9EDFF', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#5B6CF8', fontSize: 22, fontWeight: '800' },
  profileSummary: { flex: 1 },
  profileName: { color: '#1D2A3B', fontSize: 15, fontWeight: '800' },
  accountId: { color: '#8792A5', fontSize: 11, marginTop: 4 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  editButton: { minWidth: 62, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 14, backgroundColor: '#EEF1FF', alignItems: 'center' },
  editText: { color: '#5365D9', fontSize: 12, fontWeight: '800' },
  cancelButton: { paddingHorizontal: 6, paddingVertical: 8 },
  cancelText: { color: '#778398', fontSize: 12, fontWeight: '700' },
  sectionLabel: { marginTop: 22, marginBottom: 8, marginLeft: 5, color: '#8A97AA', fontSize: 10, fontWeight: '800', letterSpacing: 0.8 },
  infoCard: { backgroundColor: '#FFFFFF', borderRadius: 18, paddingHorizontal: 16 },
  infoRow: { paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: '#EDF0F5' },
  infoLabel: { color: '#8A97AA', fontSize: 11, fontWeight: '700', marginBottom: 5 },
  infoValue: { color: '#28374B', fontSize: 14, fontWeight: '600' },
  input: { minHeight: 40, borderRadius: 9, borderWidth: 1, borderColor: '#DDE3EE', paddingHorizontal: 10, color: '#28374B', fontSize: 14 },
  successText: { color: '#047857', fontSize: 12, textAlign: 'center', marginTop: 12 },
  errorText: { color: '#B91C1C', fontSize: 12, textAlign: 'center', marginTop: 12 },
  logoutButton: { marginTop: 22, minHeight: 48, borderRadius: 13, backgroundColor: '#FFF1F1', alignItems: 'center', justifyContent: 'center' },
  logoutText: { color: '#DC2626', fontSize: 14, fontWeight: '800' },
});
