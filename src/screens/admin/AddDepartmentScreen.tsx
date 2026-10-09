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
import { addClinicWing, getStaffMembers } from '@/services/adminService';
import type { StaffMember } from '@/services/adminService';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const BUILDING_LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
const SHIFT_OPTIONS = [
  { label: 'Morning · 6–12', range: '06:00-12:00' },
  { label: 'Evening · 12–6', range: '12:00-18:00' },
  { label: 'Night · 7–12', range: '19:00-00:00' },
  { label: 'Midnight · 12–6', range: '00:00-06:00' },
];

export default function AddDepartmentScreen({ onBack }: { onBack: () => void }) {
  const [name, setName] = useState('');
  const [building, setBuilding] = useState('A');
  const [floor, setFloor] = useState('1');
  const [section, setSection] = useState('A');
  const [maxRooms, setMaxRooms] = useState(5);
  const [roomNumbers, setRoomNumbers] = useState<number[]>([1, 2, 3, 4, 5]);
  const [consultants, setConsultants] = useState<StaffMember[]>([]);
  const [consultantId, setConsultantId] = useState('');
  const [schedule, setSchedule] = useState<Record<string, string[]>>({});
  const [loadingConsultants, setLoadingConsultants] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    getStaffMembers('senior_consultant')
      .then((members) => {
        if (!active) return;
        setConsultants(members);
        setConsultantId('');
      })
      .catch(() => {
        if (active) Alert.alert('Could not load consultants', 'Please try again.');
      })
      .finally(() => { if (active) setLoadingConsultants(false); });
    return () => { active = false; };
  }, []);

  const sessions = useMemo(
    () => [...new Set(Object.values(schedule).flat())].sort(),
    [schedule],
  );
  const relevantConsultants = consultants.filter((member) =>
    member.opdName.trim().toLocaleLowerCase() === name.trim().toLocaleLowerCase()
  );

  const toggleShift = (day: string, range: string) => {
    setSchedule((current) => {
      const selected = current[day] ?? [];
      const values = selected.includes(range)
        ? selected.filter((value) => value !== range)
        : [...selected, range];
      return { ...current, [day]: values };
    });
  };

  const changeBuilding = (direction: -1 | 1) => {
    const current = BUILDING_LETTERS.indexOf(building);
    const next = Math.min(BUILDING_LETTERS.length - 1, Math.max(0, current + direction));
    setBuilding(BUILDING_LETTERS[next]);
  };

  const changeFloor = (value: number) => setFloor(String(Math.min(20, Math.max(1, value))));
  const changeMaxRooms = (value: number) => {
    const next = Math.min(100, Math.max(1, value));
    setMaxRooms(next);
    setRoomNumbers((current) => next > maxRooms
      ? [...new Set([...current, ...Array.from({ length: next - maxRooms }, (_, index) => maxRooms + index + 1)])]
      : current.filter((room) => room <= next));
  };

  const toggleRoom = (room: number) => {
    setRoomNumbers((current) => current.includes(room)
      ? current.filter((value) => value !== room)
      : [...current, room].sort((first, second) => first - second));
  };

  const save = async () => {
    const consultant = relevantConsultants.find((member) => member.id === consultantId);
    if (!name.trim() || !/^[A-Z]$/.test(building) || !/^([1-9]|1\d|20)$/.test(floor) || !['A', 'B'].includes(section) || !sessions.length || !roomNumbers.length) {
      Alert.alert('Department details needed', 'Enter the department name, choose a valid building, floor, section and room, and select sessions.');
      return;
    }
    setSaving(true);
    try {
      await addClinicWing({
        name: name.trim(),
        building,
        floor,
        section,
        maxRooms,
        rooms: roomNumbers.map((room) => `Room ${room}`).join(', '),
        maxDailyTokens: 100,
        clinicHead: consultant?.name,
        seniorConsultantId: consultant?.id,
        operatingDays: DAYS.filter((day) => (schedule[day] ?? []).length > 0),
        sessions,
        weeklySessions: schedule,
        active: true,
        closedToday: false,
      });
      Alert.alert('Department added', `${name.trim()} has been added.`, [{ text: 'OK', onPress: onBack }]);
    } catch {
      Alert.alert('Could not save department', 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} accessibilityRole="button"><Text style={styles.back}>‹ Back to Manages</Text></TouchableOpacity>
        <Text style={styles.title}>Add clinic wing</Text>
        <Text style={styles.subtitle}>Set its weekly OPD sessions and senior consultant.</Text>
      </View>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.label}>Department name</Text>
        <TextInput style={styles.input} value={name} onChangeText={(value) => {
          setName(value);
          if (!consultants.some((member) => member.opdName.trim().toLocaleLowerCase() === value.trim().toLocaleLowerCase())) {
            setConsultantId('');
          }
        }} placeholder="e.g. General OPD" />

        <Text style={styles.sectionTitle}>Sessions by day</Text>
        <Text style={styles.hint}>Choose one or more session times for each day.</Text>
        {DAYS.map((day) => (
          <View key={day} style={styles.dayCard}>
            <Text style={styles.dayTitle}>{day}</Text>
            <View style={styles.chips}>
              {SHIFT_OPTIONS.map((shift) => {
                const selected = (schedule[day] ?? []).includes(shift.range);
                return (
                  <TouchableOpacity key={shift.range} onPress={() => toggleShift(day, shift.range)} style={[styles.chip, selected && styles.selected]}>
                    <Text style={[styles.chipText, selected && styles.selectedText]}>{shift.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        ))}

        <Text style={styles.sectionTitle}>Location</Text>
        <Text style={styles.label}>Building (A–Z)</Text>
        <View style={styles.stepper}>
          <TouchableOpacity style={styles.stepButton} onPress={() => changeBuilding(-1)} accessibilityLabel="Previous building"><Text style={styles.stepText}>{'\u25BC'}</Text></TouchableOpacity>
          <TextInput style={styles.stepInput} value={building} onChangeText={(value) => setBuilding(value.toUpperCase().replace(/[^A-Z]/g, '').slice(-1))} autoCapitalize="characters" maxLength={1} />
          <TouchableOpacity style={styles.stepButton} onPress={() => changeBuilding(1)} accessibilityLabel="Next building"><Text style={styles.stepText}>{'\u25B2'}</Text></TouchableOpacity>
        </View>

        <Text style={styles.label}>Floor (1–20)</Text>
        <View style={styles.stepper}>
          <TouchableOpacity style={styles.stepButton} onPress={() => changeFloor(Number(floor || 1) - 1)} accessibilityLabel="Previous floor"><Text style={styles.stepText}>{'\u25BC'}</Text></TouchableOpacity>
          <TextInput style={styles.stepInput} value={floor} onChangeText={(value) => {
            if (/^\d{0,2}$/.test(value)) setFloor(value ? String(Math.min(20, Math.max(1, Number(value)))) : '');
          }} keyboardType="number-pad" maxLength={2} />
          <TouchableOpacity style={styles.stepButton} onPress={() => changeFloor(Number(floor || 1) + 1)} accessibilityLabel="Next floor"><Text style={styles.stepText}>{'\u25B2'}</Text></TouchableOpacity>
        </View>

        <Text style={styles.label}>Section</Text>
        <View style={styles.chips}>
          {['A', 'B'].map((value) => <TouchableOpacity key={value} onPress={() => setSection(value)} style={[styles.sectionChoice, section === value && styles.selected]}><Text style={[styles.sectionChoiceText, section === value && styles.selectedText]}>{value}</Text></TouchableOpacity>)}
        </View>

        <Text style={styles.label}>Maximum rooms</Text>
        <View style={styles.stepper}>
          <TouchableOpacity style={styles.stepButton} onPress={() => changeMaxRooms(maxRooms - 1)} accessibilityLabel="Fewer rooms"><Text style={styles.stepText}>{'\u25BC'}</Text></TouchableOpacity>
          <TextInput style={styles.stepInput} value={String(maxRooms)} onChangeText={(value) => {
            if (/^\d{0,3}$/.test(value) && value) changeMaxRooms(Number(value));
          }} keyboardType="number-pad" maxLength={3} />
          <TouchableOpacity style={styles.stepButton} onPress={() => changeMaxRooms(maxRooms + 1)} accessibilityLabel="More rooms"><Text style={styles.stepText}>{'\u25B2'}</Text></TouchableOpacity>
        </View>
        <Text style={styles.label}>Room numbers</Text>
        <View style={styles.chips}>
          {Array.from({ length: maxRooms }, (_, index) => index + 1).map((room) => {
            const selected = roomNumbers.includes(room);
            return <TouchableOpacity key={room} onPress={() => toggleRoom(room)} style={[styles.roomChoice, selected && styles.selected]}><Text style={[styles.roomText, selected && styles.selectedText]}>{room}</Text></TouchableOpacity>;
          })}
        </View>

        <Text style={styles.sectionTitle}>Senior consultant (optional)</Text>
        {loadingConsultants ? <ActivityIndicator color="#5B6CF8" /> : (
          <View style={styles.chips}>
            <TouchableOpacity onPress={() => setConsultantId('')} style={[styles.chip, !consultantId && styles.selected]}>
              <Text style={[styles.chipText, !consultantId && styles.selectedText]}>Not yet</Text>
            </TouchableOpacity>
            {relevantConsultants.map((consultant) => (
              <TouchableOpacity key={consultant.id} onPress={() => setConsultantId(consultant.id ?? '')} style={[styles.chip, consultantId === consultant.id && styles.selected]}>
                <Text style={[styles.chipText, consultantId === consultant.id && styles.selectedText]}>{consultant.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
        {!loadingConsultants && name.trim() && !relevantConsultants.length
          ? <Text style={styles.hint}>No senior consultant is assigned to this department yet. You can add one later.</Text>
          : null}

        <TouchableOpacity disabled={saving || loadingConsultants} style={[styles.save, (saving || loadingConsultants) && styles.disabled]} onPress={save}>
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveText}>Save department</Text>}
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
  label: { color: '#555D73', fontSize: 13, fontWeight: '700', marginBottom: 6, marginTop: 12 },
  input: { backgroundColor: '#fff', borderColor: '#E0E3ED', borderWidth: 1, borderRadius: 11, paddingHorizontal: 13, paddingVertical: 12, color: '#20243A' },
  stepper: { minHeight: 48, flexDirection: 'row', alignItems: 'center', borderRadius: 11, borderWidth: 1, borderColor: '#E0E3ED', backgroundColor: '#fff', overflow: 'hidden' },
  stepButton: { width: 52, height: 48, alignItems: 'center', justifyContent: 'center', backgroundColor: '#E9ECFF' },
  stepText: { color: '#4355C6', fontSize: 22, fontWeight: '800' },
  stepInput: { flex: 1, textAlign: 'center', color: '#20243A', fontSize: 18, fontWeight: '800', paddingVertical: 8 },
  sectionTitle: { marginTop: 21, marginBottom: 7, color: '#20243A', fontSize: 17, fontWeight: '800' },
  hint: { color: '#7B8193', fontSize: 13, marginBottom: 10 },
  dayCard: { marginTop: 10, padding: 12, backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: '#EAECF2' },
  dayTitle: { color: '#30364D', fontSize: 14, fontWeight: '800', marginBottom: 10 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1, borderColor: '#DEE2EF', backgroundColor: '#fff', borderRadius: 20, paddingVertical: 8, paddingHorizontal: 11 },
  chipText: { color: '#555D73', fontSize: 12, fontWeight: '600' },
  selected: { backgroundColor: '#E9ECFF', borderColor: '#6879E8' },
  selectedText: { color: '#4355C6' },
  sectionChoice: { minWidth: 72, alignItems: 'center', borderWidth: 1, borderColor: '#DEE2EF', backgroundColor: '#fff', borderRadius: 11, paddingVertical: 11 },
  sectionChoiceText: { color: '#555D73', fontSize: 15, fontWeight: '800' },
  roomChoice: { minWidth: 44, alignItems: 'center', borderWidth: 1, borderColor: '#DEE2EF', backgroundColor: '#fff', borderRadius: 10, paddingVertical: 9, paddingHorizontal: 10 },
  roomText: { color: '#555D73', fontWeight: '700' },
  save: { marginTop: 22, minHeight: 50, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: '#5B6CF8' },
  disabled: { opacity: 0.55 },
  saveText: { color: '#fff', fontSize: 15, fontWeight: '800' },
});
