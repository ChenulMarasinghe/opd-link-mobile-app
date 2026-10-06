import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Doctor,
  fetchDoctors,
  fetchBookedSlots,
  createAppointment,
} from '@/services/bookingService';
import { DoctorCard } from '@/components/patient/DoctorCard';
import { TimeSlotPicker } from '@/components/patient/TimeSlotPicker';
import { BookingSummaryCard } from '@/components/patient/BookingSummaryCard';

// Fallback seed doctors for initial demonstration if Firestore is empty
const MOCK_DOCTORS: Doctor[] = [
  {
    id: 'doc_perera',
    name: 'Dr. K. L. Perera',
    specialty: 'General OPD',
    roomNumber: '04',
  },
  {
    id: 'doc_silva',
    name: 'Dr. N. S. Silva',
    specialty: 'Cardiology',
    roomNumber: '02',
  },
  {
    id: 'doc_fernando',
    name: 'Dr. M. R. Fernando',
    specialty: 'Pediatrics',
    roomNumber: '07',
  },
  {
    id: 'doc_jayasinghe',
    name: 'Dr. S. H. Jayasinghe',
    specialty: 'Dermatology',
    roomNumber: '05',
  },
];

// Helper to generate upcoming 7 dates starting from today
function getUpcomingDates(): { fullDate: string; label: string; dayName: string }[] {
  const dates = [];
  const today = new Date();

  for (let i = 0; i < 7; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);

    const fullDate = d.toISOString().split('T')[0]; // "YYYY-MM-DD"
    const dayName = i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : d.toLocaleDateString('en-US', { weekday: 'short' });
    const label = `${d.getDate()} ${d.toLocaleDateString('en-US', { month: 'short' })}`;

    dates.push({ fullDate, label, dayName });
  }

  return dates;
}

interface BookAppointmentScreenProps {
  onViewNotifications?: () => void;
}

