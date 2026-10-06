import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { addDoctor, getClinicWings, getDoctors } from '@/services/adminService';
import type { Doctor, ClinicWing } from '@/services/adminService';

const DEPARTMENTS = ['General OPD', 'Cardiology', 'Dental', 'ENT', 'Orthopedics', 'Neurology'];
const DAYS = ['M', 'T', 'W', 'T', 'F', 'S'];
const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const SLOT_PRESETS = {
  Morning: ['08:30 AM - 11:30 AM'],
  Evening: ['04:00 PM - 07:00 PM'],
  'Full Day': ['08:30 AM - 12:00 PM', '01:00 PM - 05:00 PM'],
};

export default function ManageOPD() {
  const [view, setView] = useState<'main' | 'addDoctor' | 'addWing'>('main');
  const [clinics, setClinics] = useState<ClinicWing[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [saving, setSaving] = useState(false);

  // Add Doctor Form
  const [doctorName, setDoctorName] = useState('');
  const [department, setDepartment] = useState('General OPD');
  const [room, setRoom] = useState('');
  const [maxTokens, setMaxTokens] = useState('');
  const [selectedShift, setSelectedShift] = useState<'Morning' | 'Evening' | 'Full Day'>('Morning');
  const [selectedSlots, setSelectedSlots] = useState<string[]>(SLOT_PRESETS.Morning);
  const [selectedDays, setSelectedDays] = useState<number[]>([0, 1, 2, 3, 4]);
  const [showDeptPicker, setShowDeptPicker] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [wings, docs] = await Promise.all([getClinicWings(), getDoctors()]);
      setClinics(wings);
      setDoctors(docs);
    } catch (e) {
      console.error(e);
    }
  };

  const handleShiftSelect = (shift: 'Morning' | 'Evening' | 'Full Day') => {
    setSelectedShift(shift);
    setSelectedSlots(SLOT_PRESETS[shift]);
  };

  const toggleDay = (idx: number) => {
    setSelectedDays((prev) =>
      prev.includes(idx) ? prev.filter((d) => d !== idx) : [...prev, idx]
    );
  };

  const handleSaveDoctor = async () => {
    if (!doctorName.trim() || !room.trim() || !maxTokens.trim()) {
      Alert.alert('Validation', 'Please fill in all required fields');
      return;
    }
    setSaving(true);
    try {
      await addDoctor({
        name: doctorName.trim(),
        department,
        hospital: 'Colombo National Hospital',
        room: room.trim(),
        maxTokens: parseInt(maxTokens, 10),
        consultingSlots: selectedSlots,
        consultingDays: selectedDays.map((i) => DAY_LABELS[i]),
        active: true,
      });
      Alert.alert('Success', `Dr. ${doctorName} has been added successfully!`, [
        {
          text: 'OK',
          onPress: () => {
            setDoctorName('');
            setRoom('');
            setMaxTokens('');
            setSelectedDays([0, 1, 2, 3, 4]);
            setSelectedSlots(SLOT_PRESETS.Morning);
            setView('main');
            loadData();
          },
        },
      ]);
    } catch (e) {
      Alert.alert('Error', 'Failed to save doctor. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const groupedByDept = DEPARTMENTS.reduce(
    (acc, dept) => {
      const deptClinics = clinics.filter((c) => c.name.includes(dept.split(' ')[0]));
      const deptDoctors = doctors.filter((d) => d.department === dept);
      if (deptClinics.length > 0 || deptDoctors.length > 0) {
        acc[dept] = { clinics: deptClinics, doctors: deptDoctors };
      }
      return acc;
    },
    {} as Record<string, { clinics: ClinicWing[]; doctors: Doctor[] }>
  );

  // ── Add Doctor View ──────────────────────────────────────────────────────
  if (view === 'addDoctor') {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.pageHeader}>
            <TouchableOpacity onPress={() => setView('main')} style={styles.backBtn}>
              <Text style={styles.backText}>‹ Back</Text>
            </TouchableOpacity>
            <Text style={styles.pageTitle}>Add Doctor</Text>
          </View>
          <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
            <View style={styles.formCard}>
              {/* Doctor Name */}
              <Text style={styles.fieldLabel}>Doctor Name</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Dr. Amanda Silva"
                placeholderTextColor="#C4C9D4"
                value={doctorName}
                onChangeText={setDoctorName}
              />

              {/* Department */}
              <Text style={styles.fieldLabel}>Department</Text>
              <TouchableOpacity
                style={styles.dropdown}
                onPress={() => setShowDeptPicker(!showDeptPicker)}
              >
                <Text style={styles.dropdownText}>{department}</Text>
                <Text style={styles.dropdownArrow}>▾</Text>
              </TouchableOpacity>
              {showDeptPicker && (
                <View style={styles.dropdownMenu}>
                  {DEPARTMENTS.map((d) => (
                    <TouchableOpacity
                      key={d}
                      style={[styles.dropdownItem, d === department && styles.dropdownItemActive]}
                      onPress={() => {
                        setDepartment(d);
                        setShowDeptPicker(false);
                      }}
                    >
                      <Text
                        style={[
                          styles.dropdownItemText,
                          d === department && styles.dropdownItemTextActive,
                        ]}
                      >
                        {d}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {/* Room & Max Tokens */}
              <View style={styles.rowFields}>
                <View style={styles.halfField}>
                  <Text style={styles.fieldLabel}>Room Number</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. Room 15"
                    placeholderTextColor="#C4C9D4"
                    value={room}
                    onChangeText={setRoom}
                  />
                </View>
                <View style={styles.halfField}>
                  <Text style={styles.fieldLabel}>Max Tokens</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. 40"
                    placeholderTextColor="#C4C9D4"
                    value={maxTokens}
                    onChangeText={setMaxTokens}
                    keyboardType="numeric"
                  />
                </View>
              </View>

              {/* Consulting Time Slots */}
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.fieldLabel}>Consulting Time Slots</Text>
                <TouchableOpacity>
                  <Text style={styles.shiftConfig}>Shift Config</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.shiftTabRow}>
                {(['Morning', 'Evening', 'Full Day'] as const).map((s) => (
                  <TouchableOpacity
                    key={s}
                    style={[styles.shiftTab, selectedShift === s && styles.shiftTabActive]}
                    onPress={() => handleShiftSelect(s)}
                  >
                    <Text
                      style={[styles.shiftTabText, selectedShift === s && styles.shiftTabTextActive]}
                    >
                      {s}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <View style={styles.slotsWrap}>
                {selectedSlots.map((slot) => (
                  <View key={slot} style={styles.slotChip}>
                    <Text style={styles.slotChipText}>🕐 {slot}</Text>
                  </View>
                ))}
                <TouchableOpacity style={styles.addSlotBtn}>
                  <Text style={styles.addSlotText}>+ Custom Slot</Text>
                </TouchableOpacity>
              </View>

              {/* Consulting Days */}
              <Text style={styles.fieldLabel}>Consulting Days</Text>
              <View style={styles.daysRow}>
                {DAYS.map((day, idx) => (
                  <TouchableOpacity
                    key={`${day}-${idx}`}
                    style={[styles.dayBtn, selectedDays.includes(idx) && styles.dayBtnActive]}
                    onPress={() => toggleDay(idx)}
                  >
                    <Text
                      style={[
                        styles.dayBtnText,
                        selectedDays.includes(idx) && styles.dayBtnTextActive,
                      ]}
                    >
                      {day}
                    </Text>
                    <Text
                      style={[
                        styles.dayBtnSub,
                        selectedDays.includes(idx) && styles.dayBtnSubActive,
                      ]}
                    >
                      {DAY_LABELS[idx]}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <TouchableOpacity
              style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
              onPress={handleSaveDoctor}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.saveBtnText}>✓ Save Doctor</Text>
              )}
            </TouchableOpacity>

            <View style={styles.bottomSpacer} />
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // ── Add Wing View ────────────────────────────────────────────────────────
  if (view === 'addWing') {
    return <AddClinicWingScreen onBack={() => { setView('main'); loadData(); }} />;
  }

  // ── Main View ─────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.mainHeader}>
        <Text style={styles.mainTitle}>Manage OPD & Doctors</Text>
        <Text style={styles.mainSubtitle}>
          Add new doctors and manage active clinic departments
        </Text>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Quick Actions */}
        <View style={styles.quickActionsRow}>
          <TouchableOpacity style={styles.quickCard} onPress={() => setView('addDoctor')}>
            <Text style={styles.quickCardIcon}>👨‍⚕️</Text>
            <Text style={styles.quickCardTitle}>+ Add Doctor</Text>
            <Text style={styles.quickCardSub}>Assign to department</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickCard} onPress={() => setView('addWing')}>
            <Text style={styles.quickCardIcon}>🏥</Text>
            <Text style={styles.quickCardTitle}>+ Add Clinic Wing</Text>
            <Text style={styles.quickCardSub}>Create a new wing</Text>
          </TouchableOpacity>
        </View>

        {/* Inline Add Doctor Form Preview */}
        <View style={styles.formCard}>
          <View style={styles.formHeaderRow}>
            <Text style={styles.formHeaderTitle}>👤 Add Doctor</Text>
            <Text style={styles.formHeaderBadge}>Instant Roster</Text>
          </View>

          <Text style={styles.fieldLabel}>Doctor Name</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Dr. Amanda Silva"
            placeholderTextColor="#C4C9D4"
            value={doctorName}
            onChangeText={setDoctorName}
          />

          <Text style={styles.fieldLabel}>Department</Text>
          <TouchableOpacity
            style={styles.dropdown}
            onPress={() => setShowDeptPicker(!showDeptPicker)}
          >
            <Text style={styles.dropdownText}>{department}</Text>
            <Text style={styles.dropdownArrow}>▾</Text>
          </TouchableOpacity>

          <View style={styles.rowFields}>
            <View style={styles.halfField}>
              <Text style={styles.fieldLabel}>Room Number</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Room 15"
                placeholderTextColor="#C4C9D4"
                value={room}
                onChangeText={setRoom}
              />
            </View>
            <View style={styles.halfField}>
              <Text style={styles.fieldLabel}>Max Tokens</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. 40"
                placeholderTextColor="#C4C9D4"
                value={maxTokens}
                onChangeText={setMaxTokens}
                keyboardType="numeric"
              />
            </View>
          </View>

          {/* Shift Selection */}
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.fieldLabel}>Consulting Time Slots</Text>
            <TouchableOpacity>
              <Text style={styles.shiftConfig}>Shift Config</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.shiftTabRow}>
            {(['Morning', 'Evening', 'Full Day'] as const).map((s) => (
              <TouchableOpacity
                key={s}
                style={[styles.shiftTab, selectedShift === s && styles.shiftTabActive]}
                onPress={() => handleShiftSelect(s)}
              >
                <Text
                  style={[styles.shiftTabText, selectedShift === s && styles.shiftTabTextActive]}
                >
                  {s}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.slotsWrap}>
            {selectedSlots.map((slot) => (
              <View key={slot} style={styles.slotChip}>
                <Text style={styles.slotChipText}>🕐 {slot}</Text>
              </View>
            ))}
            <TouchableOpacity style={styles.addSlotBtn}>
              <Text style={styles.addSlotText}>+ Custom Slot</Text>
            </TouchableOpacity>
          </View>

          {/* Consulting Days */}
          <Text style={styles.fieldLabel}>Consulting Days</Text>
          <View style={styles.daysRow}>
            {DAYS.map((day, idx) => (
              <TouchableOpacity
                key={`${day}-${idx}`}
                style={[styles.dayBtn, selectedDays.includes(idx) && styles.dayBtnActive]}
                onPress={() => toggleDay(idx)}
              >
                <Text
                  style={[
                    styles.dayBtnText,
                    selectedDays.includes(idx) && styles.dayBtnTextActive,
                  ]}
                >
                  {day}
                </Text>
                <Text
                  style={[
                    styles.dayBtnSub,
                    selectedDays.includes(idx) && styles.dayBtnSubActive,
                  ]}
                >
                  {DAY_LABELS[idx]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
            onPress={handleSaveDoctor}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.saveBtnText}>✓ Save Doctor</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Active Clinics */}
        <Text style={styles.activeClinicsTitle}>Active Clinics</Text>
        {Object.entries(groupedByDept).length === 0 && clinics.length === 0 ? (
          <View style={styles.emptySection}>
            <Text style={styles.emptyText}>No active clinics yet</Text>
          </View>
        ) : (
          clinics.map((clinic) => (
            <View key={clinic.id} style={styles.clinicRow}>
              <View style={styles.clinicIcon}>
                <Text style={styles.clinicIconText}>🏥</Text>
              </View>
              <View style={styles.clinicInfo}>
                <Text style={styles.clinicName}>{clinic.name}</Text>
                <Text style={styles.clinicSub}>
                  Rooms {clinic.rooms} • {doctors.filter((d) => d.department.includes(clinic.name.split(' ')[0])).length} Doctors
                </Text>
              </View>
              <TouchableOpacity style={styles.manageBtn}>
                <Text style={styles.manageBtnText}>Manage ›</Text>
              </TouchableOpacity>
            </View>
          ))
        )}

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Add Clinic Wing Sub-component ─────────────────────────────────────────

function AddClinicWingScreen({ onBack }: { onBack: () => void }) {
  const [wingName, setWingName] = useState('');
  const [building, setBuilding] = useState('');
  const [floor, setFloor] = useState('');
  const [rooms, setRooms] = useState('');
  const [maxTokens, setMaxTokens] = useState('50');
  const [clinicHead, setClinicHead] = useState('');
  const [selectedDays, setSelectedDays] = useState<number[]>([0, 1, 2, 3, 4, 5]);
  const [saving, setSaving] = useState(false);

  const DAYS = ['M', 'T', 'W', 'T', 'F', 'S'];
  const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const TOKEN_PRESETS = [30, 50, 75, 100];

  const toggleDay = (idx: number) => {
    setSelectedDays((prev) =>
      prev.includes(idx) ? prev.filter((d) => d !== idx) : [...prev, idx]
    );
  };

  const handleSave = async () => {
    if (!wingName.trim() || !building.trim() || !rooms.trim()) {
      Alert.alert('Validation', 'Please fill in all required fields');
      return;
    }
    setSaving(true);
    try {
      const { addClinicWing } = await import('@/services/adminService');
      await addClinicWing({
        name: wingName.trim(),
        building: building.trim(),
        floor: floor.trim(),
        rooms: rooms.trim(),
        maxDailyTokens: parseInt(maxTokens, 10),
        clinicHead: clinicHead.trim() || undefined,
        operatingDays: selectedDays.map((i) => DAY_LABELS[i]),
        active: true,
      });
      Alert.alert('Success', `${wingName} has been added and activated!`, [
        { text: 'OK', onPress: onBack },
      ]);
    } catch (e) {
      Alert.alert('Error', 'Failed to save clinic wing');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.pageHeader}>
          <TouchableOpacity onPress={onBack} style={styles.backBtn}>
            <Text style={styles.backText}>‹ Back to OPD Management</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.wingHeader}>
            <Text style={styles.wingTitle}>Add Clinic Wing</Text>
            <Text style={styles.wingSubtitle}>
              Create a new outpatient clinic department and allocate rooms
            </Text>
          </View>

          <View style={styles.formCard}>
            {/* Wing Name */}
            <Text style={styles.fieldLabel}>
              Wing Name <Text style={styles.required}>*</Text>
            </Text>
            <View style={styles.inputWithIcon}>
              <Text style={styles.inputIcon}>🏢</Text>
              <TextInput
                style={styles.inputInner}
                placeholder="e.g. Ophthalmology (Eye OPD)"
                placeholderTextColor="#C4C9D4"
                value={wingName}
                onChangeText={setWingName}
              />
            </View>

            {/* Building & Floor */}
            <Text style={styles.fieldLabel}>
              Building & Floor <Text style={styles.required}>*</Text>
            </Text>
            <View style={styles.rowFields}>
              <View style={[styles.halfField, { flex: 1 }]}>
                <View style={styles.inputWithIcon}>
                  <Text style={styles.inputIcon}>🏢</Text>
                  <TextInput
                    style={styles.inputInner}
                    placeholder="e.g. Building B"
                    placeholderTextColor="#C4C9D4"
                    value={building}
                    onChangeText={setBuilding}
                  />
                </View>
              </View>
              <View style={[styles.halfField, { flex: 1 }]}>
                <View style={styles.inputWithIcon}>
                  <Text style={styles.inputIcon}>✏️</Text>
                  <TextInput
                    style={styles.inputInner}
                    placeholder="e.g. 2nd Floor"
                    placeholderTextColor="#C4C9D4"
                    value={floor}
                    onChangeText={setFloor}
                  />
                </View>
              </View>
            </View>

            {/* Allocated Rooms */}
            <Text style={styles.fieldLabel}>
              Allocated Rooms <Text style={styles.required}>*</Text>
            </Text>
            <View style={styles.inputWithIcon}>
              <Text style={styles.inputIcon}>🚪</Text>
              <TextInput
                style={styles.inputInner}
                placeholder="e.g. Room 201, Room 202, Room 205"
                placeholderTextColor="#C4C9D4"
                value={rooms}
                onChangeText={setRooms}
              />
            </View>
            <Text style={styles.helperText}>ℹ Separate multiple rooms with commas</Text>

            {/* Max Daily Tokens */}
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.fieldLabel}>
                Max Daily Tokens <Text style={styles.required}>*</Text>
              </Text>
              <Text style={styles.estLabel}>Est. 12 mins / consult</Text>
            </View>
            <View style={styles.inputWithIcon}>
              <Text style={styles.inputIcon}>🎟</Text>
              <TextInput
                style={styles.inputInner}
                keyboardType="numeric"
                value={maxTokens}
                onChangeText={setMaxTokens}
              />
            </View>
            <View style={styles.tokenPresetsRow}>
              {TOKEN_PRESETS.map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[
                    styles.tokenPresetBtn,
                    maxTokens === String(t) && styles.tokenPresetBtnActive,
                  ]}
                  onPress={() => setMaxTokens(String(t))}
                >
                  <Text
                    style={[
                      styles.tokenPresetText,
                      maxTokens === String(t) && styles.tokenPresetTextActive,
                    ]}
                  >
                    {t}{'\n'}Tokens
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Clinic Head */}
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.fieldLabel}>Clinic Head / Senior Consultant</Text>
              <Text style={styles.optionalLabel}>Optional</Text>
            </View>
            <View style={styles.inputWithIcon}>
              <Text style={styles.inputIcon}>🩺</Text>
              <TextInput
                style={styles.inputInner}
                placeholder="e.g. Dr. N. Jayawardena"
                placeholderTextColor="#C4C9D4"
                value={clinicHead}
                onChangeText={setClinicHead}
              />
            </View>

            {/* Operating Schedule */}
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.fieldLabel}>Operating Schedule</Text>
              <Text style={styles.estLabel}>Active OPD Days</Text>
            </View>
            <View style={styles.daysRow}>
              {DAYS.map((day, idx) => (
                <TouchableOpacity
                  key={`wing-${day}-${idx}`}
                  style={[styles.dayBtn, selectedDays.includes(idx) && styles.dayBtnActive]}
                  onPress={() => toggleDay(idx)}
                >
                  <Text
                    style={[
                      styles.dayBtnText,
                      selectedDays.includes(idx) && styles.dayBtnTextActive,
                    ]}
                  >
                    {day}
                  </Text>
                  <Text
                    style={[
                      styles.dayBtnSub,
                      selectedDays.includes(idx) && styles.dayBtnSubActive,
                    ]}
                  >
                    {DAY_LABELS[idx]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <TouchableOpacity
            style={[styles.saveWingBtn, saving && styles.saveBtnDisabled]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.saveWingBtnText}>✓ Save & Activate Wing</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancelBtn} onPress={onBack}>
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </TouchableOpacity>

          <View style={styles.bottomSpacer} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F5F6FA' },

  pageHeader: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#EAEDF3',
  },
  backBtn: { padding: 4 },
  backText: { fontSize: 14, color: '#5B6CF8', fontWeight: '600' },
  pageTitle: { fontSize: 17, fontWeight: '700', color: '#1A1D2E', marginTop: 4 },

  mainHeader: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EAEDF3',
  },
  mainTitle: { fontSize: 20, fontWeight: '800', color: '#1A1D2E' },
  mainSubtitle: { fontSize: 13, color: '#8B90A7', marginTop: 4 },

  scroll: { flex: 1 },

  quickActionsRow: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    paddingBottom: 0,
  },
  quickCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    alignItems: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    gap: 4,
  },
  quickCardIcon: { fontSize: 22, marginBottom: 4 },
  quickCardTitle: { fontSize: 14, fontWeight: '700', color: '#5B6CF8' },
  quickCardSub: { fontSize: 11, color: '#8B90A7' },

  formCard: {
    backgroundColor: '#fff',
    margin: 16,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    gap: 4,
  },
  formHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  formHeaderTitle: { fontSize: 15, fontWeight: '700', color: '#1A1D2E' },
  formHeaderBadge: {
    fontSize: 11,
    color: '#5B6CF8',
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    fontWeight: '600',
  },

  fieldLabel: { fontSize: 13, fontWeight: '600', color: '#374151', marginTop: 12, marginBottom: 6 },
  required: { color: '#EF4444' },
  helperText: { fontSize: 11, color: '#9CA3AF', marginTop: 4 },
  estLabel: { fontSize: 11, color: '#5B6CF8', fontWeight: '600' },
  optionalLabel: { fontSize: 11, color: '#9CA3AF' },

  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 14,
    color: '#1A1D2E',
    backgroundColor: '#FAFAFA',
    marginBottom: 4,
  },
  inputWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 10,
    backgroundColor: '#FAFAFA',
    marginBottom: 4,
  },
  inputIcon: { fontSize: 16, marginRight: 8 },
  inputInner: { flex: 1, paddingVertical: 11, fontSize: 14, color: '#1A1D2E' },

  dropdown: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FAFAFA',
    marginBottom: 4,
  },
  dropdownText: { fontSize: 14, color: '#1A1D2E' },
  dropdownArrow: { fontSize: 12, color: '#8B90A7' },
  dropdownMenu: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    backgroundColor: '#fff',
    marginBottom: 8,
    overflow: 'hidden',
  },
  dropdownItem: { paddingHorizontal: 14, paddingVertical: 10 },
  dropdownItemActive: { backgroundColor: '#EEF2FF' },
  dropdownItemText: { fontSize: 14, color: '#374151' },
  dropdownItemTextActive: { color: '#5B6CF8', fontWeight: '600' },

  rowFields: { flexDirection: 'row', gap: 10 },
  halfField: { flex: 1 },

  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 6,
  },
  shiftConfig: { fontSize: 12, color: '#5B6CF8', fontWeight: '600' },

  shiftTabRow: {
    flexDirection: 'row',
    backgroundColor: '#F5F6FA',
    borderRadius: 10,
    padding: 3,
    gap: 2,
    marginBottom: 10,
  },
  shiftTab: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 8,
    alignItems: 'center',
  },
  shiftTabActive: { backgroundColor: '#fff', shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4, elevation: 2 },
  shiftTabText: { fontSize: 13, color: '#8B90A7', fontWeight: '500' },
  shiftTabTextActive: { color: '#1A1D2E', fontWeight: '700' },

  slotsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  slotChip: {
    backgroundColor: '#EEF2FF',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  slotChipText: { fontSize: 12, color: '#5B6CF8', fontWeight: '600' },
  addSlotBtn: {
    backgroundColor: '#F5F6FA',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
  },
  addSlotText: { fontSize: 12, color: '#8B90A7' },

  daysRow: { flexDirection: 'row', gap: 6, marginBottom: 6 },
  dayBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#F5F6FA',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  dayBtnActive: { backgroundColor: '#5B6CF8', borderColor: '#5B6CF8' },
  dayBtnText: { fontSize: 12, fontWeight: '700', color: '#6B7280' },
  dayBtnTextActive: { color: '#fff' },
  dayBtnSub: { fontSize: 9, color: '#9CA3AF', marginTop: 2 },
  dayBtnSubActive: { color: 'rgba(255,255,255,0.8)' },

  tokenPresetsRow: { flexDirection: 'row', gap: 8, marginTop: 8, marginBottom: 4 },
  tokenPresetBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#F5F6FA',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  tokenPresetBtnActive: { backgroundColor: '#5B6CF8', borderColor: '#5B6CF8' },
  tokenPresetText: { fontSize: 11, color: '#6B7280', textAlign: 'center', fontWeight: '600' },
  tokenPresetTextActive: { color: '#fff' },

  saveBtn: {
    backgroundColor: '#5B6CF8',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 4,
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },

  saveWingBtn: {
    backgroundColor: '#5B6CF8',
    borderRadius: 28,
    paddingVertical: 16,
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 8,
  },
  saveWingBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  cancelBtn: { alignItems: 'center', paddingVertical: 14 },
  cancelBtnText: { fontSize: 14, color: '#8B90A7' },

  wingHeader: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 4 },
  wingTitle: { fontSize: 22, fontWeight: '800', color: '#1A1D2E' },
  wingSubtitle: { fontSize: 13, color: '#8B90A7', marginTop: 4 },

  activeClinicsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1D2E',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  clinicRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 12,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  clinicIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  clinicIconText: { fontSize: 18 },
  clinicInfo: { flex: 1 },
  clinicName: { fontSize: 14, fontWeight: '700', color: '#1A1D2E' },
  clinicSub: { fontSize: 11, color: '#8B90A7', marginTop: 2 },
  manageBtn: {
    backgroundColor: '#EEF2FF',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  manageBtnText: { fontSize: 12, color: '#5B6CF8', fontWeight: '600' },

  emptySection: { alignItems: 'center', paddingVertical: 24 },
  emptyText: { fontSize: 13, color: '#9CA3AF' },

  bottomSpacer: { height: 100 },
});
