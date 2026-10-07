import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import {
  subscribeDemoQueues,
  subscribeDemoAppointments,
  subscribeAppointments,
  subscribeClinicWings,
  subscribeDoctors,
  subscribeQueues,
  updateDemoQueue,
  updateQueueStatus,
} from '@/services/adminService';
import type { Appointment, ClinicWing, Doctor, Queue } from '@/services/adminService';
import { getTodayDateString, INITIAL_DOCTORS } from '@/services/mockData';

const TODAY = getTodayDateString();

type QueueManagementProps = {
  onBroadcastDelay?: (doctor: Doctor, isDemo: boolean) => void;
};

export default function QueueManagement({ onBroadcastDelay }: QueueManagementProps) {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [queues, setQueues] = useState<Queue[]>([]);
  const [sampleQueues, setSampleQueues] = useState<Queue[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [sampleAppointments, setSampleAppointments] = useState<Appointment[]>([]);
  const [clinicWings, setClinicWings] = useState<ClinicWing[]>([]);
  const [selectedDepartment, setSelectedDepartment] = useState('All');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const unsubDoctors = subscribeDoctors((docs) => {
      setDoctors(docs);
      setLoading(false);
    });
    const unsubQueues = subscribeQueues(TODAY, setQueues);
    const unsubDemoQueues = subscribeDemoQueues(setSampleQueues);
    const unsubAppointments = subscribeAppointments(setAppointments);
    const unsubDemoAppointments = subscribeDemoAppointments(setSampleAppointments);
    const unsubClinicWings = subscribeClinicWings(setClinicWings);
    return () => {
      unsubDoctors();
      unsubQueues();
      unsubDemoQueues();
      unsubAppointments();
      unsubDemoAppointments();
      unsubClinicWings();
    };
  }, []);

  const showingSampleQueues = doctors.length === 0;
  const queueDoctors = showingSampleQueues ? INITIAL_DOCTORS : doctors;
  const visibleQueues = showingSampleQueues ? sampleQueues : queues;
  const visibleAppointments = showingSampleQueues ? sampleAppointments : appointments;
  const getQueue = (doctorId: string): Queue | undefined =>
    visibleQueues.find((q) => q.doctorId === doctorId);

  const handleSetStatus = async (doctor: Doctor, status: Queue['status']) => {
    try {
      if (showingSampleQueues) {
        updateDemoQueue(doctor.id!, { status });
      } else {
        await updateQueueStatus(doctor.id!, TODAY, status);
      }
    } catch {
      Alert.alert('Error', 'Failed to update status');
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

  const availableDoctors = queueDoctors.filter((d) => {
    const q = getQueue(d.id!);
    return !q || q.status === 'active';
  }).length;

  const delayedDoctors = queueDoctors.filter((d) => {
    const q = getQueue(d.id!);
    return q?.status === 'delayed';
  }).length;
  const departments = [
    'All',
    ...new Set([
      ...queueDoctors.map((doctor) => doctor.department),
      ...clinicWings.filter((wing) => wing.active).map((wing) => wing.name),
    ]),
  ];
  const filteredDoctors =
    selectedDepartment === 'All'
      ? queueDoctors
      : queueDoctors.filter((doctor) => doctor.department === selectedDepartment);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header and live status summary */}
      <View style={styles.summaryCard}>
        <View style={styles.headerInfo}>
          <Text style={styles.pageTitle}>Doctor & OPD Status</Text>
          <Text style={styles.hospitalName}>Colombo National Hospital</Text>
        </View>
        <View style={styles.summaryStats}>
          <View style={styles.summaryItem}>
            <View style={styles.greenDot} />
            <View>
              <Text style={styles.summaryNum}>{availableDoctors}</Text>
              <Text style={styles.summaryLabel}>Available</Text>
            </View>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <View style={styles.orangeDot} />
            <View>
              <Text style={styles.summaryNum}>{delayedDoctors}</Text>
              <Text style={styles.summaryLabel}>Delayed</Text>
            </View>
          </View>
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterRow}
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
      </ScrollView>

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#5B6CF8" />
        }
      >
        <Text style={styles.sectionTitle}>Today&apos;s Queues</Text>

        {filteredDoctors.length === 0 && selectedDepartment !== 'All' ? (
          <View style={styles.emptyDepartment}>
            <Text style={styles.emptyDepartmentTitle}>{selectedDepartment}</Text>
            <Text style={styles.emptyDepartmentText}>
              No doctors are assigned to this clinic wing yet. Add a doctor in Manage OPD to start its queue.
            </Text>
          </View>
        ) : null}

        {filteredDoctors.map((doctor) => {
          const queue = getQueue(doctor.id!);
          const status = queue?.status ?? 'active';
          const isActive = status === 'active';
          const isBreak = status === 'break';
          const isDelayed = status === 'delayed';
          const isUpcoming = status === 'upcoming';
          const currentToken = queue?.currentToken ?? 0;
          const nextToken = currentToken + 1;
          const nextAppointment = visibleAppointments.find(
            (appointment) =>
              appointment.date === TODAY &&
              appointment.doctorId === doctor.id &&
              appointment.tokenNumber === nextToken &&
              appointment.status !== 'cancelled' &&
              appointment.status !== 'completed'
          );
          const nextPatientName =
            nextAppointment?.patientName ??
            (queue?.nextTokenNumber === nextToken
              ? queue.nextPatientName
              : undefined);

          return (
            <View key={doctor.id} style={styles.card}>
              {/* Doctor Header */}
              <View style={styles.cardHeader}>
                <View style={styles.doctorAvatar}>
                  <Text style={styles.avatarText}>{doctor.name.charAt(0)}</Text>
                </View>
                <View style={styles.doctorInfo}>
                  <Text style={styles.doctorName}>{doctor.name}</Text>
                  <Text style={styles.doctorSub}>
                    {doctor.room} • {doctor.department}
                  </Text>
                </View>
                <View
                  style={[
                    styles.statusBadge,
                    isActive && styles.activeBadge,
                    isBreak && styles.breakBadge,
                    isDelayed && styles.delayedBadge,
                    isUpcoming && styles.upcomingBadge,
                  ]}
                >
                  <Text
                    style={[
                      styles.statusBadgeText,
                      isActive && { color: '#16A34A' },
                      isBreak && { color: '#EA580C' },
                      isDelayed && { color: '#DC2626' },
                      isUpcoming && { color: '#5B6CF8' },
                    ]}
                  >
                    {isActive ? '● Active' : isBreak ? '● Break' : isDelayed ? `● Delayed ${queue?.delayMinutes}m` : '● Upcoming'}
                  </Text>
                </View>
              </View>

              {/* Token Stats */}
              <View style={styles.tokenRow}>
                <View style={styles.tokenStat}>
                  <Text style={styles.tokenStatLabel}>Next:</Text>
                  <Text style={styles.nextTokenNumber}>Token #{String(nextToken).padStart(2, '0')}</Text>
                  {nextPatientName ? (
                    <Text style={styles.nextNameInline}>• {nextPatientName}</Text>
                  ) : null}
                </View>
                {isUpcoming ? (
                  <TouchableOpacity
                    style={styles.broadcastNavBtn}
                    onPress={() => {
                      if (onBroadcastDelay) {
                        onBroadcastDelay(doctor, showingSampleQueues);
                      } else {
                        router.push({
                          pathname: '/admin/broadcast',
                          params: {
                            doctorId: doctor.id,
                            doctorName: doctor.name,
                            isDemo: showingSampleQueues ? 'true' : 'false',
                          },
                        });
                      }
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={`Broadcast delay for ${doctor.name}`}
                  >
                    <Text style={styles.broadcastNavBtnText}>◉ Broadcast Delay</Text>
                  </TouchableOpacity>
                ) : null}
              </View>

              <View style={styles.servingRow}>
                <Text style={styles.servingLabel}>Serving</Text>
                <Text style={styles.servingNumber}>#{String(currentToken).padStart(2, '0')}</Text>
                <View style={styles.controlRow}>
                  <TouchableOpacity
                    style={[styles.controlBtn, isActive && styles.controlBtnActive]}
                    onPress={() => handleSetStatus(doctor, 'active')}
                  >
                    <Text style={[styles.controlBtnText, isActive && styles.controlBtnTextActive]}>
                      Active
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.controlBtn, isBreak && styles.controlBtnBreak]}
                    onPress={() => handleSetStatus(doctor, 'break')}
                  >
                    <Text style={[styles.controlBtnText, isBreak && styles.controlBtnBreakText]}>
                      Break
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          );
        })}

        <View style={styles.bottomSpacer} />
      </ScrollView>
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
