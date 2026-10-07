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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { subscribeAppointments, updateAppointmentStatus } from '@/services/adminService';
import type { Appointment } from '@/services/adminService';

type FilterTab = 'All' | 'Today' | 'Tomorrow' | 'Upcoming';

function groupByDate(appointments: Appointment[]): Record<string, Appointment[]> {
  return appointments.reduce(
    (acc, appt) => {
      const date = appt.date;
      if (!acc[date]) acc[date] = [];
      acc[date].push(appt);
      return acc;
    },
    {} as Record<string, Appointment[]>
  );
}

function formatDisplayDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
  });
}

function getTodayStr() {
  return new Date().toISOString().split('T')[0];
}

function getTomorrowStr() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split('T')[0];
}

function getRelativeLabel(dateStr: string): string {
  const today = getTodayStr();
  const tomorrow = getTomorrowStr();
  if (dateStr === today) return 'Today';
  if (dateStr === tomorrow) return 'Tomorrow';
  const diff = Math.ceil(
    (new Date(dateStr).getTime() - new Date(today).getTime()) / (1000 * 60 * 60 * 24)
  );
  return `In ${diff} Days`;
}

const STATUS_COLOR: Record<string, { bg: string; text: string }> = {
  upcoming: { bg: '#FFF3E8', text: '#EA580C' },
  completed: { bg: '#DCFCE7', text: '#16A34A' },
  cancelled: { bg: '#FEE2E2', text: '#DC2626' },
};

const STATUS_LABEL: Record<string, string> = {
  upcoming: 'Pending Arrival',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

export default function AppointmentManagement() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<FilterTab>('All');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const unsub = subscribeAppointments((data) => {
      setAppointments(data);
      setLoading(false);
    });
    return unsub;
  }, []);

  const filtered = appointments.filter((a) => {
    const today = getTodayStr();
    const tomorrow = getTomorrowStr();
    const matchSearch =
      search.trim() === '' ||
      a.patientName.toLowerCase().includes(search.toLowerCase()) ||
      a.doctorName.toLowerCase().includes(search.toLowerCase()) ||
      String(a.tokenNumber).includes(search);

    if (!matchSearch) return false;
    if (tab === 'Today') return a.date === today;
    if (tab === 'Tomorrow') return a.date === tomorrow;
    if (tab === 'Upcoming') return a.date > tomorrow;
    return true;
  });

  const grouped = groupByDate(filtered);
  const sortedDates = Object.keys(grouped).sort();

  // Count tabs
  const todayCount = appointments.filter((a) => a.date === getTodayStr()).length;
  const tomorrowCount = appointments.filter((a) => a.date === getTomorrowStr()).length;
  const upcomingCount = appointments.filter((a) => a.date > getTomorrowStr()).length;

  const arrivedCount = appointments.filter(
    (a) => a.date === getTodayStr() && a.status === 'completed'
  ).length;
  const scheduledCount = appointments.filter((a) => a.date === getTodayStr()).length;
  const completedCount = appointments.filter(
    (a) => a.date === getTodayStr() && a.status === 'completed'
  ).length;

  const handleUpdateStatus = async (id: string, status: Appointment['status']) => {
    try {
      await updateAppointmentStatus(id, status);
    } catch (e) {
      console.error(e);
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
            ['All', appointments.length],
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
              const sc = STATUS_COLOR[appt.status] ?? STATUS_COLOR.upcoming;
              return (
                <TouchableOpacity
                  key={appt.id}
                  style={styles.apptCard}
                  onPress={() =>
                    router.push('/admin/appointments')
                  }
                  activeOpacity={0.85}
                >
                  {/* Token & Status Row */}
                  <View style={styles.apptTopRow}>
                    <View style={styles.tokenBadge}>
                      <Text style={styles.tokenText}>#{appt.tokenNumber}</Text>
                    </View>
                    <View style={[styles.statusChip, { backgroundColor: sc.bg }]}>
                      <Text style={[styles.statusChipText, { color: sc.text }]}>
                        {appt.status === 'completed' ? '✓ Arrived' : STATUS_LABEL[appt.status]}
                      </Text>
                    </View>
                    <View style={styles.apptTimeWrap}>
                      <Text style={styles.apptTime}>{appt.time}</Text>
                      {appt.endTime && (
                        <Text style={styles.apptTimeEnd}>- {appt.endTime}</Text>
                      )}
                    </View>
                    <Text style={styles.chevron}>›</Text>
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
                    {appt.waitingInfo && (
                      <Text style={styles.waitingInfo}>{appt.waitingInfo}</Text>
                    )}
                  </View>

                  {/* Quick Actions */}
                  {appt.status === 'upcoming' && (
                    <View style={styles.quickActions}>
                      <TouchableOpacity
                        style={styles.markArrivedBtn}
                        onPress={() => handleUpdateStatus(appt.id!, 'completed')}
                      >
                        <Text style={styles.markArrivedText}>✓ Mark Arrived</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.cancelBtn}
                        onPress={() => handleUpdateStatus(appt.id!, 'cancelled')}
                      >
                        <Text style={styles.cancelBtnText}>Cancel</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </TouchableOpacity>
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
  safe: { flex: 1, backgroundColor: '#F5F6FA' },
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
    marginBottom: 8,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  searchIcon: { fontSize: 16, marginRight: 8 },
  searchInput: { flex: 1, fontSize: 14, color: '#1A1D2E' },

  summaryRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    gap: 4,
  },
  pillDot: { width: 7, height: 7, borderRadius: 4 },
  pillText: { fontSize: 11, fontWeight: '600' },

  tabRow: { marginBottom: 4 },
  tabContent: { paddingHorizontal: 16, gap: 8 },
  tabChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  tabChipActive: { backgroundColor: '#5B6CF8', borderColor: '#5B6CF8' },
  tabText: { fontSize: 13, color: '#6B7280', fontWeight: '500' },
  tabTextActive: { color: '#fff' },

  scroll: { flex: 1 },

  dateGroup: { marginBottom: 4 },
  dateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 6,
  },
  dateIcon: { fontSize: 14 },
  dateLabel: { fontSize: 15, fontWeight: '700', color: '#1A1D2E', flex: 1 },
  dateBadge: {
    backgroundColor: '#EEF2FF',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  dateBadgeText: { fontSize: 11, color: '#5B6CF8', fontWeight: '600' },

  apptCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: 14,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  apptTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  tokenBadge: {
    backgroundColor: '#EEF2FF',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  tokenText: { fontSize: 12, fontWeight: '700', color: '#5B6CF8' },
  statusChip: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  statusChipText: { fontSize: 11, fontWeight: '600' },
  apptTimeWrap: { flex: 1, alignItems: 'flex-end' },
  apptTime: { fontSize: 12, fontWeight: '700', color: '#1A1D2E' },
  apptTimeEnd: { fontSize: 11, color: '#8B90A7' },
  chevron: { fontSize: 20, color: '#C4C9D4' },

  bookingType: { fontSize: 11, color: '#8B90A7', marginBottom: 4 },
  patientName: { fontSize: 15, fontWeight: '700', color: '#1A1D2E' },
  patientPhone: { fontSize: 12, color: '#6B7280', marginBottom: 6 },

  apptBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 4,
  },
  apptDeptDoc: { fontSize: 12, color: '#5B6CF8', fontWeight: '500' },
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
