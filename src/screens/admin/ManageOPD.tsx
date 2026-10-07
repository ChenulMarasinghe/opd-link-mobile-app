import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
import {
  addClinicWing,
  addDoctor,
  subscribeClinicWings,
  subscribeDoctors,
  updateClinicWing,
  updateDoctor,
} from '@/services/adminService';
import type { Doctor, ClinicWing } from '@/services/adminService';
import { getTodayDateString, INITIAL_DOCTORS } from '@/services/mockData';

const DAYS = ['M', 'T', 'W', 'T', 'F', 'S'];
const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const SLOT_PRESETS = {
  Morning: ['08:30 AM - 11:30 AM'],
  Evening: ['04:00 PM - 07:00 PM'],
  'Full Day': ['08:30 AM - 12:00 PM', '01:00 PM - 05:00 PM'],
};

function getRoomNumbers(rooms: string): string[] {
  const range = rooms.match(/(\d+)\s*(?:-|–|to)\s*(\d+)/i);
  if (range) {
    const start = Number(range[1]);
    const end = Number(range[2]);
    if (end >= start && end - start <= 100) {
      const width = Math.max(range[1].length, range[2].length);
      return Array.from({ length: end - start + 1 }, (_, index) =>
        `Room ${String(start + index).padStart(width, '0')}`
      );
    }
  }
  return [...new Set(
    [...rooms.matchAll(/\b(?:room\s*)?(\d{1,4})\b/gi)]
      .map((match) => `Room ${match[1].padStart(Math.max(2, match[1].length), '0')}`)
  )];
}

function isValidDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const [, year, month, day] = match;
  const date = new Date(Number(year), Number(month) - 1, Number(day));
  return date.getFullYear() === Number(year) &&
    date.getMonth() === Number(month) - 1 &&
    date.getDate() === Number(day);
}

function getClinicDepartment(clinic: ClinicWing, doctors: Doctor[]): string {
  const clinicHead = doctors.find((doctor) => doctor.name === clinic.clinicHead);
  return clinicHead?.department ?? clinic.name;
}

