import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { addStaffMember, subscribeClinicWings } from '@/services/adminService';
import type { ClinicWing, StaffRole } from '@/services/adminService';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const SHIFTS = [
  { label: 'Morning · 6–12', value: '06:00-12:00' },
  { label: 'Evening · 12–6', value: '12:00-18:00' },
  { label: 'Night · 7–12', value: '19:00-00:00' },
  { label: 'Midnight · 12–6', value: '00:00-06:00' },
  { label: 'Full day · 8–5:30', value: '08:00-17:30' },
];

type Props = { onBack: () => void };

export default function StaffManagement({ onBack }: Props) {
  const [opds, setOpds] = useState<ClinicWing[]>([]);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [age, setAge] = useState('');
  const [role, setRole] = useState<StaffRole>('nurse');
  const [opdId, setOpdId] = useState('');
  const [schedule, setSchedule] = useState<Record<string, string[]>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => subscribeClinicWings((items) => {
    const active = items.filter((item) => item.active);
    setOpds(active);
    setOpdId((current) => active.some((item) => item.id === current) ? current : active[0]?.id ?? '');
  }), []);

  const toggleShift = (day: string, shift: string) => {
    setSchedule((current) => {
      const selected = current[day] ?? [];
      const updated = selected.includes(shift)
        ? selected.filter((item) => item !== shift)
        : [...selected, shift];
      return { ...current, [day]: updated };
    });
  };

  const save = async () => {
    const selectedOpd = opds.find((item) => item.id === opdId);
    const parsedAge = Number(age);
    if (!name.trim() || !phone.trim() || !email.trim() || !Number.isInteger(parsedAge) || parsedAge < 18 || !selectedOpd) {
      Alert.alert('Details needed', 'Enter a name, phone, valid email, age of 18 or older, and select an active OPD.');
      return;
    }
    if (!Object.values(schedule).some((shifts) => shifts.length > 0)) {
      Alert.alert('Schedule needed', 'Select at least one consulting shift.');
      return;
    }
    setSaving(true);
    try {
      await addStaffMember({
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim(),
        age: parsedAge,
        role,
        opdId: selectedOpd.id!,
        opdName: selectedOpd.name,
        consultingSchedule: schedule,
        active: true,
      });
      Alert.alert('Staff member added', `${name.trim()} was added to ${selectedOpd.name}.`, [{ text: 'OK', onPress: onBack }]);
    } catch {
      Alert.alert('Could not save', 'Please check your connection and try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} accessibilityRole="button"><Text style={styles.back}>‹ Back</Text></TouchableOpacity>
        <Text style={styles.title}>Add staff member</Text>
      </View>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.roleRow}>
          {(['nurse', 'senior_consultant'] as const).map((item) => (
            <TouchableOpacity key={item} onPress={() => setRole(item)} style={[styles.roleButton, role === item && styles.selected]}>
              <Text style={[styles.roleText, role === item && styles.selectedText]}>{item === 'nurse' ? 'Nurse' : 'Senior consultant'}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={styles.label}>Name</Text><TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Full name" />
        <Text style={styles.label}>Phone</Text><TextInput style={styles.input} value={phone} onChangeText={setPhone} placeholder="Phone number" keyboardType="phone-pad" />
        <Text style={styles.label}>Email</Text><TextInput style={styles.input} value={email} onChangeText={setEmail} placeholder="Email address" keyboardType="email-address" autoCapitalize="none" />
        <Text style={styles.label}>Age</Text><TextInput style={styles.input} value={age} onChangeText={setAge} placeholder="Age" keyboardType="number-pad" />

        <Text style={styles.sectionTitle}>Clinic / OPD</Text>
        {opds.length ? <View style={styles.chips}>
          {opds.map((opd) => <TouchableOpacity key={opd.id} onPress={() => setOpdId(opd.id ?? '')} style={[styles.chip, opdId === opd.id && styles.selected]}>
            <Text style={[styles.chipText, opdId === opd.id && styles.selectedText]}>{opd.name}</Text>
          </TouchableOpacity>)}
        </View> : <Text style={styles.hint}>No active OPDs found. Add a department first.</Text>}

        <Text style={styles.sectionTitle}>Consulting days and shifts</Text>
        {DAYS.map((day) => (
          <View key={day} style={styles.dayCard}>
            <Text style={styles.dayTitle}>{day}</Text>
            <View style={styles.chips}>
              {SHIFTS.map((shift) => {
                const selected = (schedule[day] ?? []).includes(shift.value);
                return <TouchableOpacity key={shift.value} onPress={() => toggleShift(day, shift.value)} style={[styles.chip, selected && styles.selected]}>
                  <Text style={[styles.chipText, selected && styles.selectedText]}>{shift.label}</Text>
                </TouchableOpacity>;
              })}
            </View>
          </View>
        ))}
        <TouchableOpacity disabled={saving || !opds.length} style={[styles.save, (saving || !opds.length) && styles.saveDisabled]} onPress={save}>
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveText}>Save staff member</Text>}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F6F7FB' },
  header: { paddingHorizontal: 20, paddingVertical: 14, backgroundColor: '#fff' },
  back: { color: '#5365D9', fontSize: 15, fontWeight: '700', marginBottom: 10 },
  title: { color: '#20243A', fontSize: 22, fontWeight: '800' },
  content: { padding: 16, paddingBottom: 36 },
  roleRow: { flexDirection: 'row', gap: 10, marginBottom: 8 },
  roleButton: { flex: 1, minHeight: 46, alignItems: 'center', justifyContent: 'center', padding: 8, borderRadius: 12, borderWidth: 1, borderColor: '#DDE1EF', backgroundColor: '#fff' },
  roleText: { color: '#525A72', fontWeight: '700', textAlign: 'center' },
  selected: { backgroundColor: '#E9ECFF', borderColor: '#6879E8' },
  selectedText: { color: '#4355C6' },
  label: { marginTop: 13, marginBottom: 6, color: '#555D73', fontSize: 13, fontWeight: '700' },
  input: { backgroundColor: '#fff', borderColor: '#E0E3ED', borderWidth: 1, borderRadius: 11, paddingHorizontal: 13, paddingVertical: 12, color: '#20243A' },
  sectionTitle: { marginTop: 22, marginBottom: 10, color: '#20243A', fontSize: 17, fontWeight: '800' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1, borderColor: '#DEE2EF', backgroundColor: '#fff', borderRadius: 20, paddingVertical: 8, paddingHorizontal: 11 },
  chipText: { color: '#555D73', fontSize: 12, fontWeight: '600' },
  hint: { color: '#7B8193' },
  dayCard: { marginBottom: 10, padding: 12, backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: '#EAECF2' },
  dayTitle: { color: '#30364D', fontSize: 14, fontWeight: '800', marginBottom: 10 },
  save: { marginTop: 18, minHeight: 50, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: '#5B6CF8' },
  saveDisabled: { opacity: 0.55 },
  saveText: { color: '#fff', fontSize: 15, fontWeight: '800' },
});
