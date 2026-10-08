import { BookingSummaryCard } from '@/components/patient/BookingSummaryCard';
import { DoctorCard } from '@/components/patient/DoctorCard';
import {
    BookedAppointmentTime,
    CreatedAppointment,
    createAppointment,
    Doctor,
    fetchBookedSlots,
    fetchDoctors,
} from '@/services/bookingService';
import { auth } from '@/services/firebase';
import { fetchOpdDepartments, OpdDepartment } from '@/services/opdService';
import {
    formatAppointmentDate,
    generateAppointmentSlots,
    formatTimeSlot,
    getAppointmentDates,
    getDoctorScheduleError,
    getNextAvailableAppointmentTime,
    getSessionOverlap,
    getSriLankaDateTime,
    parseTimeSlot,
} from '@/services/appointmentSchedule';
import { resolvePatientIdentity } from '@/services/patientIdentityService';
import type { PatientIdentity } from '@/services/patientIdentityService';
import { onAuthStateChanged } from 'firebase/auth';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

function getPatientNameError(name: string): string | null {
  const trimmedName = name.trim();
  if (!trimmedName) return 'Enter your full name.';
  if (!/^[A-Za-z]+(?:\s+[A-Za-z]+)*$/.test(trimmedName)) {
    return 'Use letters and spaces only.';
  }
  return null;
}

function getPatientPhoneError(phone: string): string | null {
  if (!phone) return 'Enter your contact number.';
  if (!/^07\d{8}$/.test(phone)) {
    return 'Enter a 10-digit mobile number starting with 07.';
  }
  return null;
}

function getFriendlyBookingError(error: unknown): string {
  const code = typeof error === 'object' && error !== null && 'code' in error
    ? String(error.code)
    : '';
  const message = error instanceof Error ? error.message : '';

  if (code.includes('permission-denied')) {
    return __DEV__
      ? 'This development test profile cannot save bookings in this project. Please ask the project administrator to check access.'
      : 'We could not save this booking with the current account. Please contact the clinic.';
  }
  if (code.includes('unavailable') || /network|offline|connection/i.test(message)) {
    return 'A connection problem prevented the booking. Check your internet connection and try again.';
  }
  if (
    message === 'No appointments available for this session.'
    || message === 'This OPD is closed or its status is unavailable today.'
    || message === 'This doctor is no longer accepting appointments.'
    || message === 'The selected doctor or OPD is no longer available.'
    || message === 'The selected OPD session is no longer available.'
    || message === 'The selected date is no longer within the doctor schedule.'
  ) {
    return message;
  }
  return 'We could not complete this booking. Please try again or choose another session.';
}

function getFriendlyAvailabilityError(error: unknown): string {
  const code = typeof error === 'object' && error !== null && 'code' in error
    ? String(error.code)
    : '';
  if (code.includes('permission-denied')) {
    return 'We could not check appointment availability. Please try again later or contact the clinic.';
  }
  if (code.includes('unavailable')) {
    return 'A connection problem prevented us from checking availability. Please try again.';
  }
  return 'We could not load appointment availability. Please try again.';
}

interface BookAppointmentScreenProps {
  onViewNotifications?: () => void;
}