export default function ManageOPD() {
  const [view, setView] = useState<'main' | 'addDoctor' | 'addWing'>('main');
  const [clinics, setClinics] = useState<ClinicWing[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [saving, setSaving] = useState(false);
  const [editingDoctor, setEditingDoctor] = useState<Doctor | null>(null);
  const [editingWing, setEditingWing] = useState<ClinicWing | null>(null);

  // Add Doctor Form
  const [doctorName, setDoctorName] = useState('');
  const [hospital, setHospital] = useState('Colombo National Hospital');
  const [selectedDepartment, setSelectedDepartment] = useState('General OPD');
  const [room, setRoom] = useState(INITIAL_DOCTORS[0]?.room ?? '');
  const [maxTokens, setMaxTokens] = useState('40');
  const [consultingStartDate, setConsultingStartDate] = useState(getTodayDateString());
  const [selectedShift, setSelectedShift] = useState<'Morning' | 'Evening' | 'Full Day'>('Morning');
  const [selectedSlots, setSelectedSlots] = useState<string[]>(SLOT_PRESETS.Morning);
  const [selectedDays, setSelectedDays] = useState<number[]>([0, 1, 2, 3, 4]);
  const [showDeptPicker, setShowDeptPicker] = useState(false);
  const [showRoomPicker, setShowRoomPicker] = useState(false);

  useEffect(() => {
    const unsubscribeWings = subscribeClinicWings(setClinics);
    const unsubscribeDoctors = subscribeDoctors(setDoctors);
    return () => {
      unsubscribeWings();
      unsubscribeDoctors();
    };
  }, []);

  const rosterDoctors = useMemo(
    () => (doctors.length > 0 ? doctors : INITIAL_DOCTORS),
    [doctors]
  );
  const activeClinics = useMemo(
    () => clinics.filter((clinic) => clinic.active),
    [clinics]
  );
  const liveDepartments = useMemo(() => {
    const departmentDoctors = new Map<string, Doctor[]>();
    rosterDoctors.filter((doctor) => doctor.active).forEach((doctor) => {
      const members = departmentDoctors.get(doctor.department) ?? [];
      members.push(doctor);
      departmentDoctors.set(doctor.department, members);
    });
    return [...departmentDoctors.entries()].map(([name, members]) => {
      const clinic = activeClinics.find((item) =>
        item.clinicHead
          ? members.some((doctor) =>
              doctor.name.trim().toLowerCase() === item.clinicHead?.trim().toLowerCase()
            )
          : getClinicDepartment(item, rosterDoctors).toLowerCase() === name.toLowerCase()
      );
      return { name, doctors: members, clinic };
    });
  }, [activeClinics, rosterDoctors]);
  const departmentOptions = useMemo(() => [...new Set([
    ...rosterDoctors.filter((doctor) => doctor.active).map((doctor) => doctor.department),
    ...activeClinics.map((clinic) => getClinicDepartment(clinic, rosterDoctors)),
    ...(editingDoctor ? [editingDoctor.department] : []),
  ])], [activeClinics, editingDoctor, rosterDoctors]);
  const department = departmentOptions.includes(selectedDepartment)
    ? selectedDepartment
    : departmentOptions[0] ?? '';
  const selectedClinic = activeClinics.find(
    (clinic) => getClinicDepartment(clinic, rosterDoctors) === department
  );
  const roomOptions = useMemo(() => {
    const allocatedRooms = selectedClinic ? getRoomNumbers(selectedClinic.rooms) : [];
    const rooms = allocatedRooms.length > 0 ? allocatedRooms : [...new Set(
      rosterDoctors
        .filter((doctor) => doctor.active && doctor.department === department)
        .map((doctor) => doctor.room)
    )];
    if (editingDoctor && editingDoctor.department === department && !rooms.includes(editingDoctor.room)) {
      return [...rooms, editingDoctor.room];
    }
    return rooms;
  }, [department, editingDoctor, rosterDoctors, selectedClinic]);
  const maxTokenLimit = useMemo(() => selectedClinic?.maxDailyTokens ??
    Math.max(
      0,
      ...rosterDoctors
        .filter((doctor) => doctor.active && doctor.department === department)
        .map((doctor) => doctor.maxTokens),
      editingDoctor && editingDoctor.department === department ? editingDoctor.maxTokens : 0
    ), [department, editingDoctor, rosterDoctors, selectedClinic]);
  const selectedRoom = roomOptions.includes(room) ? room : roomOptions[0] ?? '';
  const availableDayIndexes = useMemo(() => {
    const departmentDays = selectedClinic?.operatingDays?.length
      ? selectedClinic.operatingDays
      : rosterDoctors
          .filter((doctor) => doctor.active && doctor.department === department)
          .flatMap((doctor) => doctor.consultingDays);
    const days = departmentDays.length > 0
      ? departmentDays
      : editingDoctor && editingDoctor.department === department
        ? editingDoctor.consultingDays
        : [];
    return [...new Set(days
      .map((day) => DAY_LABELS.indexOf(day))
      .filter((index) => index >= 0))];
  }, [department, editingDoctor, rosterDoctors, selectedClinic]);

  const handleShiftSelect = (shift: 'Morning' | 'Evening' | 'Full Day') => {
    setSelectedShift(shift);
    setSelectedSlots(SLOT_PRESETS[shift]);
  };

  const toggleDay = (idx: number) => {
    if (!availableDayIndexes.includes(idx)) return;
    setSelectedDays((prev) =>
      prev.includes(idx) ? prev.filter((d) => d !== idx) : [...prev, idx]
    );
  };

  const handleDepartmentSelect = (value: string) => {
    setSelectedDepartment(value);
    const clinic = activeClinics.find((item) => getClinicDepartment(item, rosterDoctors) === value);
    const assignedRooms = clinic ? getRoomNumbers(clinic.rooms) : [];
    const availableRooms = assignedRooms.length > 0
      ? assignedRooms
      : [...new Set(
          rosterDoctors
            .filter((doctor) => doctor.active && doctor.department === value)
            .map((doctor) => doctor.room)
        )];
    const tokenLimit = clinic?.maxDailyTokens ??
      Math.max(
        0,
        ...rosterDoctors
          .filter((doctor) => doctor.active && doctor.department === value)
          .map((doctor) => doctor.maxTokens)
      );
    setRoom(availableRooms[0] ?? '');
    setMaxTokens(tokenLimit > 0 ? String(Math.min(40, tokenLimit)) : '');
    const dayOptions = clinic?.operatingDays?.length
      ? clinic.operatingDays
      : rosterDoctors
          .filter((doctor) => doctor.active && doctor.department === value)
          .flatMap((doctor) => doctor.consultingDays);
    const allowedDays = [...new Set(dayOptions
      .map((day) => DAY_LABELS.indexOf(day))
      .filter((index) => index >= 0))];
    const weekdays = [0, 1, 2, 3, 4].filter((day) => allowedDays.includes(day));
    setSelectedDays(weekdays.length > 0 ? weekdays : allowedDays);
    setShowRoomPicker(false);
  };

  const startAddingDoctor = () => {
    const initialDepartment = departmentOptions[0] ?? '';
    setEditingDoctor(null);
    setDoctorName('');
    setHospital('Colombo National Hospital');
    setSelectedDepartment(initialDepartment);
    handleDepartmentSelect(initialDepartment);
    setMaxTokens('40');
    setConsultingStartDate(getTodayDateString());
    setSelectedShift('Morning');
    setSelectedSlots(SLOT_PRESETS.Morning);
    setSelectedDays([0, 1, 2, 3, 4]);
    setView('addDoctor');
  };

  const startEditingDoctor = useCallback((doctor: Doctor) => {
    setEditingDoctor(doctor);
    setDoctorName(doctor.name);
    setHospital(doctor.hospital ?? '');
    setSelectedDepartment(doctor.department);
    setRoom(doctor.room);
    setMaxTokens(String(doctor.maxTokens));
    setConsultingStartDate(doctor.consultingStartDate ?? getTodayDateString());
    setSelectedSlots(doctor.consultingSlots ?? []);
    setSelectedDays((doctor.consultingDays ?? [])
      .map((day) => DAY_LABELS.indexOf(day))
      .filter((index) => index >= 0));
    setSelectedShift(
      doctor.consultingSlots?.some((slot) => slot.toLowerCase().includes('pm'))
        ? 'Evening'
        : 'Morning'
    );
    setView('addDoctor');
  }, []);

  const startEditingWing = (wing: ClinicWing) => {
    setEditingWing(wing);
    setView('addWing');
  };

  const closeDoctorForm = () => {
    setEditingDoctor(null);
    setView('main');
  };

  const handleSaveDoctor = async () => {
    const parsedMaxTokens = Number(maxTokens);
    if (doctorName.trim().length < 3) {
      Alert.alert('Validation', 'Enter the doctor’s name.');
      return;
    }
    if (!hospital.trim()) {
      Alert.alert('Validation', 'Enter the hospital name.');
      return;
    }
    if (rosterDoctors.some(
      (doctor) => doctor.id !== editingDoctor?.id &&
        doctor.name.trim().toLowerCase() === doctorName.trim().toLowerCase()
    )) {
      Alert.alert('Validation', 'A doctor with this name already exists.');
      return;
    }
    if (!departmentOptions.includes(department)) {
      Alert.alert('Validation', 'Select an available department.');
      return;
    }
    if (!roomOptions.includes(selectedRoom)) {
      Alert.alert('Validation', 'Select a room allocated to this department.');
      return;
    }
    if (!Number.isInteger(parsedMaxTokens) || parsedMaxTokens < 1 || parsedMaxTokens > maxTokenLimit) {
      Alert.alert('Validation', `Maximum tokens must be a whole number from 1 to ${maxTokenLimit}.`);
      return;
    }
    if (!isValidDate(consultingStartDate)) {
      Alert.alert('Validation', 'Enter a valid consulting start date in YYYY-MM-DD format.');
      return;
    }
    if (
      consultingStartDate < getTodayDateString() &&
      consultingStartDate !== editingDoctor?.consultingStartDate
    ) {
      Alert.alert('Validation', 'Consulting start date cannot be in the past.');
      return;
    }
    if (
      selectedDays.length === 0 ||
      selectedDays.some((day) => !availableDayIndexes.includes(day))
    ) {
      Alert.alert('Validation', 'Select at least one valid consulting day for this department.');
      return;
    }
    if (selectedSlots.length === 0) {
      Alert.alert('Validation', 'Select at least one consulting time slot.');
      return;
    }
    setSaving(true);
    try {
      const doctorData = {
        name: doctorName.trim(),
        department,
        hospital: hospital.trim(),
        room: selectedRoom,
        maxTokens: parsedMaxTokens,
        consultingSlots: selectedSlots,
        consultingDays: selectedDays.map((i) => DAY_LABELS[i]),
        consultingStartDate,
        active: editingDoctor?.active ?? true,
      };
      if (editingDoctor) {
        if (!editingDoctor.id) {
          Alert.alert('Error', 'This doctor cannot be edited because its record has no ID.');
          return;
        }
        await updateDoctor(editingDoctor.id, doctorData);
      } else {
        await addDoctor(doctorData);
      }
      Alert.alert('Success', `Dr. ${doctorName} has been ${editingDoctor ? 'updated' : 'added'} successfully!`, [
        {
          text: 'OK',
          onPress: () => {
            setEditingDoctor(null);
            setDoctorName('');
            setHospital('Colombo National Hospital');
            setRoom('');
            setMaxTokens('');
            setConsultingStartDate(getTodayDateString());
            setSelectedDays([0, 1, 2, 3, 4]);
            setSelectedSlots(SLOT_PRESETS.Morning);
            setView('main');
          },
        },
      ]);
    } catch (error) {
      console.warn('Failed to save doctor changes', error);
      Alert.alert('Error', 'Failed to save doctor. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // ── Add Doctor View ──────────────────────────────────────────────────────
  if (view === 'addDoctor') {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.pageHeader}>
            <TouchableOpacity onPress={closeDoctorForm} style={styles.backBtn}>
              <Text style={styles.backText}>‹ Back</Text>
            </TouchableOpacity>
            <Text style={styles.pageTitle}>{editingDoctor ? 'Edit Doctor' : 'Add Doctor'}</Text>
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
              <Text style={styles.fieldLabel}>Hospital</Text>
              <TextInput
                style={styles.input}
                placeholder="Hospital"
                placeholderTextColor="#C4C9D4"
                value={hospital}
                onChangeText={setHospital}
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
                  {departmentOptions.map((option) => (
                    <TouchableOpacity
                      key={option}
                      style={[styles.dropdownItem, option === department && styles.dropdownItemActive]}
                      onPress={() => {
                        handleDepartmentSelect(option);
                        setShowDeptPicker(false);
                      }}
                    >
                      <Text style={[
                        styles.dropdownItemText,
                        option === department && styles.dropdownItemTextActive,
                      ]}>
                        {option}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
              {/* Room & Max Tokens */}
              <View style={styles.rowFields}>
                <View style={styles.halfField}>
                  <Text style={styles.fieldLabel}>Room Number</Text>
                  <TouchableOpacity
                    style={[styles.dropdown, roomOptions.length === 0 && styles.disabledDropdown]}
                    onPress={() => setShowRoomPicker(!showRoomPicker)}
                    disabled={roomOptions.length === 0}
                  >
                    <Text style={styles.dropdownText}>
                      {selectedRoom || (roomOptions.length ? 'Select room' : 'No rooms allocated')}
                    </Text>
                    <Text style={styles.dropdownArrow}>▾</Text>
                  </TouchableOpacity>
                  {showRoomPicker && (
                    <View style={styles.dropdownMenu}>
                      {roomOptions.map((option) => (
                        <TouchableOpacity
                          key={option}
                          style={[styles.dropdownItem, option === room && styles.dropdownItemActive]}
                          onPress={() => {
                            setRoom(option);
                            setShowRoomPicker(false);
                          }}
                        >
                          <Text style={[
                            styles.dropdownItemText,
                            option === room && styles.dropdownItemTextActive,
                          ]}>
                            {option}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
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
                  <Text style={styles.helperText}>Department limit: {maxTokenLimit || 'not set'}</Text>
                </View>
              </View>
              <Text style={styles.fieldLabel}>Consulting Start Date</Text>
              <TextInput
                style={styles.input}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#C4C9D4"
                value={consultingStartDate}
                onChangeText={setConsultingStartDate}
                autoCapitalize="none"
              />
              <Text style={styles.helperText}>Use YYYY-MM-DD. Weekly consulting days and time slots apply from this date.</Text>

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
                    style={[
                      styles.dayBtn,
                      selectedDays.includes(idx) && styles.dayBtnActive,
                      !availableDayIndexes.includes(idx) && styles.dayBtnDisabled,
                    ]}
                    onPress={() => toggleDay(idx)}
                    disabled={!availableDayIndexes.includes(idx)}
                  >
                    <Text
                      style={[
                        styles.dayBtnText,
                        selectedDays.includes(idx) && styles.dayBtnTextActive,
                        !availableDayIndexes.includes(idx) && styles.dayBtnDisabledText,
                      ]}
                    >
                      {day}
                    </Text>
                    <Text
                      style={[
                        styles.dayBtnSub,
                        selectedDays.includes(idx) && styles.dayBtnSubActive,
                        !availableDayIndexes.includes(idx) && styles.dayBtnDisabledText,
                      ]}
                    >
                      {DAY_LABELS[idx]}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={styles.helperText}>Only the selected department’s operating days can be scheduled.</Text>
            </View>

            <TouchableOpacity
              style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
              onPress={handleSaveDoctor}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.saveBtnText}>
                  ✓ {editingDoctor ? 'Save Changes' : 'Save Doctor'}
                </Text>
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
    return (
      <AddClinicWingScreen
        clinics={clinics}
        wing={editingWing}
        onBack={() => {
          setEditingWing(null);
          setView('main');
        }}
        doctors={rosterDoctors}
      />
    );
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
          <TouchableOpacity style={styles.quickCard} onPress={startAddingDoctor}>
            <Text style={styles.quickCardIcon}>👨‍⚕️</Text>
            <Text style={styles.quickCardTitle}>+ Add Doctor</Text>
            <Text style={styles.quickCardSub}>Assign to department</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickCard}
            onPress={() => {
              setEditingWing(null);
              setView('addWing');
            }}
          >
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
          {showDeptPicker && (
            <View style={styles.dropdownMenu}>
              {departmentOptions.map((option) => (
                <TouchableOpacity
                  key={option}
                  style={[styles.dropdownItem, option === department && styles.dropdownItemActive]}
                  onPress={() => {
                    handleDepartmentSelect(option);
                    setShowDeptPicker(false);
                  }}
                >
                  <Text style={[
                    styles.dropdownItemText,
                    option === department && styles.dropdownItemTextActive,
                  ]}>
                    {option}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <View style={styles.rowFields}>
            <View style={styles.halfField}>
              <Text style={styles.fieldLabel}>Room Number</Text>
              <TouchableOpacity
                style={[styles.dropdown, roomOptions.length === 0 && styles.disabledDropdown]}
                onPress={() => setShowRoomPicker(!showRoomPicker)}
                disabled={roomOptions.length === 0}
              >
                <Text style={styles.dropdownText}>
                  {selectedRoom || (roomOptions.length ? 'Select room' : 'No rooms allocated')}
                </Text>
                <Text style={styles.dropdownArrow}>▾</Text>
              </TouchableOpacity>
              {showRoomPicker && (
                <View style={styles.dropdownMenu}>
                  {roomOptions.map((option) => (
                    <TouchableOpacity
                      key={option}
                      style={[styles.dropdownItem, option === room && styles.dropdownItemActive]}
                      onPress={() => {
                        setRoom(option);
                        setShowRoomPicker(false);
                      }}
                    >
                      <Text style={[
                        styles.dropdownItemText,
                        option === room && styles.dropdownItemTextActive,
                      ]}>
                        {option}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
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
              <Text style={styles.helperText}>Department limit: {maxTokenLimit || 'not set'}</Text>
            </View>
          </View>
          <Text style={styles.fieldLabel}>Consulting Start Date</Text>
          <TextInput
            style={styles.input}
            placeholder="YYYY-MM-DD"
            placeholderTextColor="#C4C9D4"
            value={consultingStartDate}
            onChangeText={setConsultingStartDate}
            autoCapitalize="none"
          />
          <Text style={styles.helperText}>Use YYYY-MM-DD. Weekly consulting days and time slots apply from this date.</Text>

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
                style={[
                  styles.dayBtn,
                  selectedDays.includes(idx) && styles.dayBtnActive,
                  !availableDayIndexes.includes(idx) && styles.dayBtnDisabled,
                ]}
                onPress={() => toggleDay(idx)}
                disabled={!availableDayIndexes.includes(idx)}
              >
                <Text
                  style={[
                    styles.dayBtnText,
                    selectedDays.includes(idx) && styles.dayBtnTextActive,
                    !availableDayIndexes.includes(idx) && styles.dayBtnDisabledText,
                  ]}
                >
                  {day}
                </Text>
                <Text
                  style={[
                    styles.dayBtnSub,
                    selectedDays.includes(idx) && styles.dayBtnSubActive,
                    !availableDayIndexes.includes(idx) && styles.dayBtnDisabledText,
                  ]}
                >
                  {DAY_LABELS[idx]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.helperText}>Only the selected department’s operating days can be scheduled.</Text>

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

        <Text style={styles.activeClinicsTitle}>Live Departments</Text>
        {liveDepartments.length === 0 ? (
          <View style={styles.emptySection}>
            <Text style={styles.emptyText}>No active departments yet</Text>
          </View>
        ) : (
          liveDepartments.map(({ name, doctors: departmentDoctors, clinic }) => (
            <View key={name} style={styles.liveDepartmentCard}>
              <View style={styles.liveDepartmentHeader}>
                <View style={styles.clinicInfo}>
                  <Text style={styles.clinicName}>{name}</Text>
                  <Text style={styles.clinicSub}>
                    {departmentDoctors.length} active {departmentDoctors.length === 1 ? 'doctor' : 'doctors'}
                    {clinic ? ` • ${clinic.name}` : ''}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.manageBtn}
                  onPress={() => {
                    if (clinic) startEditingWing(clinic);
                    else startEditingDoctor(departmentDoctors[0]);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={`Edit ${name} department`}
                >
                  <Text style={styles.manageBtnText}>Edit Department</Text>
                </TouchableOpacity>
              </View>
              {departmentDoctors.map((doctor) => (
                <View key={doctor.id ?? doctor.name} style={styles.liveDepartmentDoctor}>
                  <Text style={styles.clinicSub}>{doctor.name} • {doctor.room}</Text>
                  <TouchableOpacity
                    style={styles.inlineEditBtn}
                    onPress={() => startEditingDoctor(doctor)}
                    accessibilityRole="button"
                    accessibilityLabel={`Edit ${doctor.name}`}
                  >
                    <Text style={styles.manageBtnText}>Edit Doctor</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          ))
        )}

        {/* Active Clinics */}
        <Text style={styles.activeClinicsTitle}>Clinic Wings</Text>
        {clinics.length === 0 ? (
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
                  {clinic.rooms || 'No rooms assigned'} •{' '}
                  {
                    (doctors.length > 0 ? doctors : INITIAL_DOCTORS).filter((doctor) =>
                      clinic.clinicHead
                        ? doctor.name === clinic.clinicHead
                        : doctor.department.toLowerCase() === clinic.name.toLowerCase()
                    ).length
                  }{' '}
                  Doctors
                </Text>
              </View>
              <TouchableOpacity
                style={styles.manageBtn}
                onPress={() => startEditingWing(clinic)}
                accessibilityRole="button"
                accessibilityLabel={`Edit ${clinic.name}`}
              >
                <Text style={styles.manageBtnText}>Edit ›</Text>
              </TouchableOpacity>
            </View>
          ))
        )}

        <Text style={styles.activeClinicsTitle}>Doctors</Text>
        {rosterDoctors.filter((doctor) => doctor.active).map((doctor) => (
          <View key={doctor.id ?? doctor.name} style={styles.doctorRosterCard}>
            <View style={styles.doctorRosterTop}>
              <Text style={styles.doctorRosterName}>{doctor.name}</Text>
              <TouchableOpacity
                style={styles.manageBtn}
                onPress={() => startEditingDoctor(doctor)}
                accessibilityRole="button"
                accessibilityLabel={`Edit ${doctor.name}`}
              >
                <Text style={styles.manageBtnText}>Edit</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.clinicSub}>
              {doctor.active ? 'Active' : 'Inactive'} • {doctor.maxTokens} tokens
            </Text>
            <Text style={styles.clinicSub}>{doctor.department} • {doctor.room}</Text>
            <Text style={styles.clinicSub}>
              {(doctor.consultingDays ?? []).join(', ')}
              {doctor.consultingSlots?.length ? ` • ${doctor.consultingSlots.join(', ')}` : ''}
            </Text>
            {doctor.consultingStartDate ? (
              <Text style={styles.clinicSub}>Schedule starts {doctor.consultingStartDate}</Text>
            ) : null}
          </View>
        ))}

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Add Clinic Wing Sub-component ─────────────────────────────────────────

function AddClinicWingScreen({
  clinics,
  wing,
  doctors,
  onBack,
}: {
  clinics: ClinicWing[];
  wing: ClinicWing | null;
  doctors: Doctor[];
  onBack: () => void;
}) {
  const [wingName, setWingName] = useState(wing?.name ?? '');
  const [building, setBuilding] = useState(wing?.building ?? '');
  const [floor, setFloor] = useState(wing?.floor ?? '');
  const [rooms, setRooms] = useState(wing?.rooms ?? '');
  const [maxTokens, setMaxTokens] = useState(String(wing?.maxDailyTokens ?? 50));
  const [clinicHead, setClinicHead] = useState(wing?.clinicHead ?? '');
  const [wingActive, setWingActive] = useState(wing?.active ?? true);
  const [selectedDays, setSelectedDays] = useState<number[]>(
    (wing?.operatingDays ?? DAY_LABELS)
      .map((day) => DAY_LABELS.indexOf(day))
      .filter((index) => index >= 0)
  );
  const [saving, setSaving] = useState(false);

  const DAYS = ['M', 'T', 'W', 'T', 'F', 'S'];
  const TOKEN_PRESETS = [30, 50, 75, 100];

  const toggleDay = (idx: number) => {
    setSelectedDays((prev) =>
      prev.includes(idx) ? prev.filter((d) => d !== idx) : [...prev, idx]
    );
  };

  const handleSave = async () => {
    const parsedMaxTokens = Number(maxTokens);
    if (!wingName.trim() || !building.trim() || !floor.trim() || !rooms.trim()) {
      Alert.alert('Validation', 'Enter the wing name, building, floor, and allocated rooms.');
      return;
    }
    if (getRoomNumbers(rooms).length === 0) {
      Alert.alert('Validation', 'Enter valid room numbers or a room range, such as Rooms 11 - 16.');
      return;
    }
    if (!Number.isInteger(parsedMaxTokens) || parsedMaxTokens < 1) {
      Alert.alert('Validation', 'Maximum daily tokens must be a positive whole number.');
      return;
    }
    if (selectedDays.length === 0) {
      Alert.alert('Validation', 'Select at least one operating day.');
      return;
    }
    if (clinics.some((clinic) =>
      clinic.id !== wing?.id &&
      clinic.name.trim().toLowerCase() === wingName.trim().toLowerCase()
    )) {
      Alert.alert('Validation', 'A clinic wing with this name already exists.');
      return;
    }
    setSaving(true);
    try {
      const wingData = {
        name: wingName.trim(),
        building: building.trim(),
        floor: floor.trim(),
        rooms: rooms.trim(),
        maxDailyTokens: parsedMaxTokens,
        clinicHead: clinicHead.trim() || undefined,
        operatingDays: selectedDays.map((i) => DAY_LABELS[i]),
        active: wingActive,
      };
      if (wing) {
        if (!wing.id) {
          Alert.alert('Error', 'This clinic wing cannot be edited because its record has no ID.');
          return;
        }
        await updateClinicWing(wing.id, wingData);
      } else {
        await addClinicWing(wingData);
      }
      Alert.alert('Success', `${wingName} has been ${wing ? 'updated' : 'added'} successfully!`, [
        { text: 'OK', onPress: onBack },
      ]);
    } catch (error) {
      console.warn('Failed to save clinic wing changes', error);
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
            <Text style={styles.wingTitle}>{wing ? 'Edit Clinic Wing' : 'Add Clinic Wing'}</Text>
            <Text style={styles.wingSubtitle}>
              {wing ? 'Update department details and room allocation' : 'Create a new outpatient clinic department and allocate rooms'}
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
            {doctors.length > 0 && (
              <Text style={styles.helperText}>
                Doctors: {doctors.map((doctor) => doctor.name).join(', ')}
              </Text>
            )}

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
            <View style={styles.statusRow}>
              <Text style={styles.fieldLabel}>Clinic wing status</Text>
              <TouchableOpacity
                style={[styles.statusToggle, wingActive ? styles.statusToggleOn : styles.statusToggleOff]}
                onPress={() => setWingActive((active) => !active)}
                accessibilityRole="switch"
                accessibilityState={{ checked: wingActive }}
              >
                <Text style={styles.statusToggleText}>{wingActive ? 'Active' : 'Inactive'}</Text>
              </TouchableOpacity>
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
              <Text style={styles.saveWingBtnText}>
                ✓ {wing ? 'Save Changes' : 'Save & Activate Wing'}
              </Text>
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
  disabledDropdown: { opacity: 0.6 },
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
  dayBtnDisabled: { backgroundColor: '#F9FAFB', borderColor: '#EEF0F4' },
  dayBtnText: { fontSize: 12, fontWeight: '700', color: '#6B7280' },
  dayBtnTextActive: { color: '#fff' },
  dayBtnSub: { fontSize: 9, color: '#9CA3AF', marginTop: 2 },
  dayBtnSubActive: { color: 'rgba(255,255,255,0.8)' },
  dayBtnDisabledText: { color: '#C7CBD3' },

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
  liveDepartmentCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E7EAF2',
  },
  liveDepartmentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 8,
  },
  liveDepartmentDoctor: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#F0F1F5',
    paddingTop: 8,
    marginTop: 6,
    gap: 8,
  },
  inlineEditBtn: {
    backgroundColor: '#F5F6FA',
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 5,
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
  doctorRosterCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E7EAF2',
  },
  doctorRosterTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  doctorRosterName: { flex: 1, fontSize: 14, color: '#1A1D2E', fontWeight: '700' },
  doctorRosterTokens: { fontSize: 12, color: '#5B6CF8', fontWeight: '700' },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  statusToggle: {
    minWidth: 78,
    alignItems: 'center',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  statusToggleOn: { backgroundColor: '#E8F7EE' },
  statusToggleOff: { backgroundColor: '#FDECEC' },
  statusToggleText: { fontSize: 12, fontWeight: '700', color: '#374151' },
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