export default function BookAppointmentScreen({
  onViewNotifications,
}: BookAppointmentScreenProps = {}) {
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);

  // Form State
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loadingDoctors, setLoadingDoctors] = useState<boolean>(true);
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);

  const availableDates = getUpcomingDates();
  const [selectedDate, setSelectedDate] = useState<string>(availableDates[0].fullDate);

  const [bookedSlots, setBookedSlots] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState<boolean>(false);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);

  const [patientName, setPatientName] = useState<string>('');
  const [patientPhone, setPatientPhone] = useState<string>('');

  const [submitting, setSubmitting] = useState<boolean>(false);
  const [createdAppointmentId, setCreatedAppointmentId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // 1. Fetch Doctors on Mount
  useEffect(() => {
    async function loadDoctors() {
      setLoadingDoctors(true);
      try {
        const fetched = await fetchDoctors();
        if (fetched && fetched.length > 0) {
          setDoctors(fetched);
        } else {
          setDoctors(MOCK_DOCTORS);
        }
      } catch (err) {
        console.log('Using fallback doctors list for testing.');
        setDoctors(MOCK_DOCTORS);
      } finally {
        setLoadingDoctors(false);
      }
    }

    loadDoctors();
  }, []);

  // 2. Fetch Booked Slots when Doctor or Date changes
  useEffect(() => {
    if (!selectedDoctor || !selectedDate) return;

    async function loadSlots() {
      setLoadingSlots(true);
      try {
        const slots = await fetchBookedSlots(selectedDoctor!.id, selectedDate);
        setBookedSlots(slots);
      } catch (err) {
        console.error('Failed to load slots:', err);
        setBookedSlots([]);
      } finally {
        setLoadingSlots(false);
      }
    }

    loadSlots();
  }, [selectedDoctor, selectedDate]);

  // Handle Submit Booking
  const handleConfirmBooking = async () => {
    if (!selectedDoctor || !selectedDate || !selectedSlot) return;

    if (!patientName.trim()) {
      Alert.alert('Validation Error', 'Please enter your patient name.');
      return;
    }

    if (!patientPhone.trim()) {
      Alert.alert('Validation Error', 'Please enter your phone number.');
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);

    try {
      const appointmentId = await createAppointment({
        doctorId: selectedDoctor.id,
        doctorName: selectedDoctor.name,
        specialty: selectedDoctor.specialty,
        roomNumber: selectedDoctor.roomNumber,
        date: selectedDate,
        timeSlot: selectedSlot,
        patientName: patientName.trim(),
        patientPhone: patientPhone.trim(),
      });

      setCreatedAppointmentId(appointmentId);
      setCurrentStep(4); // Move to Success Screen
    } catch (err: any) {
      const msg = err?.message || 'Failed to create appointment. Please try again.';
      setErrorMessage(msg);
      Alert.alert('Booking Error', msg);
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setCurrentStep(1);
    setSelectedDoctor(null);
    setSelectedSlot(null);
    setPatientName('');
    setPatientPhone('');
    setCreatedAppointmentId(null);
    setErrorMessage(null);
  };

  // Render Confirmation Ticket (Step 4)
  if (currentStep === 4) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.successContainer}>
          <View style={styles.successBadge}>
            <Text style={styles.successCheck}>✓</Text>
          </View>
          <Text style={styles.successTitle}>Booking Confirmed!</Text>
          <Text style={styles.successSubtitle}>
            Your OPD appointment has been successfully scheduled.
          </Text>

          {createdAppointmentId && (
            <View style={styles.refContainer}>
              <Text style={styles.refLabel}>Booking Reference ID</Text>
              <Text style={styles.refValue}>{createdAppointmentId}</Text>
            </View>
          )}

          {selectedDoctor && selectedSlot && (
            <View style={styles.simpleDetailsCard}>
              <View style={styles.simpleDetailRow}>
                <Text style={styles.simpleDetailLabel}>Doctor:</Text>
                <Text style={styles.simpleDetailValue}>{selectedDoctor.name}</Text>
              </View>
              <View style={styles.simpleDetailRow}>
                <Text style={styles.simpleDetailLabel}>Date & Time:</Text>
                <Text style={styles.simpleDetailValue}>
                  {selectedDate} • {selectedSlot}
                </Text>
              </View>
              <View style={styles.simpleDetailRow}>
                <Text style={styles.simpleDetailLabel}>Location:</Text>
                <Text style={styles.simpleDetailValue}>OPD Room {selectedDoctor.roomNumber}</Text>
              </View>
            </View>
          )}

          <Pressable style={styles.confirmActionButton} onPress={resetForm}>
            <Text style={styles.confirmActionButtonText}>Book Another Appointment</Text>
          </Pressable>

          {onViewNotifications && (
            <Pressable
              style={[styles.confirmActionButton, { backgroundColor: '#6366F1', marginTop: 10 }]}
              onPress={onViewNotifications}
            >
              <Text style={styles.confirmActionButtonText}>View Notifications 🔔</Text>
            </Pressable>
          )}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Book Appointment</Text>
        <Text style={styles.headerSubtitle}>OPD Online Registration</Text>
      </View>

      {/* Step Indicator */}
      <View style={styles.stepIndicatorContainer}>
        <View style={[styles.stepItem, currentStep >= 1 && styles.stepItemActive]}>
          <Text style={[styles.stepNumber, currentStep >= 1 && styles.stepNumberActive]}>1</Text>
          <Text style={[styles.stepLabel, currentStep >= 1 && styles.stepLabelActive]}>Doctor</Text>
        </View>

        <View style={styles.stepConnector} />

        <View style={[styles.stepItem, currentStep >= 2 && styles.stepItemActive]}>
          <Text style={[styles.stepNumber, currentStep >= 2 && styles.stepNumberActive]}>2</Text>
          <Text style={[styles.stepLabel, currentStep >= 2 && styles.stepLabelActive]}>Date & Slot</Text>
        </View>

        <View style={styles.stepConnector} />

        <View style={[styles.stepItem, currentStep >= 3 && styles.stepItemActive]}>
          <Text style={[styles.stepNumber, currentStep >= 3 && styles.stepNumberActive]}>3</Text>
          <Text style={[styles.stepLabel, currentStep >= 3 && styles.stepLabelActive]}>Confirm</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* STEP 1: SELECT DOCTOR */}
        {currentStep === 1 && (
          <View>
            <Text style={styles.stepHeader}>Select a Doctor</Text>
            <Text style={styles.stepSubheader}>Choose an OPD specialist for your visit</Text>

            {loadingDoctors ? (
              <ActivityIndicator size="large" color="#208AEF" style={{ marginVertical: 30 }} />
            ) : (
              doctors.map((doctor) => (
                <DoctorCard
                  key={doctor.id}
                  doctor={doctor}
                  isSelected={selectedDoctor?.id === doctor.id}
                  onSelect={(doc) => setSelectedDoctor(doc)}
                />
              ))
            )}
          </View>
        )}

        {/* STEP 2: SELECT DATE & TIME SLOT */}
        {currentStep === 2 && selectedDoctor && (
          <View>
            <Text style={styles.stepHeader}>Select Date & Time</Text>
            <Text style={styles.stepSubheader}>
              Appointment with {selectedDoctor.name} ({selectedDoctor.specialty})
            </Text>

            {/* Date Selection Strip */}
            <Text style={styles.fieldLabel}>Select Date</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dateStrip}>
              {availableDates.map((item) => {
                const isSelected = selectedDate === item.fullDate;
                return (
                  <Pressable
                    key={item.fullDate}
                    style={[styles.dateChip, isSelected && styles.dateChipSelected]}
                    onPress={() => {
                      setSelectedDate(item.fullDate);
                      setSelectedSlot(null);
                    }}
                  >
                    <Text style={[styles.dayText, isSelected && styles.dateTextSelected]}>
                      {item.dayName}
                    </Text>
                    <Text style={[styles.dateLabel, isSelected && styles.dateTextSelected]}>
                      {item.label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            {/* Time Slot Picker */}
            {loadingSlots ? (
              <ActivityIndicator size="small" color="#208AEF" style={{ marginVertical: 20 }} />
            ) : (
              <TimeSlotPicker
                bookedSlots={bookedSlots}
                selectedSlot={selectedSlot}
                onSelectSlot={(slot) => setSelectedSlot(slot)}
              />
            )}
          </View>
        )}

        {/* STEP 3: REVIEW & CONFIRM */}
        {currentStep === 3 && selectedDoctor && selectedSlot && (
          <View>
            <Text style={styles.stepHeader}>Review & Confirm</Text>
            <Text style={styles.stepSubheader}>Please verify your details before booking</Text>

            <BookingSummaryCard
              doctor={selectedDoctor}
              date={selectedDate}
              timeSlot={selectedSlot}
            />

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Patient Full Name *</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Enter patient name"
                placeholderTextColor="#94A3B8"
                value={patientName}
                onChangeText={setPatientName}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Contact Phone Number *</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Enter 10-digit phone number"
                placeholderTextColor="#94A3B8"
                keyboardType="phone-pad"
                value={patientPhone}
                onChangeText={setPatientPhone}
              />
            </View>

            {errorMessage && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Footer Controls */}
      <View style={styles.footer}>
        {currentStep > 1 && (
          <Pressable
            style={styles.secondaryButton}
            onPress={() => setCurrentStep((prev) => (prev - 1) as any)}
            disabled={submitting}
          >
            <Text style={styles.secondaryButtonText}>Back</Text>
          </Pressable>
        )}

        {currentStep === 1 && (
          <Pressable
            style={[styles.primaryButton, !selectedDoctor && styles.buttonDisabled]}
            disabled={!selectedDoctor}
            onPress={() => setCurrentStep(2)}
          >
            <Text style={styles.primaryButtonText}>Next: Select Date & Time</Text>
          </Pressable>
        )}

        {currentStep === 2 && (
          <Pressable
            style={[styles.primaryButton, !selectedSlot && styles.buttonDisabled]}
            disabled={!selectedSlot}
            onPress={() => setCurrentStep(3)}
          >
            <Text style={styles.primaryButtonText}>Next: Review Details</Text>
          </Pressable>
        )}

        {currentStep === 3 && (
          <Pressable
            style={[styles.primaryButton, submitting && styles.buttonDisabled]}
            disabled={submitting}
            onPress={handleConfirmBooking}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.primaryButtonText}>Confirm Appointment</Text>
            )}
          </Pressable>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  stepIndicatorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepItemActive: {},
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#E2E8F0',
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 24,
    fontSize: 12,
    fontWeight: '700',
    marginRight: 6,
  },
  stepNumberActive: {
    backgroundColor: '#208AEF',
    color: '#FFFFFF',
  },
  stepLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
  },
  stepLabelActive: {
    color: '#0F172A',
  },
  stepConnector: {
    width: 24,
    height: 2,
    backgroundColor: '#E2E8F0',
    marginHorizontal: 8,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 30,
  },
  stepHeader: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  stepSubheader: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 8,
  },
  dateStrip: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  dateChip: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    marginRight: 8,
    alignItems: 'center',
    minWidth: 72,
  },
  dateChipSelected: {
    backgroundColor: '#208AEF',
    borderColor: '#208AEF',
  },
  dayText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  dateLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
    marginTop: 2,
  },
  dateTextSelected: {
    color: '#FFFFFF',
  },
  inputGroup: {
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 6,
  },
  textInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0F172A',
  },
  errorBox: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  errorText: {
    color: '#DC2626',
    fontSize: 13,
  },
  footer: {
    flexDirection: 'row',
    gap: 10,
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  primaryButton: {
    flex: 1,
    backgroundColor: '#208AEF',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  secondaryButton: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    color: '#475569',
    fontSize: 14,
    fontWeight: '600',
  },
  buttonDisabled: {
    backgroundColor: '#94A3B8',
    opacity: 0.6,
  },
  successContainer: {
    flex: 1,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#22C55E',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  successCheck: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '700',
  },
  successTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 6,
  },
  successSubtitle: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 20,
  },
  refContainer: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 16,
    width: '100%',
  },
  refLabel: {
    fontSize: 11,
    color: '#64748B',
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  refValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#208AEF',
    marginTop: 2,
  },
  simpleDetailsCard: {
    backgroundColor: '#F0F7FF',
    borderColor: '#BAE6FD',
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    width: '100%',
    gap: 8,
  },
  simpleDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  simpleDetailLabel: {
    fontSize: 13,
    color: '#475569',
    fontWeight: '500',
  },
  simpleDetailValue: {
    fontSize: 13,
    color: '#0F172A',
    fontWeight: '600',
  },
  confirmActionButton: {
    backgroundColor: '#208AEF',
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmActionButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});
