import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  subscribeAppointments,
  subscribeClinicWings,
  subscribeDoctors,
  subscribeQueues,
  updateQueueStatus,
  createQueue,
  advanceQueue,
  syncQueueMaxToken,
  updateAppointmentStatus,
  subscribeStaffMembers,
  deleteQueue,
  updateQueue,
  updateDoctor,
  deleteDoctor,
  updateClinicWing,
  deleteClinicWing,
  updateStaffMember,
  deleteStaffMember,
} from '@/services/adminService';
import type { Appointment, ClinicWing, Doctor, Queue, StaffMember } from '@/services/adminService';
import { getTodayDateString } from '@/services/mockData';
import { getSessionOverlap, getSriLankaDateTime, isAppointmentDateAllowed, parseTimeRange } from '@/services/appointmentSchedule';

const TODAY = getTodayDateString();
type ManagementView = 'queues' | 'doctors' | 'staff' | 'departments';
type EditableKind = 'queue' | 'doctor' | 'staff' | 'department';
type EditTarget = { kind: EditableKind; id: string; values: Record<string, string> };

function getOpdSessionsForDate(opd: ClinicWing | undefined, date: string): string[] {
  if (!opd || !date) return [];
  const weekday = new Intl.DateTimeFormat('en-US', { weekday: 'long', timeZone: 'UTC' })
    .format(new Date(`${date}T12:00:00Z`));
  if (opd.weeklySessions) return opd.weeklySessions[weekday] ?? [];
  if (opd.operatingDays?.length && !opd.operatingDays.some((day) =>
    day.toLowerCase() === weekday.toLowerCase() || day.toLowerCase() === weekday.slice(0, 3).toLowerCase()
  )) return [];
  return opd.sessions ?? [];
}

function getOpdDates(opd: ClinicWing | undefined): string[] {
  if (!opd) return [];
  return Array.from({ length: 90 }, (_, index) => {
    const date = new Date(`${TODAY}T12:00:00Z`);
    date.setUTCDate(date.getUTCDate() + index);
    return date.toISOString().slice(0, 10);
  }).filter((date) => getOpdSessionsForDate(opd, date).length > 0
    && !(date === TODAY && opd.closedToday));
}

function getQueueCreationSessionsForDate(opd: ClinicWing | undefined, date: string): string[] {
  const sessions = getOpdSessionsForDate(opd, date);
  if (date !== TODAY) return sessions;
  const now = getSriLankaDateTime();
  return sessions.filter((session) => {
    const range = parseTimeRange(session);
    return !!range && range.start > now.minuteOfDay;
  });
}

function isNurseAvailable(nurse: StaffMember, opd: ClinicWing | undefined, date: string, session: string): boolean {
  if (!opd || !date || !session || nurse.role !== 'nurse') return false;
  const belongsToOpd = nurse.opdId
    ? nurse.opdId === opd.id
    : nurse.opdName.trim().toLowerCase() === opd.name.toLowerCase();
  if (!belongsToOpd) return false;
  const weekday = new Intl.DateTimeFormat('en-US', { weekday: 'long', timeZone: 'UTC' })
    .format(new Date(`${date}T12:00:00Z`));
  const shifts = nurse.consultingSchedule?.[weekday] ?? nurse.consultingSchedule?.[weekday.slice(0, 3)] ?? [];
  const sessionRange = parseTimeRange(session);
  return Array.isArray(shifts) && !!sessionRange && shifts.some((shift) => {
    const shiftRange = parseTimeRange(shift);
    return !!shiftRange && Math.max(shiftRange.start, sessionRange.start) < Math.min(shiftRange.end, sessionRange.end);
  });
}

function getQueueStatusPresentation(status: Queue['status']) {
  switch (status) {
    case 'in_progress':
    case 'active': return { label: 'In progress', backgroundColor: '#DCFCE7', color: '#15803D' };
    case 'paused':
    case 'break':
    case 'delayed': return { label: 'Paused', backgroundColor: '#FEF3C7', color: '#B45309' };
    case 'over': return { label: 'Ended', backgroundColor: '#E5E7EB', color: '#4B5563' };
    default: return { label: 'Waiting', backgroundColor: '#DBEAFE', color: '#1D4ED8' };
  }
}

function getOpdRoomOptions(opd: ClinicWing | undefined, doctors: Doctor[] = []): string[] {
  if (!opd) return [];
  const listedRooms = (opd.rooms ?? '').split(',').map((room) => room.trim()).filter(Boolean);
  if (listedRooms.length) return listedRooms.slice(0, opd.maxRooms || listedRooms.length);
  if (opd.maxRooms) return Array.from({ length: Math.max(0, Math.min(opd.maxRooms, 100)) }, (_, index) => `Room ${index + 1}`);
  const doctorRooms = [...new Set(doctors
    .filter((doctor) => doctor.department === opd.name)
    .map((doctor) => doctor.room.trim())
    .filter(Boolean))];
  if (doctorRooms.length) return doctorRooms;
  return [];
}