export default function BookAppointmentScreen({
  onViewNotifications,
}: BookAppointmentScreenProps = {}) {
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4 | 5>(1);

  // Form State
  const [opdDepartments, setOpdDepartments] = useState<OpdDepartment[]>([]);
  const [loadingDepartments, setLoadingDepartments] = useState<boolean>(true);
  const [departmentLoadError, setDepartmentLoadError] = useState<string | null>(null);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loadingDoctors, setLoadingDoctors] = useState<boolean>(true);
  const [doctorLoadError, setDoctorLoadError] = useState<string | null>(null);
  const [selectedDepartment, setSelectedDepartment] = useState<OpdDepartment | null>(null);
  const [departmentExpanded, setDepartmentExpanded] = useState<boolean>(false);
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const filteredDoctors = selectedDepartment
    ? doctors.filter((doctor) => doctor.department === selectedDepartment.name)
    : [];

  const availableDates = getAppointmentDates(selectedDoctor);
  const [selectedDate, setSelectedDate] = useState<string>(getSriLankaDateTime().date);

  const [bookedSlots, setBookedSlots] = useState<BookedAppointmentTime[]>([]);
  const [loadingSlots, setLoadingSlots] = useState<boolean>(false);
  const [slotLoadError, setSlotLoadError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const [patientIdentity, setPatientIdentity] = useState<PatientIdentity | null>(null);
  const [identityError, setIdentityError] = useState<string | null>(null);

  const [patientName, setPatientName] = useState<string>('');
  const [patientPhone, setPatientPhone] = useState<string>('');
  const [patientNameError, setPatientNameError] = useState<string | null>(null);
  const [patientPhoneError, setPatientPhoneError] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState<boolean>(false);
  const [createdAppointment, setCreatedAppointment] = useState<CreatedAppointment | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const doctorScheduleError = getDoctorScheduleError(selectedDoctor);
  const selectedDateOption = availableDates.find((date) => date.fullDate === selectedDate);
  const selectedDateAllowed = selectedDateOption?.available === true;
  const isTodayClosed = selectedDate === getSriLankaDateTime().date
    && selectedDepartment?.closedToday !== false;
  const sessionOptions = (selectedDepartment?.sessions || []).map((session) => {
    const overlaps = getSessionOverlap(session, selectedDoctor);
    const sessionSlots = selectedDateAllowed && !isTodayClosed
      ? generateAppointmentSlots(overlaps, selectedDate)
      : [];
    const nextSlot = !loadingSlots && !slotLoadError
      ? getNextAvailableAppointmentTime(sessionSlots, bookedSlots)
      : null;
    const disabledReason = isTodayClosed
      ? 'Closed today'
      : !selectedDateAllowed
        ? 'Doctor unavailable on this date'
        : overlaps.length === 0
          ? 'Doctor not available in this session'
          : loadingSlots
            ? 'Checking availability…'
            : slotLoadError
              ? 'Availability could not be checked'
              : !nextSlot
                ? selectedDate === getSriLankaDateTime().date
                  ? 'No appointments remaining today'
                  : 'Fully booked'
                : null;
    return { value: session, overlaps, nextSlot, disabledReason };
  });
  const selectedSessionOverlap = sessionOptions.find(
    (session) => session.value === selectedSession
  )?.overlaps || [];
  const availableSlots = selectedDateAllowed && !isTodayClosed
    ? generateAppointmentSlots(selectedSessionOverlap, selectedDate)
    : [];
  const provisionalTimeSlot = selectedSession && !loadingSlots && !slotLoadError
    ? getNextAvailableAppointmentTime(availableSlots, bookedSlots)
    : null;
  const provisionalEndTime = provisionalTimeSlot
    ? formatTimeSlot((parseTimeSlot(provisionalTimeSlot) ?? 0) + 15)
    : null;

  // 1. Fetch OPDs and doctors from Firestore on mount.
  useEffect(() => {
    let isMounted = true;

    async function loadDepartments() {
      try {
        const fetched = await fetchOpdDepartments();
        if (isMounted) setOpdDepartments(fetched);
      } catch (error) {
        if (isMounted) {
          setDepartmentLoadError(
            error instanceof Error ? error.message : 'Failed to load OPD departments.'
          );
        }
      } finally {
        if (isMounted) setLoadingDepartments(false);
      }
    }

    async function loadDoctors() {
      try {
        const fetched = await fetchDoctors();
        if (isMounted) setDoctors(fetched);
      } catch (error) {
        if (isMounted) {
          setDoctorLoadError(
            error instanceof Error ? error.message : 'Failed to load doctors.'
          );
        }
      } finally {
        if (isMounted) setLoadingDoctors(false);
      }
    }

    loadDepartments();
    loadDoctors();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;
    let identityRequest = 0;
    const unsubscribe = onAuthStateChanged(
      auth,
      (user) => {
        const request = ++identityRequest;
        setAuthLoading(true);
        setIdentityError(null);
        void resolvePatientIdentity(user)
          .then((identity) => {
            if (isMounted && request === identityRequest) setPatientIdentity(identity);
          })
          .catch((error: unknown) => {
            console.error('Failed to resolve patient identity:', error);
            if (isMounted && request === identityRequest) {
              setPatientIdentity(null);
              setIdentityError(
                __DEV__
                  ? 'Could not prepare a local test identity. Please restart the app and try again.'
                  : 'Please sign in before booking an appointment.'
              );
            }
          })
          .finally(() => {
            if (isMounted && request === identityRequest) setAuthLoading(false);
          });
      },
      (error) => {
        console.error('Failed to resolve Firebase Authentication state:', error);
        if (isMounted) {
          identityRequest += 1;
          setPatientIdentity(null);
          setIdentityError('We could not verify your sign-in. Please try again.');
          setAuthLoading(false);
        }
      }
    );

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  // 2. Fetch confirmed appointment ranges when Doctor or Date changes.
  useEffect(() => {
    if (!selectedDoctor || !selectedDate) return;

    let isMounted = true;
    async function loadSlots() {
      setLoadingSlots(true);
      setSlotLoadError(null);
      setBookedSlots([]);
      try {
        const slots = await fetchBookedSlots(selectedDoctor!.id, selectedDate);
        if (isMounted) setBookedSlots(slots);
      } catch (err) {
        console.error('Failed to load slots:', err);
        if (isMounted) {
          setSlotLoadError(getFriendlyAvailabilityError(err));
        }
      } finally {
        if (isMounted) setLoadingSlots(false);
      }
    }

    loadSlots();
    return () => {
      isMounted = false;
    };
  }, [selectedDoctor, selectedDate]);

  // Handle Submit Booking
  const handleConfirmBooking = async () => {
    if (
      !selectedDoctor
      || !selectedDepartment
      || !selectedSession
      || !selectedDate
      || !provisionalTimeSlot
    ) return;
    if (authLoading || !patientIdentity) {
      setErrorMessage('Please wait while your booking identity is prepared.');
      return;
    }

    const trimmedName = patientName.trim();
    const nameError = getPatientNameError(patientName);
    const phoneError = getPatientPhoneError(patientPhone);
    setPatientNameError(nameError);
    setPatientPhoneError(phoneError);

    if (nameError || phoneError) {
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);

    try {
      const appointment = await createAppointment({
        patientId: patientIdentity.patientId,
        patientIdentityType: patientIdentity.patientIdentityType,
        doctorId: selectedDoctor.id,
        doctorName: selectedDoctor.name,
        specialty: selectedDoctor.specialty,
        roomNumber: selectedDoctor.roomNumber,
        date: selectedDate,
        patientName: trimmedName,
        patientPhone,
        opdId: selectedDepartment.id,
        session: selectedSession,
      });

      setCreatedAppointment(appointment);
      setCurrentStep(5); // Move to Success Screen
    } catch (err) {
      console.error('Failed to confirm appointment:', err);
      const msg = getFriendlyBookingError(err);
      setErrorMessage(msg);
      Alert.alert('Booking Error', msg);
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setCurrentStep(1);
    setSelectedDepartment(null);
    setDepartmentExpanded(false);
    setSelectedDoctor(null);
    setSelectedDate(getSriLankaDateTime().date);
    setSelectedSession(null);
    setBookedSlots([]);
    setPatientName('');
    setPatientPhone('');
    setPatientNameError(null);
    setPatientPhoneError(null);
    setCreatedAppointment(null);
    setErrorMessage(null);
  };

  // Render the completed booking confirmation.
  if (currentStep === 5) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.successContainer}>
          <View style={styles.successBadge}>
            <Text style={styles.successCheck}>✓</Text>
          </View>
          <Text style={styles.successTitle}>Appointment Confirmed</Text>
          <Text style={styles.successSubtitle}>
            Your OPD appointment has been successfully scheduled.
          </Text>

          {createdAppointment && (
            <View style={styles.refContainer}>
              <Text style={styles.refLabel}>Booking Reference ID</Text>
              <Text style={styles.refValue}>{createdAppointment.id}</Text>
            </View>
          )}

          {createdAppointment && (
            <View style={styles.simpleDetailsCard}>
              <View style={styles.tokenCard}>
                <Text style={styles.tokenLabel}>TOKEN NUMBER</Text>
                <Text style={styles.tokenValue}>{createdAppointment.tokenNumber}</Text>
              </View>
              <View style={styles.simpleDetailRow}>
                <Text style={styles.simpleDetailLabel}>Department:</Text>
                <Text style={styles.simpleDetailValue}>{createdAppointment.opdName}</Text>
              </View>
              <View style={styles.simpleDetailRow}>
                <Text style={styles.simpleDetailLabel}>Doctor:</Text>
                <Text style={styles.simpleDetailValue}>{createdAppointment.doctorName}</Text>
              </View>
              <View style={styles.simpleDetailRow}>
                <Text style={styles.simpleDetailLabel}>Date:</Text>
                <Text style={styles.simpleDetailValue}>
                  {formatAppointmentDate(createdAppointment.date)}
                </Text>
              </View>
              <View style={styles.simpleDetailRow}>
                <Text style={styles.simpleDetailLabel}>OPD Session:</Text>
                <Text style={styles.simpleDetailValue}>{createdAppointment.session}</Text>
              </View>
              <View style={styles.simpleDetailRow}>
                <Text style={styles.simpleDetailLabel}>Appointment:</Text>
                <Text style={styles.simpleDetailValue}>
                  {createdAppointment.timeSlot} – {createdAppointment.endTime}
                </Text>
              </View>
              <View style={styles.simpleDetailRow}>
                <Text style={styles.simpleDetailLabel}>Room:</Text>
                <Text style={styles.simpleDetailValue}>OPD Room {createdAppointment.roomNumber}</Text>
              </View>
              <View style={styles.simpleDetailRow}>
                <Text style={styles.simpleDetailLabel}>Patient:</Text>
                <Text style={styles.simpleDetailValue}>{createdAppointment.patientName}</Text>
              </View>
              <View style={styles.simpleDetailRow}>
                <Text style={styles.simpleDetailLabel}>Contact:</Text>
                <Text style={styles.simpleDetailValue}>{createdAppointment.patientPhone}</Text>
              </View>
            </View>
          )}

          <Pressable style={styles.confirmActionButton} onPress={resetForm}>
            <Text style={styles.confirmActionButtonText}>Book Another Appointment</Text>
          </Pressable>

          {onViewNotifications && (
            <Pressable
              style={[styles.confirmActionButton, { marginTop: 10 }]}
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
        {['Department', 'Doctor', 'Date & Session', 'Confirm'].map((label, index) => (
          <React.Fragment key={label}>
            <View style={styles.stepItem}>
              <Text style={[styles.stepNumber, currentStep >= index + 1 && styles.stepNumberActive]}>
                {index + 1}
              </Text>
              <Text style={[styles.stepLabel, currentStep >= index + 1 && styles.stepLabelActive]}>
                {label}
              </Text>
            </View>
            {index < 3 && (
              <View
                style={[
                  styles.stepConnector,
                  currentStep > index + 1 && styles.stepConnectorActive,
                ]}
              />
            )}
          </React.Fragment>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* STEP 1: SELECT DEPARTMENT */}
        {currentStep === 1 && (
          <View>
            <Text style={styles.stepHeader}>Select Department</Text>
            <Text style={styles.stepSubheader}>Choose a department to see its doctors</Text>

            {loadingDepartments && (
              <ActivityIndicator size="large" color="#208AEF" style={{ marginVertical: 30 }} />
            )}
            {!loadingDepartments && departmentLoadError && (
              <View style={styles.departmentEmptyCard}>
                <Text style={styles.departmentEmptyText}>{departmentLoadError}</Text>
              </View>
            )}
            {!loadingDepartments && !departmentLoadError && opdDepartments.length === 0 && (
              <View style={styles.departmentEmptyCard}>
                <Text style={styles.departmentEmptyText}>No OPD departments are available right now.</Text>
              </View>
            )}
            {!loadingDepartments && !departmentLoadError && opdDepartments.length > 0 && (
              <View style={styles.departmentCard}>
                <Pressable
                  style={[
                    styles.departmentDropdown,
                    selectedDepartment && styles.departmentDropdownSelected,
                    departmentExpanded && styles.departmentDropdownOpen,
                  ]}
                  onPress={() => setDepartmentExpanded((expanded) => !expanded)}
                  accessibilityRole="button"
                  accessibilityLabel="Choose a department"
                  accessibilityState={{ expanded: departmentExpanded }}
                >
                  <View style={styles.departmentDropdownText}>
                    <Text style={styles.departmentLabel}>DEPARTMENT</Text>
                    <Text style={selectedDepartment ? styles.departmentValue : styles.departmentPlaceholder}>
                      {selectedDepartment?.name || 'Choose a department'}
                    </Text>
                  </View>
                  <Text style={styles.departmentChevron}>{departmentExpanded ? '⌃' : '⌄'}</Text>
                </Pressable>

                {departmentExpanded && (
                  <View style={styles.departmentOptions}>
                    {opdDepartments.map((department) => (
                      <Pressable
                        key={department.id}
                        style={[
                          styles.departmentOption,
                          selectedDepartment?.id === department.id && styles.departmentOptionSelected,
                        ]}
                        onPress={() => {
                          setSelectedDepartment(department);
                          setDepartmentExpanded(false);
                          setSelectedDoctor(null);
                          setSelectedDate(getSriLankaDateTime().date);
                          setSelectedSession(null);
                          setBookedSlots([]);
                        }}
                      >
                        <Text
                          style={[
                            styles.departmentOptionText,
                            selectedDepartment?.id === department.id && styles.departmentOptionTextSelected,
                          ]}
                        >
                          {department.name}
                        </Text>
                        <Text style={styles.departmentDoctorCount}>
                          {department.closedToday === true
                            ? 'Closed today'
                            : department.closedToday === false
                              ? 'Open today'
                              : "Today's status unavailable"}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                )}

                {selectedDepartment && (
                  <Text style={styles.departmentHint}>
                    {selectedDepartment.closedToday === true
                      ? 'This OPD is closed today. Its future-day availability is not determined by this flag.'
                      : selectedDepartment.closedToday === false
                        ? 'This OPD is open today.'
                        : "Today's OPD status is unavailable."}
                  </Text>
                )}

              </View>
            )}
          </View>
        )}

        {/* STEP 2: SELECT DOCTOR */}
        {currentStep === 2 && selectedDepartment && (
          <View>
            <Text style={styles.stepHeader}>Select a Doctor</Text>
            <Text style={styles.stepSubheader}>Choose a doctor for {selectedDepartment.name}</Text>

            {loadingDoctors ? (
              <ActivityIndicator size="large" color="#208AEF" style={{ marginVertical: 30 }} />
            ) : doctorLoadError ? (
              <View style={styles.departmentEmptyCard}>
                <Text style={styles.departmentEmptyText}>{doctorLoadError}</Text>
              </View>
            ) : filteredDoctors.length === 0 ? (
              <View style={styles.departmentEmptyCard}>
                <Text style={styles.departmentEmptyText}>No doctors available for this OPD.</Text>
              </View>
            ) : (
              filteredDoctors.map((doctor) => (
                <DoctorCard
                  key={doctor.id}
                  doctor={doctor}
                  isSelected={selectedDoctor?.id === doctor.id}
                  onSelect={(selectedDoctor) => {
                    setSelectedDoctor(selectedDoctor);
                    const firstAvailableDate = getAppointmentDates(selectedDoctor)
                      .find((date) => date.available);
                    setSelectedDate(firstAvailableDate?.fullDate || getSriLankaDateTime().date);
                    setSelectedSession(null);
                    setBookedSlots([]);
                  }}
                />
              ))
            )}
          </View>
        )}

        {/* STEP 3: SELECT DATE & OPD SESSION */}
        {currentStep === 3 && selectedDoctor && (
          <View>
            <Text style={styles.stepHeader}>Select Date & Session</Text>
            <Text style={styles.stepSubheader}>
              Appointment with {selectedDoctor.name} ({selectedDoctor.specialty})
            </Text>

            <Text style={styles.fieldLabel}>Select Appointment Date</Text>
            {doctorScheduleError ? (
              <Text style={styles.scheduleMessage}>{doctorScheduleError}</Text>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dateStrip}>
                {availableDates.map((item) => {
                  const isSelected = selectedDate === item.fullDate;
                  const closedToday = item.fullDate === getSriLankaDateTime().date
                    && selectedDepartment?.closedToday !== false;
                  const isAvailable = item.available && !closedToday;
                  return (
                    <Pressable
                      key={item.fullDate}
                      disabled={!isAvailable}
                      style={[
                        styles.dateChip,
                        isSelected && styles.dateChipSelected,
                        !isAvailable && styles.dateChipUnavailable,
                      ]}
                      onPress={() => {
                        setSelectedDate(item.fullDate);
                        setSelectedSession(null);
                      }}
                    >
                      <Text style={[
                        styles.dayText,
                        isSelected && isAvailable && styles.dateTextSelected,
                        !isAvailable && styles.dateTextUnavailable,
                      ]}>
                        {item.dayName}
                      </Text>
                      <Text style={[
                        styles.dateLabel,
                        isSelected && isAvailable && styles.dateTextSelected,
                        !isAvailable && styles.dateTextUnavailable,
                      ]}>
                        {item.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            )}
            {isTodayClosed && (
              <Text style={styles.scheduleMessage}>
                This OPD is closed or its current-day status is unavailable. Choose a future date.
              </Text>
            )}
            {!doctorScheduleError && !selectedDateAllowed && !isTodayClosed && (
              <Text style={styles.scheduleMessage}>
                The doctor is not available on the selected date or has not started consulting yet.
              </Text>
            )}

            <Text style={styles.fieldLabel}>Choose OPD Session</Text>
            {sessionOptions.length === 0 ? (
              <Text style={styles.scheduleMessage}>No OPD sessions are configured.</Text>
            ) : (
              <View style={styles.sessionList}>
                {sessionOptions.map(({ value, disabledReason, nextSlot }) => {
                  const sessionUnavailable = disabledReason !== null;
                  const isSelected = selectedSession === value;
                  return (
                    <Pressable
                      key={value}
                      disabled={sessionUnavailable}
                      onPress={() => {
                        setSelectedSession(value);
                      }}
                      style={[
                        styles.sessionOption,
                        isSelected && styles.sessionOptionSelected,
                        sessionUnavailable && styles.sessionOptionUnavailable,
                      ]}
                    >
                      <Text style={[
                        styles.sessionOptionText,
                        isSelected && styles.sessionOptionTextSelected,
                        sessionUnavailable && styles.sessionOptionTextUnavailable,
                      ]}>
                        {value}
                      </Text>
                      <Text style={[
                        styles.sessionHint,
                        sessionUnavailable && styles.sessionHintUnavailable,
                      ]}>
                        {disabledReason || `Next available: ${nextSlot}`}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            )}

            <Text style={styles.fieldLabel}>Your Suggested Appointment Time</Text>
            {slotLoadError ? (
              <Text style={styles.scheduleMessage}>{slotLoadError}</Text>
            ) : loadingSlots ? (
              <ActivityIndicator size="small" color="#208AEF" style={{ marginVertical: 20 }} />
            ) : selectedSession && provisionalTimeSlot ? (
              <View style={styles.selectionDetails}>
                <Text style={styles.selectionDetailsText}>
                  Next available: {provisionalTimeSlot}
                </Text>
                <Text style={styles.scheduleMessage}>
                  This time is provisional and will be checked again when you confirm.
                </Text>
              </View>
            ) : selectedSession ? (
              <Text style={styles.scheduleMessage}>
                No appointments available for this session.
              </Text>
            ) : (
              <Text style={styles.scheduleMessage}>
                Select a date and an available session to see the next appointment time.
              </Text>
            )}
          </View>
        )}

        {/* STEP 4: REVIEW & CONFIRM */}
        {currentStep === 4 && selectedDoctor && (
          <View>
            <Text style={styles.stepHeader}>Review & Confirm</Text>
            <Text style={styles.stepSubheader}>Please verify your details before booking</Text>

            {provisionalTimeSlot ? (
              <>
                <Text style={styles.provisionalNotice}>
                  Your suggested time is provisional. We will assign the final time and token when you confirm.
                </Text>
                <BookingSummaryCard
                  doctor={selectedDoctor}
                  date={selectedDate}
                  timeSlot={provisionalTimeSlot}
                  endTime={provisionalEndTime || undefined}
                  departmentName={selectedDepartment?.name}
                  session={selectedSession || undefined}
                  patientName={patientName.trim()}
                  patientPhone={patientPhone}
                />
              </>
            ) : (
              <Text style={styles.scheduleMessage}>
                No appointments available for this session. Choose another date or session.
              </Text>
            )}
            {authLoading ? (
              <ActivityIndicator size="small" color="#208AEF" style={{ marginVertical: 12 }} />
            ) : !patientIdentity ? (
              <Text style={styles.scheduleMessage}>
                {identityError || 'Please sign in before booking an appointment.'}
              </Text>
            ) : patientIdentity.patientIdentityType === 'dev_guest' ? (
              <Text style={styles.scheduleMessage}>
                You are using a local development guest profile for testing.
              </Text>
            ) : null}

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Patient Full Name *</Text>
              <TextInput
                style={[styles.textInput, patientNameError && styles.textInputInvalid]}
                placeholder="Enter patient name"
                placeholderTextColor="#94A3B8"
                value={patientName}
                onChangeText={(value) => {
                  setPatientName(value);
                  if (patientNameError) {
                    setPatientNameError(getPatientNameError(value));
                  }
                }}
                autoCapitalize="words"
                autoCorrect={false}
              />
              {patientNameError && <Text style={styles.fieldErrorText}>{patientNameError}</Text>}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Contact Phone Number *</Text>
              <TextInput
                style={[styles.textInput, patientPhoneError && styles.textInputInvalid]}
                placeholder="Enter 10-digit phone number"
                placeholderTextColor="#94A3B8"
                keyboardType="phone-pad"
                value={patientPhone}
                onChangeText={(value) => {
                  const digitsOnly = value.replace(/\D/g, '').slice(0, 10);
                  setPatientPhone(digitsOnly);
                  if (patientPhoneError) {
                    setPatientPhoneError(getPatientPhoneError(digitsOnly));
                  }
                }}
              />
              {patientPhoneError && <Text style={styles.fieldErrorText}>{patientPhoneError}</Text>}
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
            onPress={() => setCurrentStep((prev) =>
              prev === 5 ? 4 : prev === 4 ? 3 : prev === 3 ? 2 : 1
            )}
            disabled={submitting}
          >
            <Text style={styles.secondaryButtonText}>Back</Text>
          </Pressable>
        )}

        {currentStep === 1 && (
          <Pressable
            style={[styles.primaryButton, (!selectedDepartment || loadingDepartments) && styles.buttonDisabled]}
            disabled={!selectedDepartment || loadingDepartments}
            onPress={() => setCurrentStep(2)}
          >
            <Text style={styles.primaryButtonText}>Next: Select Doctor</Text>
          </Pressable>
        )}

        {currentStep === 2 && (
          <Pressable
            style={[styles.primaryButton, (!selectedDoctor || loadingDoctors || !!doctorLoadError) && styles.buttonDisabled]}
            disabled={!selectedDoctor || loadingDoctors || !!doctorLoadError}
            onPress={() => setCurrentStep(3)}
          >
            <Text style={styles.primaryButtonText}>Next: Date & Session</Text>
          </Pressable>
        )}

        {currentStep === 3 && (
          <Pressable
            style={[styles.primaryButton, !provisionalTimeSlot && styles.buttonDisabled]}
            disabled={!provisionalTimeSlot}
            onPress={() => setCurrentStep(4)}
          >
            <Text style={styles.primaryButtonText}>Next: Review Details</Text>
          </Pressable>
        )}

        {currentStep === 4 && (
          <Pressable
            style={[
              styles.primaryButton,
              (submitting || authLoading || !patientIdentity || !provisionalTimeSlot)
                && styles.buttonDisabled,
            ]}
            disabled={submitting || authLoading || !patientIdentity || !provisionalTimeSlot}
            onPress={handleConfirmBooking}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.primaryButtonText}>Confirm Booking</Text>
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
    backgroundColor: '#EDF4FF',
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 12,
    backgroundColor: '#EDF4FF',
    borderBottomWidth: 1,
    borderBottomColor: '#DCE8F8',
  },
  headerTitle: {
    fontSize: 19,
    fontWeight: '700',
    color: '#0F172A',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#66758C',
    marginTop: 2,
  },
  stepIndicatorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingVertical: 11,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#DCE8F8',
  },
  stepItem: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
  },
  stepItemActive: {},
  stepNumber: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#E2E8F0',
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 22,
    fontSize: 11,
    fontWeight: '700',
  },
  stepNumberActive: {
    backgroundColor: '#635BFF',
    color: '#FFFFFF',
  },
  stepLabel: {
    maxWidth: 62,
    marginTop: 3,
    fontSize: 10,
    fontWeight: '600',
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 12,
  },
  stepLabelActive: {
    color: '#5148D8',
  },
  stepConnector: {
    width: 12,
    height: 2,
    backgroundColor: '#E2E8F0',
    marginBottom: 15,
  },
  stepConnectorActive: {
    backgroundColor: '#635BFF',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 28,
  },
  stepHeader: {
    fontSize: 19,
    fontWeight: '700',
    color: '#0F172A',
  },
  stepSubheader: {
    fontSize: 13,
    lineHeight: 18,
    color: '#66758C',
    marginTop: 4,
    marginBottom: 18,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 9,
  },
  departmentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E0E8F4',
    padding: 14,
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  departmentDropdown: {
    minHeight: 62,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D7E0ED',
    borderRadius: 12,
  },
  departmentDropdownSelected: {
    borderColor: '#A5B4FC',
    backgroundColor: '#F8F9FF',
  },
  departmentDropdownOpen: {
    borderColor: '#635BFF',
  },
  departmentDropdownText: {
    flex: 1,
  },
  departmentLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#635BFF',
    marginBottom: 4,
  },
  departmentValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
  },
  departmentPlaceholder: {
    fontSize: 14,
    color: '#64748B',
  },
  departmentChevron: {
    paddingLeft: 12,
    fontSize: 22,
    color: '#635BFF',
  },
  departmentOptions: {
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#EEF2F7',
    paddingTop: 4,
  },
  departmentOption: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E2E8F0',
  },
  departmentOptionSelected: {
    backgroundColor: '#F3F2FF',
  },
  departmentOptionText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },
  departmentOptionTextSelected: {
    color: '#5148D8',
  },
  departmentDoctorCount: {
    marginLeft: 8,
    fontSize: 11,
    color: '#64748B',
  },
  departmentHint: {
    marginTop: 12,
    marginHorizontal: 2,
    fontSize: 11,
    color: '#66758C',
  },
  scheduleMessage: {
    marginBottom: 12,
    fontSize: 12,
    lineHeight: 18,
    color: '#64748B',
  },
  provisionalNotice: {
    marginBottom: 12,
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#EEF2FF',
    color: '#4338CA',
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '600',
  },
  selectionDetails: {
    marginTop: -8,
    marginBottom: 18,
    padding: 14,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E0E8F4',
  },
  selectionDetailsText: {
    fontSize: 13,
    lineHeight: 20,
    color: '#334155',
    fontWeight: '600',
  },
  departmentEmptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E0E8F4',
    padding: 18,
  },
  departmentEmptyText: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
  },
  dateStrip: {
    flexDirection: 'row',
    marginBottom: 18,
  },
  dateChip: {
    minHeight: 62,
    paddingVertical: 11,
    paddingHorizontal: 15,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D7E0ED',
    marginRight: 9,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 76,
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  dateChipSelected: {
    backgroundColor: '#635BFF',
    borderColor: '#635BFF',
  },
  dateChipUnavailable: {
    backgroundColor: '#F1F5F9',
    borderColor: '#E2E8F0',
    elevation: 0,
    shadowOpacity: 0,
  },
  dayText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#66758C',
  },
  dateLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#17243A',
    marginTop: 2,
  },
  dateTextSelected: {
    color: '#FFFFFF',
  },
  dateTextUnavailable: {
    color: '#94A3B8',
  },
  sessionList: {
    gap: 8,
    marginBottom: 16,
  },
  sessionOption: {
    paddingHorizontal: 13,
    paddingVertical: 11,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: '#D7E0ED',
    backgroundColor: '#FFFFFF',
  },
  sessionOptionSelected: {
    borderColor: '#635BFF',
    backgroundColor: '#F3F2FF',
  },
  sessionOptionUnavailable: {
    backgroundColor: '#F1F5F9',
    borderColor: '#E2E8F0',
  },
  sessionOptionText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },
  sessionOptionTextSelected: {
    color: '#5148D8',
  },
  sessionOptionTextUnavailable: {
    color: '#94A3B8',
  },
  sessionHint: {
    marginTop: 3,
    fontSize: 11,
    color: '#66758C',
  },
  sessionHintUnavailable: {
    color: '#94A3B8',
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 7,
  },
  textInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D7E0ED',
    borderRadius: 11,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 48,
    fontSize: 14,
    color: '#0F172A',
  },
  textInputInvalid: {
    borderColor: '#DC2626',
  },
  fieldErrorText: {
    marginTop: 5,
    fontSize: 11,
    lineHeight: 15,
    color: '#B91C1C',
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#DCE8F8',
  },
  primaryButton: {
    flex: 1,
    minHeight: 50,
    backgroundColor: '#635BFF',
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  secondaryButton: {
    minHeight: 50,
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D7E0ED',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    color: '#475569',
    fontSize: 13,
    fontWeight: '600',
  },
  buttonDisabled: {
    backgroundColor: '#B8C3D1',
    opacity: 1,
  },
  successContainer: {
    flex: 1,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EDF4FF',
  },
  successBadge: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#635BFF',
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
    fontSize: 21,
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
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#DCE8F8',
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
    color: '#5148D8',
    marginTop: 2,
  },
  simpleDetailsCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#DCE8F8',
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 22,
    width: '100%',
    gap: 8,
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 1,
  },
  tokenCard: {
    alignItems: 'center',
    alignSelf: 'stretch',
    paddingVertical: 12,
    marginBottom: 5,
    borderRadius: 12,
    backgroundColor: '#EEF2FF',
  },
  tokenLabel: {
    fontSize: 11,
    color: '#5148D8',
    fontWeight: '700',
    letterSpacing: 1,
  },
  tokenValue: {
    marginTop: 2,
    fontSize: 28,
    color: '#5148D8',
    fontWeight: '800',
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
    minHeight: 48,
    backgroundColor: '#635BFF',
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmActionButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
});
