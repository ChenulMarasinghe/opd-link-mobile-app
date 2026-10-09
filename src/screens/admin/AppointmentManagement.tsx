import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  subscribeDemoAppointments,
  subscribeDemoQueues,
  subscribeAppointments,
  subscribeDoctors,
  subscribeQueues,
  updateAppointmentStatus,
  updateDemoAppointmentStatus,
} from '@/services/adminService';
import type { Appointment, Doctor, Queue } from '@/services/adminService';
import { getTodayDateString } from '@/services/mockData';

type FilterTab = 'All' | 'Today' | 'Tomorrow' | 'Upcoming';
type AppointmentDisplayStatus = Appointment['status'] | 'unknown';

function groupByDate(appointments: Appointment[]): Record<string, Appointment[]> {
  const grouped = appointments.reduce(
    (acc, appt) => {
      const date = appt.date;
      if (!acc[date]) acc[date] = [];
      acc[date].push(appt);
      return acc;
    },
    {} as Record<string, Appointment[]>
  );
  Object.values(grouped).forEach((items) => {
    items.sort((a, b) => a.tokenNumber - b.tokenNumber);
  });
  return grouped;
}

function formatDisplayDate(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00`);
  return d.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
  });
}

function getTodayStr() {
  return getTodayDateString();
}

function getTomorrowStr() {
  return getTodayDateString(1);
}

function getRelativeLabel(dateStr: string): string {
  const today = getTodayStr();
  const tomorrow = getTomorrowStr();
  if (dateStr === today) return 'Today';
  if (dateStr === tomorrow) return 'Tomorrow';
  const diff = Math.round(
    (new Date(`${dateStr}T00:00:00`).getTime() -
      new Date(`${today}T00:00:00`).getTime()) /
      (1000 * 60 * 60 * 24)
  );
  return `In ${diff} Days`;
}

const STATUS_COLOR: Record<AppointmentDisplayStatus, { bg: string; text: string }> = {
  upcoming: { bg: '#FFF2CC', text: '#9A4B00' },
  arrived: { bg: '#D1FAE5', text: '#047857' },
  completed: { bg: '#E8EAFB', text: '#525B8E' },
  cancelled: { bg: '#FEE2E2', text: '#B91C1C' },
  unknown: { bg: '#F3F4F6', text: '#4B5563' },
};

const STATUS_LABEL: Record<AppointmentDisplayStatus, string> = {
  upcoming: 'Pending Arrival',
  arrived: 'Arrived',
  completed: 'Completed',
  cancelled: 'Cancelled',
  unknown: 'Needs review',
};

export default function AppointmentManagement() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [demoAppointments, setDemoAppointments] = useState<Appointment[]>([]);
  const [queues, setQueues] = useState<Queue[]>([]);
  const [demoQueues, setDemoQueues] = useState<Queue[]>([]);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<FilterTab>('All');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const unsub = subscribeAppointments((data) => {
      setAppointments(data);
      setLoading(false);
    });
    const unsubDoctors = subscribeDoctors(setDoctors);
    const unsubDemoAppointments = subscribeDemoAppointments(setDemoAppointments);
    const unsubQueues = subscribeQueues(getTodayStr(), setQueues);
    const unsubDemoQueues = subscribeDemoQueues(setDemoQueues);
    return () => {
      unsub();
      unsubDoctors();
      unsubDemoAppointments();
      unsubQueues();
      unsubDemoQueues();
    };
  }, []);

  const showingDemoAppointments = doctors.length === 0;
  const visibleAppointments = showingDemoAppointments ? demoAppointments : appointments;
  const visibleQueues = showingDemoAppointments ? demoQueues : queues;
  const getStatus = (appointment: Appointment): AppointmentDisplayStatus => {
    if (!Object.hasOwn(STATUS_COLOR, appointment.status)) return 'unknown';
    if (appointment.status === 'cancelled') return 'cancelled';
    const queue = visibleQueues.find((item) => item.doctorId === appointment.doctorId);
    if (
      appointment.date === getTodayStr() &&
      queue &&
      appointment.tokenNumber <= queue.currentToken
    ) {
      return 'completed';
    }
    return appointment.status;
  };

  const filtered = visibleAppointments.filter((a) => {
    const today = getTodayStr();
    const tomorrow = getTomorrowStr();
    const searchLower = search.trim().toLowerCase();
    const matchSearch =
      searchLower === '' ||
      (a.patientName?.toLowerCase() ?? '').includes(searchLower) ||
      (a.doctorName?.toLowerCase() ?? '').includes(searchLower) ||
      (a.department?.toLowerCase() ?? '').includes(searchLower) ||
      (a.patientPhone ?? '').includes(searchLower) ||
      (a.patientCode?.toLowerCase() ?? '').includes(searchLower) ||
      String(a.tokenNumber ?? '').includes(searchLower);

    if (!matchSearch) return false;
    if (tab === 'Today') return a.date === today;
    if (tab === 'Tomorrow') return a.date === tomorrow;
    if (tab === 'Upcoming') return a.date > tomorrow;
    return true;
  });

  const grouped = groupByDate(filtered);
  const sortedDates = Object.keys(grouped).sort();

  // Count tabs
  const todayCount = visibleAppointments.filter((a) => a.date === getTodayStr()).length;
  const tomorrowCount = visibleAppointments.filter((a) => a.date === getTomorrowStr()).length;
  const upcomingCount = visibleAppointments.filter((a) => a.date > getTomorrowStr()).length;

  const todayAppointments = visibleAppointments.filter(
    (appointment) => appointment.date === getTodayStr()
  );
  const arrivedCount = todayAppointments.filter((appointment) => getStatus(appointment) === 'arrived').length;
  const scheduledCount = todayAppointments.filter((appointment) => getStatus(appointment) === 'upcoming').length;
  const completedCount = todayAppointments.filter((appointment) => getStatus(appointment) === 'completed').length;

  const handleUpdateStatus = async (id: string, status: Appointment['status']) => {
    if (showingDemoAppointments) {
      updateDemoAppointmentStatus(id, status);
      return;
    }

    try {
      await updateAppointmentStatus(id, status);
    } catch (e) {
      console.error(e);
      Alert.alert('Update failed', 'Could not update this appointment. Please try again.');
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

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Search */}
      <View style={styles.searchBar}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Search patient, doctor..."
          placeholderTextColor="#B0B4BA"
          value={search}
          onChangeText={setSearch}
        />
      </View>
      {/* Summary Pills */}
      <View style={styles.summaryRow}>
        <View style={[styles.pill, { backgroundColor: '#EAF7EE' }]}>
          <View style={[styles.pillDot, { backgroundColor: '#22C55E' }]} />
          <Text style={[styles.pillText, { color: '#16A34A' }]}>
            {arrivedCount} Arrived
          </Text>
        </View>
        <View style={[styles.pill, { backgroundColor: '#EEF2FF' }]}>
          <View style={[styles.pillDot, { backgroundColor: '#5B6CF8' }]} />
          <Text style={[styles.pillText, { color: '#5B6CF8' }]}>
            {scheduledCount} Scheduled
          </Text>
        </View>
        <View style={[styles.pill, { backgroundColor: '#F5F5F5' }]}>
          <View style={[styles.pillDot, { backgroundColor: '#9CA3AF' }]} />
          <Text style={[styles.pillText, { color: '#6B7280' }]}>
            {completedCount} Completed
          </Text>
        </View>
      </View>

      {/* Tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabRow}
        contentContainerStyle={styles.tabContent}
      >
        {(
          [
            ['All', visibleAppointments.length],
            ['Today', todayCount],
            ['Tomorrow', tomorrowCount],
            ['Upcoming', upcomingCount],
          ] as [FilterTab, number][]
        ).map(([label, count]) => (
          <TouchableOpacity
            key={label}
            style={[styles.tabChip, tab === label && styles.tabChipActive]}
            onPress={() => setTab(label)}
          >
            <Text style={[styles.tabText, tab === label && styles.tabTextActive]}>
              {label} ({count})
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Appointment List */}
      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#5B6CF8" />
        }
      >
        {sortedDates.map((date) => (
          <View key={date} style={styles.dateGroup}>
            {/* Date Header */}
            <View style={styles.dateHeader}>
              <Text style={styles.dateIcon}>📅</Text>
              <Text style={styles.dateLabel}>{formatDisplayDate(date)}</Text>
              <View style={styles.dateBadge}>
                <Text style={styles.dateBadgeText}>
                  {getRelativeLabel(date)} • {grouped[date].length} Bookings
                </Text>
              </View>
            </View>

            {/* Cards */}
            {grouped[date].map((appt) => {
              const status = getStatus(appt);
              const sc = STATUS_COLOR[status];
              const appointmentQueue = visibleQueues.find(
                (queue) => queue.doctorId === appt.doctorId
              );
              const canComplete =
                appt.tokenNumber <= (appointmentQueue?.currentToken ?? 0) + 1;
              return (
                <View
                  key={appt.id}
                  style={styles.apptCard}
                >
                  {/* Token & Status Row */}
                  <View style={styles.apptTopRow}>
                    <View style={styles.tokenBadge}>
                      <Text style={styles.tokenText}>#{appt.tokenNumber}</Text>
                    </View>
                    <View style={[styles.statusChip, { backgroundColor: sc.bg }]}>
                      <Text style={[styles.statusChipText, { color: sc.text }]}>
                        {status === 'arrived' ? '✓ ' : status === 'completed' ? '✓ ' : ''}
                        {STATUS_LABEL[status]}
                      </Text>
                    </View>
                    <View style={styles.apptTimeWrap}>
                      <Text style={styles.apptTime}>{appt.time}</Text>
                      {appt.endTime && (
                        <Text style={styles.apptTimeEnd}>- {appt.endTime}</Text>
                      )}
                    </View>
                  </View>

                  {/* Booking Type */}
                  <Text style={styles.bookingType}>{appt.bookingType}</Text>

                  {/* Patient Info */}
                  <Text style={styles.patientName}>{appt.patientName}</Text>
                  <Text style={styles.patientPhone}>{appt.patientPhone}</Text>

                  {/* Bottom Row */}
                  <View style={styles.apptBottomRow}>
                    <Text style={styles.apptDeptDoc}>
                      {appt.department} • {appt.doctorName}
                    </Text>
                    <Text style={styles.patientCode}>{appt.patientCode}</Text>
                  </View>
                  {appt.waitingInfo && (
                    <Text style={styles.waitingInfo}>{appt.waitingInfo}</Text>
                  )}

                  {/* Quick Actions */}
                  {status === 'upcoming' && (
                    <View style={styles.quickActions}>
                      {appt.date === getTodayStr() && (
                        <TouchableOpacity
                          style={styles.markArrivedBtn}
                          onPress={() => handleUpdateStatus(appt.id!, 'arrived')}
                        >
                          <Text style={styles.markArrivedText}>✓ Mark Arrived</Text>
                        </TouchableOpacity>
                      )}
                      <TouchableOpacity
                        style={styles.cancelBtn}
                        onPress={() => handleUpdateStatus(appt.id!, 'cancelled')}
                      >
                        <Text style={styles.cancelBtnText}>Cancel</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                  {appt.date === getTodayStr() && status === 'arrived' && (
                    <View style={styles.quickActions}>
                      {canComplete && (
                        <TouchableOpacity
                          style={styles.markArrivedBtn}
                          onPress={() => handleUpdateStatus(appt.id!, 'completed')}
                        >
                          <Text style={styles.markArrivedText}>✓ Mark Completed</Text>
                        </TouchableOpacity>
                      )}
                      <TouchableOpacity
                        style={styles.cancelBtn}
                        onPress={() => handleUpdateStatus(appt.id!, 'cancelled')}
                      >
                        <Text style={styles.cancelBtnText}>Cancel</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        ))}

        {sortedDates.length === 0 && (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>📋</Text>
            <Text style={styles.emptyText}>No appointments found</Text>
          </View>
        )}

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

  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    margin: 16,
    marginBottom: 10,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#EAECF8',
  },
  searchIcon: { fontSize: 16, marginRight: 8 },
  searchInput: { flex: 1, fontSize: 14, color: '#1A1D2E' },
  summaryRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    gap: 4,
    flex: 1,
    justifyContent: 'center',
  },
  pillDot: { width: 7, height: 7, borderRadius: 4 },
  pillText: { fontSize: 11, fontWeight: '700' },

  tabRow: { marginBottom: 8, maxHeight: 44 },
  tabContent: { paddingHorizontal: 16, gap: 8, alignItems: 'center' },
  tabChip: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 20,
    backgroundColor: '#F0F1FA',
    borderWidth: 1,
    borderColor: '#F0F1FA',
  },
  tabChipActive: { backgroundColor: '#5B6CF8', borderColor: '#5B6CF8' },
  tabText: { fontSize: 12, color: '#555C70', fontWeight: '600' },
  tabTextActive: { color: '#fff' },

  scroll: { flex: 1 },

  dateGroup: { marginBottom: 4 },
  dateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  dateIcon: { fontSize: 15, color: '#5266D5' },
  dateLabel: { fontSize: 14, fontWeight: '700', color: '#22283A', flex: 1 },
  dateBadge: {
    backgroundColor: '#E8EBFF',
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  dateBadgeText: { fontSize: 10, color: '#4558C7', fontWeight: '700' },

  apptCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#EAECF8',
  },
  apptTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  tokenBadge: {
    backgroundColor: '#E8EEFF',
    borderRadius: 14,
    paddingHorizontal: 11,
    paddingVertical: 6,
  },
  tokenText: { fontSize: 13, fontWeight: '800', color: '#2056CC' },
  statusChip: {
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  statusChipText: { fontSize: 11, fontWeight: '700' },
  apptTimeWrap: { flex: 1, alignItems: 'flex-end' },
  apptTime: { fontSize: 12, fontWeight: '700', color: '#252B3D' },
  apptTimeEnd: { fontSize: 11, color: '#697386' },
  chevron: { fontSize: 20, color: '#C4C9D4' },

  bookingType: {
    alignSelf: 'flex-start',
    backgroundColor: '#EFF0FF',
    color: '#4A5280',
    fontSize: 10,
    overflow: 'hidden',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
    marginBottom: 8,
  },
  patientName: { fontSize: 17, fontWeight: '700', color: '#1D2435' },
  patientPhone: { fontSize: 12, color: '#788094', marginTop: 2, marginBottom: 10 },

  apptBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 4,
    borderTopWidth: 1,
    borderTopColor: '#EFF1F7',
    paddingTop: 10,
  },
  apptDeptDoc: { fontSize: 12, color: '#343B50', fontWeight: '600', flex: 1 },
  patientCode: { fontSize: 11, color: '#9CA3AF' },
  waitingInfo: { fontSize: 11, color: '#F97316', fontWeight: '500' },

  quickActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F0F1F5',
    paddingTop: 10,
  },
  markArrivedBtn: {
    flex: 1,
    backgroundColor: '#5B6CF8',
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
  },
  markArrivedText: { fontSize: 13, color: '#fff', fontWeight: '600' },
  cancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  cancelBtnText: { fontSize: 13, color: '#DC2626', fontWeight: '600' },

  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 80,
    gap: 10,
  },
  emptyIcon: { fontSize: 48 },
  emptyText: { fontSize: 16, color: '#9CA3AF', fontWeight: '500' },

  bottomSpacer: { height: 100 },
});