export default function QueueManagement({
  showQueueCreator = true,
  onBack,
}: { showQueueCreator?: boolean; onBack?: () => void }) {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [queues, setQueues] = useState<Queue[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [clinicWings, setClinicWings] = useState<ClinicWing[]>([]);
  const [nurses, setNurses] = useState<StaffMember[]>([]);
  const [selectedDepartment, setSelectedDepartment] = useState('All');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [selectedOpdId, setSelectedOpdId] = useState('');
  const [queueDate, setQueueDate] = useState(TODAY);
  const [selectedSession, setSelectedSession] = useState('');
  const [selectedRoom, setSelectedRoom] = useState('');
  const [selectedNurseId, setSelectedNurseId] = useState('');
  const [selectedQueueId, setSelectedQueueId] = useState('');
  const [managementView, setManagementView] = useState<ManagementView>('queues');
  const [consultants, setConsultants] = useState<StaffMember[]>([]);
  const [editTarget, setEditTarget] = useState<EditTarget | null>(null);
  const [editFields, setEditFields] = useState<Record<string, string>>({});
  const [savingEdit, setSavingEdit] = useState(false);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    const unsubDoctors = subscribeDoctors((docs) => {
      setDoctors(docs);
      setLoading(false);
    });
    const unsubAppointments = subscribeAppointments(setAppointments);
    const unsubClinicWings = subscribeClinicWings(setClinicWings);
    const unsubNurses = subscribeStaffMembers('nurse', setNurses);
    const unsubConsultants = subscribeStaffMembers('senior_consultant', setConsultants);
    return () => {
      unsubDoctors();
      unsubAppointments();
      unsubClinicWings();
      unsubNurses();
      unsubConsultants();
    };
  }, []);

  useEffect(() => {
    queues.forEach((queue) => {
      const maximum = appointments
        .filter((appointment) => appointment.doctorId === queue.doctorId
          && appointment.date === queue.date
          && appointment.session === queue.session
          && appointment.status !== 'cancelled')
        .reduce((currentMaximum, appointment) => Math.max(currentMaximum, appointment.tokenNumber), 0);
      if (maximum !== (queue.maxToken ?? 0)) {
        syncQueueMaxToken(queue, maximum).catch((error) => {
          console.warn('Failed to sync queue token count.', error);
        });
      }
    });
  }, [appointments, queues]);

  const queueDoctors = doctors;
  const visibleQueues = queues;
  const visibleAppointments = appointments;
  const selectedOpd = clinicWings.find((opd) => opd.id === selectedOpdId) ?? clinicWings[0];
  const availableDates = useMemo(() => getOpdDates(selectedOpd), [selectedOpd]);
  const activeQueueDate = availableDates.includes(queueDate) ? queueDate : availableDates[0] ?? '';
  const availableOpdSessions = getQueueCreationSessionsForDate(selectedOpd, activeQueueDate);
  const selectedOpdRoomOptions = getOpdRoomOptions(selectedOpd, queueDoctors);
  const activeRoom = selectedOpdRoomOptions.includes(selectedRoom) ? selectedRoom : selectedOpdRoomOptions[0] ?? '';
  const activeSession = availableOpdSessions.includes(selectedSession)
    ? selectedSession
    : availableOpdSessions[0] ?? '';
  const opdDoctors = queueDoctors.filter((doctor) => doctor.department === selectedOpd?.name
    && (!doctor.opdId || doctor.opdId === selectedOpd?.id)
    && doctor.active
    && isAppointmentDateAllowed(doctor, activeQueueDate)
    && getSessionOverlap(activeSession, doctor, activeQueueDate).length > 0);
  const selectedDoctor = opdDoctors.find((doctor) => doctor.id === selectedDoctorId) ?? opdDoctors[0];
  const availableNurses = nurses.filter((nurse) => isNurseAvailable(nurse, selectedOpd, activeQueueDate, activeSession));
  const selectedNurse = availableNurses.find((nurse) => nurse.id === selectedNurseId);
  const queueLocation = [
    selectedOpd?.building ? `Building ${selectedOpd.building}` : '',
    selectedOpd?.floor ? `Floor ${selectedOpd.floor}` : '',
    selectedOpd?.section ? `Section ${selectedOpd.section}` : '',
    activeRoom,
  ].filter(Boolean).join(' · ');

  useEffect(() => subscribeQueues(activeQueueDate, setQueues), [activeQueueDate]);

  const handleCreateQueue = async () => {
    if (!selectedOpd?.id || !availableDates.includes(activeQueueDate) || !selectedDoctor?.id || !activeSession || !activeRoom) {
      Alert.alert('Queue details needed', 'Choose an available OPD date, session, doctor and room.');
      return;
    }
    setCreating(true);
    try {
      await createQueue({
        doctorId: selectedDoctor.id,
        doctorName: selectedDoctor.name,
        opdId: selectedOpd.id,
        opdName: selectedOpd.name,
        date: activeQueueDate,
        session: activeSession,
        location: queueLocation,
        avgMinutes: selectedDoctor.slotMinutes ?? 15,
        ...(selectedNurse?.id ? { nurseId: selectedNurse.id, nurseName: selectedNurse.name } : {}),
      });
    } catch (error) {
      Alert.alert('Could not create queue', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setCreating(false);
    }
  };

  const handleQueueStatus = async (doctorId: string, session: string | undefined, status: Queue['status']) => {
    try {
      await updateQueueStatus(doctorId, activeQueueDate, status, undefined, session);
    } catch {
      Alert.alert('Could not update queue', 'Please try again.');
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 800);
  }, []);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#5B6CF8" />
      </View>
    );
  }

  const departments = [
    'All',
    ...new Set([
      ...queueDoctors.map((doctor) => doctor.department),
      ...clinicWings.filter((wing) => wing.active).map((wing) => wing.name),
    ]),
  ];
  const filteredQueues = visibleQueues.filter((queue) => {
    if (selectedDepartment === 'All') return true;
    return queue.opdName === selectedDepartment ||
      queueDoctors.find((doctor) => doctor.id === queue.doctorId)?.department === selectedDepartment;
  }).sort((first, second) => {
    const priority = (status: Queue['status']) => status === 'waiting' ? 0 : status === 'in_progress' ? 1 : status === 'paused' ? 2 : 3;
    return priority(first.status) - priority(second.status) || (first.session ?? '').localeCompare(second.session ?? '');
  });
  const detailQueue = filteredQueues.find((queue) => queue.id === selectedQueueId);
  const selectedRecordCount = managementView === 'queues'
    ? filteredQueues.length
    : managementView === 'doctors'
      ? doctors.length
      : managementView === 'staff'
        ? nurses.length + consultants.length
        : clinicWings.length;

  const handlePatientAction = async (queue: Queue, appointment: Appointment, action: 'complete' | 'cancel') => {
    if (!queue.id || !appointment.id || (action === 'cancel' && appointment.checkedIn)) return;
    try {
      await updateAppointmentStatus(appointment.id, action === 'complete' ? 'completed' : 'cancelled');
      await advanceQueue(queue.id, appointment.tokenNumber);
    } catch {
      Alert.alert('Could not update patient', 'Please try again.');
    }
  };

  const confirmDeleteQueue = (queue: Queue) => {
    if (!queue.id) return;
    Alert.alert('Delete queue?', 'This removes the queue record. Patient appointments will remain unchanged.', [
      { text: 'Keep queue', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => deleteQueue(queue.id!).catch(() => Alert.alert('Could not delete queue', 'Please try again.')),
      },
    ]);
  };

  const startEdit = (kind: EditableKind, id: string | undefined, values: Record<string, string>) => {
    if (!id) return;
    setEditTarget({ kind, id, values });
    setEditFields(values);
  };

  const confirmDeleteRecord = (kind: Exclude<EditableKind, 'queue'>, id: string | undefined, label: string) => {
    if (!id) return;
    Alert.alert(`Delete ${label}?`, 'This action cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          if (kind === 'doctor') await deleteDoctor(id);
          else if (kind === 'staff') await deleteStaffMember(id);
          else await deleteClinicWing(id);
        } catch {
          Alert.alert(`Could not delete ${label}`, 'Please try again.');
        }
      } },
    ]);
  };

  const saveRecordEdit = async () => {
    if (!editTarget) return;
    setSavingEdit(true);
    try {
      const fields = editFields;
      if (editTarget.kind === 'queue') {
        await updateQueue(editTarget.id, {
          location: fields.location,
          currentToken: Math.max(0, Number(fields.currentToken) || 0),
          maxToken: Math.max(0, Number(fields.maxToken) || 0),
        });
      } else if (editTarget.kind === 'doctor') {
        const doctorAge = Number(fields.age);
        await updateDoctor(editTarget.id, {
          name: fields.name,
          specialty: fields.specialty,
          email: fields.email,
          ...(fields.age.trim() && Number.isInteger(doctorAge) ? { age: doctorAge } : {}),
          room: fields.room,
          slotMinutes: Math.max(1, Number(fields.slotMinutes) || 15),
        });
      } else if (editTarget.kind === 'staff') {
        await updateStaffMember(editTarget.id, {
          name: fields.name,
          phone: fields.phone,
          email: fields.email,
          age: Math.max(18, Number(fields.age) || 18),
        });
      } else {
        const consultant = consultants.find((member) => member.id === fields.seniorConsultantId);
        await updateClinicWing(editTarget.id, {
          name: fields.name,
          building: fields.building,
          floor: fields.floor,
          section: fields.section,
          maxRooms: Math.max(1, Number(fields.maxRooms) || 1),
          seniorConsultantId: consultant?.id ?? '',
          clinicHead: consultant?.name ?? '',
        });
      }
      setEditTarget(null);
    } catch {
      Alert.alert('Could not save changes', 'Please review the values and try again.');
    } finally {
      setSavingEdit(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {!showQueueCreator ? <><View style={styles.summaryCard}>
        <View style={styles.headerInfo}>
          <Text style={styles.pageTitle}>Queue management</Text>
          <Text style={styles.hospitalName}>{activeQueueDate || 'No available OPD date selected'}</Text>
        </View>
        <View style={styles.summaryStats}>
          <View style={styles.summaryItem}><View style={styles.orangeDot} /><View><Text style={styles.summaryNum}>{visibleQueues.filter((queue) => queue.status === 'waiting' || queue.status === 'upcoming').length}</Text><Text style={styles.summaryLabel}>Waiting</Text></View></View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}><View style={styles.greenDot} /><View><Text style={styles.summaryNum}>{visibleQueues.filter((queue) => queue.status === 'in_progress' || queue.status === 'active').length}</Text><Text style={styles.summaryLabel}>In progress</Text></View></View>
        </View>
      </View>

      <View style={styles.managementTabs}>
        {([
          ['queues', 'Queues'],
          ['doctors', 'Doctors'],
          ['staff', 'Nurses / consultants'],
          ['departments', 'Departments'],
        ] as [ManagementView, string][]).map(([view, label]) => (
          <TouchableOpacity key={view} style={[styles.managementTab, managementView === view && styles.managementTabActive]} onPress={() => setManagementView(view)}>
            <Text style={[styles.managementTabText, managementView === view && styles.managementTabTextActive]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={[styles.filterRow, managementView !== 'queues' && styles.hidden]}
        contentContainerStyle={styles.filterContent}
      >
        {departments.map((department) => {
          const selected = department === selectedDepartment;
          return (
            <TouchableOpacity
              key={department}
              style={[styles.filterChip, selected && styles.filterChipActive]}
              onPress={() => setSelectedDepartment(department)}
            >
              <Text style={[styles.filterText, selected && styles.filterTextActive]}>
                {department}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView></> : null}

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#5B6CF8" />
        }
      >
        {showQueueCreator && onBack ? <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>‹  Back to Manages</Text>
        </TouchableOpacity> : null}
        {showQueueCreator ? <View style={styles.card}>
          <Text style={styles.doctorName}>Create queue</Text>
          <Text style={styles.doctorSub}>Choose an OPD, available date and session, doctor, and room.</Text>
          <View style={styles.controlRow}>
            {clinicWings.map((opd) => (
              <TouchableOpacity key={opd.id} style={[styles.controlBtn, selectedOpd?.id === opd.id && styles.controlBtnActive]} onPress={() => {
                setSelectedOpdId(opd.id ?? '');
                const firstAvailableDate = getOpdDates(opd)[0] ?? '';
                setQueueDate(firstAvailableDate);
                setSelectedSession(getQueueCreationSessionsForDate(opd, firstAvailableDate)[0] ?? '');
                setSelectedDoctorId('');
                setSelectedNurseId('');
                setSelectedRoom(getOpdRoomOptions(opd, queueDoctors)[0] ?? '');
              }}>
                <Text style={[styles.controlBtnText, selectedOpd?.id === opd.id && styles.controlBtnTextActive]}>{opd.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.formLabel}>Available date</Text>
          {availableDates.length ? <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.choiceRow}>
            {availableDates.map((date) => {
              const weekday = new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone: 'UTC' }).format(new Date(`${date}T12:00:00Z`));
              const shortDate = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }).format(new Date(`${date}T12:00:00Z`));
              const selected = activeQueueDate === date;
              return <TouchableOpacity key={date} style={[styles.choiceCard, selected && styles.choiceCardSelected]} onPress={() => {
                setQueueDate(date);
                setSelectedSession(getQueueCreationSessionsForDate(selectedOpd, date)[0] ?? '');
                setSelectedDoctorId('');
                setSelectedNurseId('');
              }}>
                <Text style={[styles.choicePrimary, selected && styles.choiceTextSelected]}>{weekday}</Text>
                <Text style={[styles.choiceSecondary, selected && styles.choiceTextSelected]}>{shortDate}</Text>
              </TouchableOpacity>;
            })}
          </ScrollView> : <Text style={styles.inlineHint}>No scheduled dates are available for this OPD.</Text>}
          <Text style={styles.formLabel}>Available session</Text>
          {availableOpdSessions.length ? <View style={styles.controlRow}>
            {availableOpdSessions.map((session) => (
              <TouchableOpacity key={session} style={[styles.controlBtn, activeSession === session && styles.controlBtnActive]} onPress={() => {
                setSelectedSession(session);
                setSelectedDoctorId('');
                setSelectedNurseId('');
              }}>
                <Text style={[styles.controlBtnText, activeSession === session && styles.controlBtnTextActive]}>{session}</Text>
              </TouchableOpacity>
            ))}
          </View> : <Text style={styles.inlineHint}>No sessions are scheduled for this date.</Text>}
          <Text style={styles.formLabel}>Available doctors</Text>
          <View style={styles.controlRow}>
            {opdDoctors.map((doctor) => (
              <TouchableOpacity key={doctor.id} style={[styles.controlBtn, selectedDoctor?.id === doctor.id && styles.controlBtnActive]} onPress={() => setSelectedDoctorId(doctor.id ?? '')}>
                <Text style={[styles.controlBtnText, selectedDoctor?.id === doctor.id && styles.controlBtnTextActive]}>{doctor.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
          {!opdDoctors.length ? <Text style={styles.inlineHint}>No active doctor is available for this OPD, date, and session.</Text> : null}
          <Text style={styles.formLabel}>Available nurses (optional)</Text>
          <View style={styles.controlRow}>
            <TouchableOpacity style={[styles.controlBtn, !selectedNurse && styles.controlBtnActive]} onPress={() => setSelectedNurseId('')}>
              <Text style={[styles.controlBtnText, !selectedNurse && styles.controlBtnTextActive]}>Not assigned</Text>
            </TouchableOpacity>
            {availableNurses.map((nurse) => (
              <TouchableOpacity key={nurse.id} style={[styles.controlBtn, selectedNurse?.id === nurse.id && styles.controlBtnActive]} onPress={() => setSelectedNurseId(nurse.id ?? '')}>
                <Text style={[styles.controlBtnText, selectedNurse?.id === nurse.id && styles.controlBtnTextActive]}>{nurse.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
          {!availableNurses.length ? <Text style={styles.inlineHint}>No nurse is scheduled for this OPD, date, and session.</Text> : null}
          <Text style={styles.formLabel}>Available rooms ({selectedOpdRoomOptions.length}{selectedOpd?.maxRooms ? ` of ${selectedOpd.maxRooms}` : ''})</Text>
          {selectedOpdRoomOptions.length ? <View style={styles.roomRow}>
            {selectedOpdRoomOptions.map((room) => {
              const selected = activeRoom === room;
              return <TouchableOpacity key={room} style={[styles.roomChoice, selected && styles.choiceCardSelected]} onPress={() => setSelectedRoom(room)}>
                <Text style={[styles.choicePrimary, selected && styles.choiceTextSelected]}>{room}</Text>
              </TouchableOpacity>;
            })}
          </View> : <Text style={styles.inlineHint}>No rooms are configured for this OPD.</Text>}
          {queueLocation ? <Text style={styles.locationPreview}>Queue location: {queueLocation}</Text> : null}
          <TouchableOpacity style={[styles.createQueueButton, (!selectedDoctor || !activeRoom || !availableDates.includes(activeQueueDate)) && styles.disabledButton]} disabled={creating || !selectedDoctor || !activeRoom || !availableDates.includes(activeQueueDate)} onPress={handleCreateQueue}>
            <Text style={styles.createQueueText}>{creating ? 'Creating…' : 'Create Queue'}</Text>
          </TouchableOpacity>
        </View> : null}
        {!showQueueCreator && managementView === 'queues' ? <Text style={styles.sectionTitle}>Created queues</Text> : null}

        {!showQueueCreator && managementView === 'queues' && filteredQueues.length === 0 ? (
          <View style={styles.emptyDepartment}>
            <Text style={styles.emptyDepartmentTitle}>{selectedDepartment === 'All' ? 'No queues yet' : selectedDepartment}</Text>
            <Text style={styles.emptyDepartmentText}>
              Choose an OPD, doctor and session above to create today&apos;s queue.
            </Text>
          </View>
        ) : null}

        {!showQueueCreator && managementView !== 'queues' && selectedRecordCount === 0 ? (
          <View style={styles.emptyDepartment}><Text style={styles.emptyDepartmentTitle}>No records yet</Text><Text style={styles.emptyDepartmentText}>Records will appear here after they are added.</Text></View>
        ) : null}

        {!showQueueCreator && managementView === 'queues' ? filteredQueues.map((queue) => {
          const doctor = queueDoctors.find((item) => item.id === queue.doctorId);
          const queueStatus = getQueueStatusPresentation(queue.status);
          return (
            <View key={queue.id} style={styles.card}>
              <TouchableOpacity style={styles.queueCardTapArea} onPress={() => setSelectedQueueId(queue.id ?? '')} accessibilityRole="button" accessibilityLabel={`Open ${queue.doctorName ?? doctor?.name ?? 'doctor'} queue`}>
                <Text style={styles.doctorName}>{queue.doctorName ?? doctor?.name ?? 'Doctor'}</Text>
                <View style={styles.queueCardSummary}>
                  <Text style={[styles.queueStatusPill, { backgroundColor: queueStatus.backgroundColor, color: queueStatus.color }]}>{queueStatus.label}</Text>
                  <Text style={styles.detailTokens}>{queue.currentToken} / {queue.maxToken ?? 0}</Text>
                </View>
              </TouchableOpacity>
              <View style={styles.recordActions}>
                <TouchableOpacity style={styles.editRecordButton} onPress={() => startEdit('queue', queue.id, { location: queue.location ?? '', currentToken: String(queue.currentToken), maxToken: String(queue.maxToken ?? 0) })}><Text style={styles.editRecordText}>Edit</Text></TouchableOpacity>
                <TouchableOpacity style={styles.deleteQueueButton} onPress={() => confirmDeleteQueue(queue)} accessibilityRole="button" accessibilityLabel="Delete queue"><Text style={styles.deleteQueueText}>Delete</Text></TouchableOpacity>
              </View>
            </View>
          );
        }) : null}

        {!showQueueCreator && managementView === 'doctors' ? doctors.map((doctor) => (
          <View key={doctor.id} style={styles.card}>
            <Text style={styles.doctorName}>{doctor.name}</Text>
            <Text style={styles.doctorSub}>{doctor.specialty ?? doctor.department} · {doctor.department}</Text>
            <Text style={styles.doctorSub}>{doctor.email ?? ''}</Text>
            <View style={styles.recordActions}>
              <TouchableOpacity style={styles.editRecordButton} onPress={() => startEdit('doctor', doctor.id, { name: doctor.name, specialty: doctor.specialty ?? '', email: doctor.email ?? '', age: String(doctor.age ?? ''), room: doctor.room ?? '', slotMinutes: String(doctor.slotMinutes ?? 15) })}><Text style={styles.editRecordText}>Edit</Text></TouchableOpacity>
              <TouchableOpacity style={styles.deleteQueueButton} onPress={() => confirmDeleteRecord('doctor', doctor.id, 'doctor')}><Text style={styles.deleteQueueText}>Delete</Text></TouchableOpacity>
            </View>
          </View>
        )) : null}

        {!showQueueCreator && managementView === 'staff' ? [...nurses, ...consultants].map((member) => (
          <View key={member.id} style={styles.card}>
            <Text style={styles.doctorName}>{member.name}</Text>
            <Text style={styles.doctorSub}>{member.role === 'nurse' ? 'Nurse' : 'Senior consultant'} · {member.opdName}</Text>
            <Text style={styles.doctorSub}>{member.phone} · {member.email}</Text>
            <View style={styles.recordActions}>
              <TouchableOpacity style={styles.editRecordButton} onPress={() => startEdit('staff', member.id, { name: member.name, phone: member.phone, email: member.email, age: String(member.age) })}><Text style={styles.editRecordText}>Edit</Text></TouchableOpacity>
              <TouchableOpacity style={styles.deleteQueueButton} onPress={() => confirmDeleteRecord('staff', member.id, member.role === 'nurse' ? 'nurse' : 'consultant')}><Text style={styles.deleteQueueText}>Delete</Text></TouchableOpacity>
            </View>
          </View>
        )) : null}

        {!showQueueCreator && managementView === 'departments' ? clinicWings.map((wing) => (
          <View key={wing.id} style={styles.card}>
            <Text style={styles.doctorName}>{wing.name}</Text>
            <Text style={styles.doctorSub}>Building {wing.building} · Floor {wing.floor} · Section {wing.section ?? '—'}</Text>
            <Text style={styles.doctorSub}>{wing.maxRooms ?? wing.rooms} rooms · {(wing.sessions ?? []).join(', ')}</Text>
            <View style={styles.recordActions}>
              <TouchableOpacity style={styles.editRecordButton} onPress={() => startEdit('department', wing.id, { name: wing.name, building: wing.building, floor: wing.floor, section: wing.section ?? '', maxRooms: String(wing.maxRooms ?? 1), seniorConsultantId: wing.seniorConsultantId ?? consultants.find((member) => member.name === wing.clinicHead && member.opdId === wing.id)?.id ?? '' })}><Text style={styles.editRecordText}>Edit</Text></TouchableOpacity>
              <TouchableOpacity style={styles.deleteQueueButton} onPress={() => confirmDeleteRecord('department', wing.id, 'department')}><Text style={styles.deleteQueueText}>Delete</Text></TouchableOpacity>
            </View>
          </View>
        )) : null}

        <View style={styles.bottomSpacer} />
      </ScrollView>
      <Modal visible={!!detailQueue} animationType="slide" onRequestClose={() => setSelectedQueueId('')}>
        {detailQueue ? <SafeAreaView style={styles.safe} edges={['top']}>
          <ScrollView style={styles.scroll} contentContainerStyle={styles.detailContent}>
            <TouchableOpacity style={styles.backButton} onPress={() => setSelectedQueueId('')}><Text style={styles.backButtonText}>‹  Appts</Text></TouchableOpacity>
            <View style={styles.card}>
              <Text style={styles.doctorName}>{detailQueue.doctorName ?? queueDoctors.find((doctor) => doctor.id === detailQueue.doctorId)?.name ?? 'Doctor'}</Text>
              <Text style={styles.doctorSub}>{detailQueue.opdName ?? 'Department'} · {detailQueue.location ?? 'Location not set'}</Text>
              <Text style={styles.doctorSub}>{detailQueue.session ?? 'Session'} · {detailQueue.date}</Text>
              {detailQueue.nurseName ? <Text style={styles.doctorSub}>Nurse: {detailQueue.nurseName}</Text> : null}
              <Text style={styles.detailTokens}>Current token {detailQueue.currentToken} / {detailQueue.maxToken ?? 0}</Text>
              <Text style={[styles.queueStatusPill, { backgroundColor: getQueueStatusPresentation(detailQueue.status).backgroundColor, color: getQueueStatusPresentation(detailQueue.status).color }]}>Status: {getQueueStatusPresentation(detailQueue.status).label}</Text>
              <View style={styles.controlRow}>
                <TouchableOpacity style={[styles.controlBtn, detailQueue.status === 'in_progress' && styles.controlBtnActive]} disabled={detailQueue.status === 'over'} onPress={() => handleQueueStatus(detailQueue.doctorId, detailQueue.session, 'in_progress')}><Text style={styles.controlBtnText}>Start</Text></TouchableOpacity>
                <TouchableOpacity style={[styles.controlBtn, detailQueue.status === 'paused' && styles.controlBtnBreak]} disabled={detailQueue.status === 'over'} onPress={() => handleQueueStatus(detailQueue.doctorId, detailQueue.session, 'paused')}><Text style={styles.controlBtnText}>Pause</Text></TouchableOpacity>
                <TouchableOpacity style={styles.controlBtn} disabled={detailQueue.status === 'over'} onPress={() => handleQueueStatus(detailQueue.doctorId, detailQueue.session, 'over')}><Text style={styles.controlBtnText}>End</Text></TouchableOpacity>
              </View>
            </View>
            <Text style={styles.sectionTitle}>Patients</Text>
            <View style={styles.patientTableHeader}><Text style={styles.patientToken}>Token</Text><Text style={styles.patientNameCell}>Name · mobile</Text><Text style={styles.patientActions} /></View>
            {visibleAppointments.filter((appointment) => appointment.doctorId === detailQueue.doctorId && appointment.date === detailQueue.date && appointment.session === detailQueue.session).sort((a, b) => a.tokenNumber - b.tokenNumber).map((appointment) => {
              const cancelled = appointment.status === 'cancelled';
              const completed = appointment.status === 'completed';
              const patientStatus = cancelled
                ? { label: 'Leave / cancelled', color: '#B91C1C', backgroundColor: '#FEE2E2' }
                : completed
                  ? { label: 'Completed', color: '#15803D', backgroundColor: '#DCFCE7' }
                  : appointment.checkedIn
                    ? { label: 'Checked in', color: '#047857', backgroundColor: '#D1FAE5' }
                    : { label: 'Waiting', color: '#1D4ED8', backgroundColor: '#DBEAFE' };
              return <View key={appointment.id} style={styles.patientRow}>
                <Text style={styles.patientToken}>#{appointment.tokenNumber}</Text>
                <View style={styles.patientNameCell}><Text style={styles.patientName}>{appointment.patientName}</Text><Text style={styles.patientPhone}>{appointment.patientPhone}</Text><Text style={[styles.patientStatus, { color: patientStatus.color, backgroundColor: patientStatus.backgroundColor }]}>{patientStatus.label}</Text></View>
                <View style={styles.patientActions}>
                  <TouchableOpacity accessibilityLabel="Mark patient complete" disabled={cancelled || completed} style={[styles.patientAction, (cancelled || completed) && styles.disabledButton]} onPress={() => handlePatientAction(detailQueue, appointment, 'complete')}><Text style={styles.completeIcon}>✓</Text></TouchableOpacity>
                  <TouchableOpacity accessibilityLabel="Mark patient absent" disabled={cancelled || completed || appointment.checkedIn === true} style={[styles.patientAction, (cancelled || completed || appointment.checkedIn) && styles.disabledButton]} onPress={() => handlePatientAction(detailQueue, appointment, 'cancel')}><Text style={styles.cancelIcon}>×</Text></TouchableOpacity>
                </View>
              </View>;
            })}
          </ScrollView>
        </SafeAreaView> : null}
      </Modal>
      <Modal visible={!!editTarget} transparent animationType="fade" onRequestClose={() => setEditTarget(null)}>
        <View style={styles.editOverlay}>
          <View style={styles.editModal}>
            <Text style={styles.editTitle}>Edit {editTarget?.kind ?? 'record'}</Text>
            <ScrollView style={styles.editFields} keyboardShouldPersistTaps="handled">
              {Object.entries(editFields).filter(([key]) => key !== 'seniorConsultantId').map(([key, value]) => (
                <View key={key}>
                  <Text style={styles.editLabel}>{key === 'maxRooms' ? 'Maximum rooms' : key === 'slotMinutes' ? 'Minutes per patient' : key.replace(/([A-Z])/g, ' $1')}</Text>
                  <TextInput
                    style={styles.editInput}
                    value={value}
                    onChangeText={(text) => setEditFields((current) => ({ ...current, [key]: text }))}
                    keyboardType={['age', 'slotMinutes', 'currentToken', 'maxToken', 'maxRooms', 'floor'].includes(key) ? 'number-pad' : 'default'}
                    multiline={key === 'sessions'}
                    autoCapitalize={key === 'email' ? 'none' : 'sentences'}
                  />
                </View>
              ))}
            </ScrollView>
            {editTarget?.kind === 'department' ? <View style={styles.consultantEditSection}>
              <Text style={styles.editLabel}>Senior consultant</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.consultantEditOptions}>
                {[
                  { id: '', name: 'Not yet assigned' },
                  ...consultants
                    .filter((member) => member.opdId === editTarget.id || member.opdName.trim().toLowerCase() === editTarget.values.name.trim().toLowerCase())
                    .map((member) => ({ id: member.id ?? '', name: member.name })),
                ].map((consultant) => {
                  const selected = editFields.seniorConsultantId === consultant.id;
                  return <TouchableOpacity key={consultant.id || 'unassigned'} style={[styles.consultantEditChip, selected && styles.consultantEditChipActive]} onPress={() => setEditFields((current) => ({ ...current, seniorConsultantId: consultant.id }))}>
                    <Text style={[styles.consultantEditChipText, selected && styles.consultantEditChipTextActive]}>{consultant.name}</Text>
                  </TouchableOpacity>;
                })}
              </ScrollView>
            </View> : null}
            <View style={styles.recordActions}>
              <TouchableOpacity style={styles.editCancelButton} onPress={() => setEditTarget(null)}><Text style={styles.editCancelText}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity disabled={savingEdit} style={styles.editSaveButton} onPress={saveRecordEdit}><Text style={styles.editSaveText}>{savingEdit ? 'Saving…' : 'Save changes'}</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F7F8FF' },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F6FA',
  },

  pageTitle: { fontSize: 17, fontWeight: '700', color: '#1A1D2E' },
  hospitalName: { fontSize: 12, color: '#788094', marginTop: 3 },
  summaryCard: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 14,
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#E8EAF5',
  },
  headerInfo: { flex: 1, paddingRight: 12 },
  summaryStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#F3F4FF',
    borderWidth: 1,
    borderColor: '#E5E7FA',
    borderRadius: 24,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  summaryItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  summaryNum: { fontSize: 13, fontWeight: '800', color: '#1A1D2E' },
  summaryLabel: { fontSize: 10, color: '#4E5669', fontWeight: '600' },
  summaryDivider: { width: 1, height: 24, backgroundColor: '#D5D8E8' },
  greenDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#22C55E' },
  orangeDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#F97316' },

  filterRow: { maxHeight: 46, marginBottom: 8 },
  hidden: { display: 'none' },
  managementTabs: { flexDirection: 'row', gap: 6, marginHorizontal: 12, marginBottom: 10 },
  managementTab: { flex: 1, minHeight: 40, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5, borderRadius: 10, backgroundColor: '#E9EBF4' },
  managementTabActive: { backgroundColor: '#5B6CF8' },
  managementTabText: { color: '#555D73', fontSize: 10, fontWeight: '700', textAlign: 'center' },
  managementTabTextActive: { color: '#fff' },
  filterContent: { paddingHorizontal: 20, gap: 8, alignItems: 'center' },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 18,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E8EAF2',
  },
  filterChipActive: { backgroundColor: '#6878F5', borderColor: '#6878F5' },
  filterText: { fontSize: 12, color: '#555C70', fontWeight: '600' },
  filterTextActive: { color: '#fff' },

  scroll: { flex: 1 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6B7280',
    paddingHorizontal: 16,
    paddingBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  queueCardSummary: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 },
  recordActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 12 },
  editRecordButton: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 9, backgroundColor: '#EEF2FF' },
  editRecordText: { color: '#4F46E5', fontSize: 12, fontWeight: '700' },
  editOverlay: { flex: 1, justifyContent: 'center', padding: 20, backgroundColor: 'rgba(10,15,30,0.45)' },
  editModal: { maxHeight: '85%', borderRadius: 18, padding: 18, backgroundColor: '#fff' },
  editTitle: { color: '#20243A', fontSize: 20, fontWeight: '800', marginBottom: 12 },
  editFields: { flexGrow: 0 },
  consultantEditSection: { marginTop: 4 },
  consultantEditOptions: { gap: 8, paddingVertical: 8 },
  consultantEditChip: { borderWidth: 1, borderColor: '#DDE1EF', borderRadius: 18, paddingHorizontal: 11, paddingVertical: 8, backgroundColor: '#fff' },
  consultantEditChipActive: { borderColor: '#6879E8', backgroundColor: '#E9ECFF' },
  consultantEditChipText: { color: '#555D73', fontSize: 12, fontWeight: '600' },
  consultantEditChipTextActive: { color: '#4355C6' },
  editLabel: { color: '#596174', fontSize: 12, fontWeight: '700', textTransform: 'capitalize', marginTop: 10, marginBottom: 5 },
  editInput: { minHeight: 42, borderWidth: 1, borderColor: '#DDE1EF', borderRadius: 10, paddingHorizontal: 11, paddingVertical: 9, color: '#20243A' },
  editHint: { color: '#788094', fontSize: 11, marginTop: 8 },
  editCancelButton: { flex: 1, minHeight: 42, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F1F2F7', borderRadius: 10 },
  editCancelText: { color: '#596174', fontWeight: '700' },
  editSaveButton: { flex: 1, minHeight: 42, alignItems: 'center', justifyContent: 'center', backgroundColor: '#5B6CF8', borderRadius: 10 },
  editSaveText: { color: '#fff', fontWeight: '700' },
  queueCardTapArea: { padding: 2 },
  deleteQueueButton: { alignSelf: 'flex-end', marginTop: 12, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 9, backgroundColor: '#FEF2F2' },
  deleteQueueText: { color: '#B91C1C', fontSize: 12, fontWeight: '700' },
  detailContent: { padding: 16, paddingBottom: 36 },
  backButton: { paddingVertical: 12, marginBottom: 8 },
  backButtonText: { color: '#5365D9', fontSize: 16, fontWeight: '700' },
  detailTokens: { color: '#20243A', fontSize: 16, fontWeight: '800', marginTop: 12 },
  statusLine: { color: '#596174', fontSize: 13, fontWeight: '700', textTransform: 'capitalize' },
  queueStatusPill: { alignSelf: 'flex-start', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5, fontSize: 12, fontWeight: '700', overflow: 'hidden' },
  patientTableHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, backgroundColor: '#EDEFF8', borderRadius: 10 },
  patientRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 12, marginTop: 7, backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#E8EAF5' },
  patientToken: { width: 52, color: '#30364D', fontSize: 13, fontWeight: '800' },
  patientNameCell: { flex: 1, color: '#30364D' },
  patientName: { color: '#30364D', fontSize: 13, fontWeight: '700' },
  patientPhone: { color: '#858B9C', fontSize: 11, marginTop: 3 },
  patientStatus: { alignSelf: 'flex-start', overflow: 'hidden', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3, marginTop: 5, fontSize: 10, fontWeight: '700' },
  patientActions: { flexDirection: 'row', width: 86, justifyContent: 'flex-end', gap: 8 },
  patientAction: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center', borderRadius: 17, backgroundColor: '#E9F8EF' },
  completeIcon: { color: '#16A34A', fontSize: 20, fontWeight: '800' },
  cancelIcon: { color: '#DC2626', fontSize: 24, fontWeight: '700' },
  emptyDepartment: {
    marginHorizontal: 16,
    marginTop: 8,
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E8EAF5',
  },
  emptyDepartmentTitle: { fontSize: 15, fontWeight: '700', color: '#1A1D2E' },
  emptyDepartmentText: { fontSize: 13, color: '#737B8C', lineHeight: 19, marginTop: 5 },
  card: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 14,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E8EAF5',
    gap: 12,
  },
  queueInput: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 8,
    color: '#1A1D2E',
    backgroundColor: '#FAFAFA',
  },
  createQueueButton: {
    marginTop: 10,
    backgroundColor: '#5B6CF8',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
  },
  createQueueText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  cardHeader: { flexDirection: 'row', alignItems: 'center' },
  doctorAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E3E8F8',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: { fontSize: 17, fontWeight: '700', color: '#5B6CF8' },
  doctorInfo: { flex: 1 },
  doctorName: { fontSize: 15, fontWeight: '700', color: '#1A1D2E' },
  doctorSub: { fontSize: 12, color: '#8B90A7', marginTop: 2 },
  formLabel: { color: '#4F566B', fontSize: 12, fontWeight: '700', marginTop: 8 },
  inlineHint: { color: '#7B8193', fontSize: 12, paddingVertical: 5 },
  choiceRow: { flexDirection: 'row', gap: 8, paddingVertical: 3 },
  choiceCard: { minWidth: 70, alignItems: 'center', paddingHorizontal: 10, paddingVertical: 8, borderRadius: 12, backgroundColor: '#F7F8FC', borderWidth: 1, borderColor: '#E5E7F0' },
  choiceCardSelected: { backgroundColor: '#6878F5', borderColor: '#6878F5' },
  choicePrimary: { color: '#343B52', fontSize: 12, fontWeight: '700' },
  choiceSecondary: { color: '#737B8C', fontSize: 11, marginTop: 2 },
  choiceTextSelected: { color: '#fff' },
  roomRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  roomChoice: { minWidth: 76, alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10, backgroundColor: '#F7F8FC', borderWidth: 1, borderColor: '#E5E7F0' },
  locationPreview: { color: '#39415A', fontSize: 12, fontWeight: '700', marginTop: 4 },
  disabledButton: { opacity: 0.5 },

  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
  },
  activeBadge: { backgroundColor: '#E8FBF2' },
  breakBadge: { backgroundColor: '#FFF3E8' },
  delayedBadge: { backgroundColor: '#FFF0DF' },
  upcomingBadge: { backgroundColor: '#E8EBFF' },
  statusBadgeText: { fontSize: 11, fontWeight: '700' },

  tokenRow: {
    flexDirection: 'row',
    backgroundColor: '#F1F2FF',
    borderColor: '#E2E5FF',
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    alignItems: 'center',
    gap: 6,
  },
  tokenStat: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 },
  tokenStatLabel: { fontSize: 12, color: '#4F566B' },
  nextTokenNumber: { fontSize: 12, fontWeight: '800', color: '#2563EB' },
  nextNameInline: { flex: 1, fontSize: 11, color: '#33394B' },

  servingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  servingLabel: { fontSize: 12, color: '#737B8C' },
  servingNumber: { fontSize: 21, fontWeight: '800', color: '#202638', flex: 1 },
  controlRow: {
    flexDirection: 'row',
    gap: 4,
    backgroundColor: '#F1F2FA',
    padding: 3,
    borderRadius: 16,
  },
  controlBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 14,
    alignItems: 'center',
  },
  controlBtnActive: { backgroundColor: '#fff' },
  controlBtnBreak: { backgroundColor: '#fff4e5' },
  controlBtnText: { fontSize: 12, fontWeight: '600', color: '#50576A' },
  controlBtnTextActive: { color: '#3562D5' },
  controlBtnBreakText: { color: '#C45B12' },
  broadcastNavBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: '#6878F5',
    alignItems: 'center',
  },
  broadcastNavBtnText: { fontSize: 11, fontWeight: '700', color: '#fff' },

  bottomSpacer: { height: 100 },
});
