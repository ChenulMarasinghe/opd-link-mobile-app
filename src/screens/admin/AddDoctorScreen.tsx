import React, { useEffect, useMemo, useState } from 'react';
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
import { addDoctor, subscribeClinicWings } from '@/services/adminService';
import type { ClinicWing } from '@/services/adminService';
import { parseTimeRange } from '@/services/appointmentSchedule';

const DAYS = [
  { name: 'Monday', short: 'Mon' },
  { name: 'Tuesday', short: 'Tue' },
  { name: 'Wednesday', short: 'Wed' },
  { name: 'Thursday', short: 'Thu' },
  { name: 'Friday', short: 'Fri' },
  { name: 'Saturday', short: 'Sat' },
  { name: 'Sunday', short: 'Sun' },
];
const SHIFTS = [
  { label: 'Morning · 6–12', range: '06:00-12:00' },
  { label: 'Evening · 12–6', range: '12:00-18:00' },
  { label: 'Night · 7–12', range: '19:00-00:00' },
  { label: 'Midnight · 12–6', range: '00:00-06:00' },
];

export default function AddDoctorScreen({ onBack }: { onBack: () => void }) {
  const [opds, setOpds] = useState<ClinicWing[]>([]);
  const [name, setName] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [age, setAge] = useState('');
  const [email, setEmail] = useState('');
  const [opdId, setOpdId] = useState('');
  const [slotMinutes, setSlotMinutes] = useState('15');
  const [weeklySchedule, setWeeklySchedule] = useState<Record<string, string[]>>({});
  const [loadingOpds, setLoadingOpds] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => subscribeClinicWings((items) => {
    const active = items.filter((opd) => opd.active);
    setOpds(active);
    setOpdId((current) => active.some((opd) => opd.id === current) ? current : active[0]?.id ?? '');
    setLoadingOpds(false);
  }), []);

  const selectedOpd = opds.find((opd) => opd.id === opdId);
  const selectedSlots = useMemo(
    () => [...new Set(Object.values(weeklySchedule).flat())].sort(),
    [weeklySchedule],
  );

  const availableShifts = (day: string) => {
    if (!selectedOpd) return [];
    const opdSessions = selectedOpd.weeklySessions
      ? selectedOpd.weeklySessions[day] ?? []
      : selectedOpd.sessions ?? [];
    if (selectedOpd.operatingDays?.length && !selectedOpd.operatingDays.includes(day)) return [];
    return SHIFTS.filter((shift) => {
      const shiftRange = parseTimeRange(shift.range);
      return !!shiftRange && opdSessions.some((session) => {
        const opdRange = parseTimeRange(session);
        return !!opdRange && Math.max(shiftRange.start, opdRange.start) < Math.min(shiftRange.end, opdRange.end);
      });
    });
  };

  const toggleShift = (day: string, range: string) => {
    setWeeklySchedule((current) => {
      const selected = current[day] ?? [];
      const updated = selected.includes(range)
        ? selected.filter((value) => value !== range)
        : [...selected, range];
      return { ...current, [day]: updated };
    });
  };

  const save = async () => {
    const parsedAge = Number(age);
    const parsedMinutes = Number(slotMinutes);
    if (!name.trim() || !specialty.trim() || !Number.isInteger(parsedAge) || parsedAge < 18 || !/^\S+@\S+\.\S+$/.test(email.trim()) || !selectedOpd) {
      Alert.alert('Doctor details needed', 'Enter the doctor name, specialty, valid age and email, and select a department.');
      return;
    }
    if (!Number.isInteger(parsedMinutes) || parsedMinutes < 1 || parsedMinutes > 240) {
      Alert.alert('Consultation time needed', 'Enter a whole number of minutes between 1 and 240 per patient.');
      return;
    }
    if (!selectedSlots.length) {
      Alert.alert('Consulting schedule needed', 'Select at least one available shift on a weekday.');
      return;
    }

    setSaving(true);
    try {
      await addDoctor({
        name: name.trim(),
        age: parsedAge,
        email: email.trim(),
        specialty: specialty.trim(),
        department: selectedOpd.name,
        opdId: selectedOpd.id,
        hospital: '',
        room: '',
        roomNumber: '',
        maxTokens: 100,
        slotMinutes: parsedMinutes,
        consultingSlots: selectedSlots,
        consultingDays: DAYS.filter((day) => (weeklySchedule[day.name] ?? []).length > 0).map((day) => day.short),
        weeklyConsultingSessions: weeklySchedule,
        unavailableDates: [],
        active: true,
      });
      Alert.alert('Doctor added', `${name.trim()} is now listed in ${selectedOpd.name}.`, [{ text: 'OK', onPress: onBack }]);
    } catch {
      Alert.alert('Could not save doctor', 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} accessibilityRole="button"><Text style={styles.back}>‹ Back to Manages</Text></TouchableOpacity>
        <Text style={styles.title}>Add doctor</Text>
        <Text style={styles.subtitle}>Doctor details, OPD and consulting schedule.</Text>
      </View>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.label}>Doctor name</Text>
        <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Full name" />
        <Text style={styles.label}>Specialty</Text>
        <TextInput style={styles.input} value={specialty} onChangeText={setSpecialty} placeholder="e.g. Consultant Physician" />
        <View style={styles.row}>
          <View style={styles.flex}>
            <Text style={styles.label}>Age</Text>
            <TextInput style={styles.input} value={age} onChangeText={setAge} placeholder="Age" keyboardType="number-pad" />
          </View>
          <View style={styles.flex}>
            <Text style={styles.label}>Consultation minutes per patient</Text>
            <TextInput style={styles.input} value={slotMinutes} onChangeText={setSlotMinutes} keyboardType="number-pad" placeholder="15" />
          </View>
        </View>
        <Text style={styles.label}>Email</Text>
        <TextInput style={styles.input} value={email} onChangeText={setEmail} placeholder="Email address" keyboardType="email-address" autoCapitalize="none" />

        <Text style={styles.sectionTitle}>Department / OPD</Text>
        {loadingOpds ? <ActivityIndicator color="#5B6CF8" /> : opds.length ? (
          <View style={styles.chips}>
            {opds.map((opd) => <TouchableOpacity key={opd.id} onPress={() => { setOpdId(opd.id ?? ''); setWeeklySchedule({}); }} style={[styles.chip, opdId === opd.id && styles.selected]}>
              <Text style={[styles.chipText, opdId === opd.id && styles.selectedText]}>{opd.name}</Text>
            </TouchableOpacity>)}
          </View>
        ) : <Text style={styles.hint}>Add a department before adding a doctor.</Text>}

        <Text style={styles.sectionTitle}>Consulting days and sessions</Text>
        <Text style={styles.hint}>Available shift choices follow the selected OPD schedule.</Text>
        {DAYS.map((day) => {
          const shifts = availableShifts(day.name);
          return <View key={day.name} style={styles.dayCard}>
            <Text style={styles.dayTitle}>{day.name}</Text>
            {shifts.length ? <View style={styles.chips}>
              {shifts.map((shift) => {
                const selected = (weeklySchedule[day.name] ?? []).includes(shift.range);
                return <TouchableOpacity key={shift.range} onPress={() => toggleShift(day.name, shift.range)} style={[styles.chip, selected && styles.selected]}>
                  <Text style={[styles.chipText, selected && styles.selectedText]}>{shift.label}</Text>
                </TouchableOpacity>;
              })}
            </View> : <Text style={styles.hint}>No OPD sessions available this day.</Text>}
          </View>;
        })}

        <TouchableOpacity disabled={saving || loadingOpds || !opds.length} style={[styles.save, (saving || loadingOpds || !opds.length) && styles.disabled]} onPress={save}>
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveText}>Save doctor</Text>}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F6F7FB' },
  header: { paddingHorizontal: 20, paddingVertical: 14, backgroundColor: '#fff' },
  back: { color: '#5365D9', fontSize: 14, fontWeight: '700', marginBottom: 10 },
  title: { color: '#20243A', fontSize: 22, fontWeight: '800' },
  subtitle: { color: '#7B8193', marginTop: 5 },
  content: { padding: 16, paddingBottom: 36 },
  label: { color: '#555D73', fontSize: 13, fontWeight: '700', marginBottom: 6, marginTop: 13 },
  input: { backgroundColor: '#fff', borderColor: '#E0E3ED', borderWidth: 1, borderRadius: 11, paddingHorizontal: 13, paddingVertical: 12, color: '#20243A' },
  row: { flexDirection: 'row', gap: 10 },
  flex: { flex: 1 },
  sectionTitle: { marginTop: 21, marginBottom: 8, color: '#20243A', fontSize: 17, fontWeight: '800' },
  hint: { color: '#7B8193', fontSize: 13, marginBottom: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1, borderColor: '#DEE2EF', backgroundColor: '#fff', borderRadius: 20, paddingVertical: 8, paddingHorizontal: 11 },
  chipText: { color: '#555D73', fontSize: 12, fontWeight: '600' },
  selected: { backgroundColor: '#E9ECFF', borderColor: '#6879E8' },
  selectedText: { color: '#4355C6' },
  dayCard: { marginTop: 10, padding: 12, backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: '#EAECF2' },
  dayTitle: { color: '#30364D', fontSize: 14, fontWeight: '800', marginBottom: 10 },
  save: { marginTop: 22, minHeight: 50, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: '#5B6CF8' },
  disabled: { opacity: 0.55 },
  saveText: { color: '#fff', fontSize: 15, fontWeight: '800' },
});
