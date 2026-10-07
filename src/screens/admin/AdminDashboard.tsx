import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { subscribeDoctors, subscribeQueues, updateQueueStatus } from '@/services/adminService';
import type { Doctor, Queue } from '@/services/adminService';

const DEPARTMENTS = ['All', 'General OPD', 'Cardiology', 'Dental', 'ENT', 'Orthopedics'];

const TODAY = new Date().toISOString().split('T')[0];

function todayStr() {
  return TODAY;
}

export default function AdminDashboard() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [queues, setQueues] = useState<Queue[]>([]);
  const [selectedDept, setSelectedDept] = useState('All');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const unsubDoctors = subscribeDoctors((docs) => {
      setDoctors(docs);
      setLoading(false);
    });
    const unsubQueues = subscribeQueues(todayStr(), setQueues);
    return () => {
      unsubDoctors();
      unsubQueues();
    };
  }, []);

  const getQueueForDoctor = (doctorId: string): Queue | undefined =>
    queues.find((q) => q.doctorId === doctorId);

  const filteredDoctors =
    selectedDept === 'All'
      ? doctors
      : doctors.filter((d) => d.department === selectedDept);

  const availableCount = doctors.filter((d) => {
    const q = getQueueForDoctor(d.id!);
    return !q || q.status !== 'delayed';
  }).length;

  const delayedCount = doctors.filter((d) => {
    const q = getQueueForDoctor(d.id!);
    return q?.status === 'delayed';
  }).length;

  const handleStatusToggle = async (
    doctor: Doctor,
    newStatus: Queue['status']
  ) => {
    try {
      await updateQueueStatus(doctor.id!, todayStr(), newStatus);
    } catch (e) {
      console.error('Failed to update queue status', e);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
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
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerBrand}>OPDLink</Text>
          <Text style={styles.headerTitle}>OPD LINK ADMIN • DOCTORS & QUEUES</Text>
        </View>
        <View style={styles.headerRight}>
          <View style={styles.notifDot} />
          <View style={styles.avatar} />
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#5B6CF8" />
        }
      >
        {/* Status Card */}
        <View style={styles.statusCard}>
          <View>
            <Text style={styles.statusTitle}>Doctor & OPD{'\n'}Status</Text>
            <Text style={styles.hospital}>Colombo National{'\n'}Hospital</Text>
          </View>
          <View style={styles.statusBadges}>
            <View style={styles.availableBadge}>
              <View style={styles.greenDot} />
              <Text style={styles.availableText}>{availableCount}</Text>
              <Text style={styles.badgeLabel}>Available</Text>
            </View>
            <View style={styles.delayedBadge}>
              <View style={styles.orangeDot} />
              <Text style={styles.delayedText}>{delayedCount}</Text>
              <Text style={styles.delayedLabel}>Delayed</Text>
            </View>
          </View>
        </View>

        {/* Department Filter */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterRow}
          contentContainerStyle={styles.filterContent}
        >
          {DEPARTMENTS.map((dept) => (
            <TouchableOpacity
              key={dept}
              style={[
                styles.filterChip,
                selectedDept === dept && styles.filterChipActive,
              ]}
              onPress={() => setSelectedDept(dept)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  selectedDept === dept && styles.filterChipTextActive,
                ]}
              >
                {dept}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Doctor Cards */}
        <View style={styles.doctorList}>
          {filteredDoctors.map((doctor) => {
            const queue = getQueueForDoctor(doctor.id!);
            const status = queue?.status ?? 'active';
            const isDelayed = status === 'delayed';
            const isOnBreak = status === 'break';
            const isUpcoming = status === 'upcoming';

            return (
              <View key={doctor.id} style={styles.doctorCard}>
                {/* Top Row */}
                <View style={styles.doctorTop}>
                  <View style={styles.doctorAvatarWrap}>
                    <View style={styles.doctorAvatar}>
                      <Text style={styles.doctorAvatarText}>
                        {doctor.name.charAt(0)}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.doctorInfo}>
                    <Text style={styles.doctorName}>{doctor.name}</Text>
                    <Text style={styles.doctorSub}>
                      Room {doctor.room} • {doctor.department}
                    </Text>
                  </View>
                  {isDelayed ? (
                    <View style={styles.delayedChip}>
                      <View style={styles.orangeDotSmall} />
                      <Text style={styles.delayedChipText}>
                        Delayed {queue?.delayMinutes ?? 0}m
                      </Text>
                    </View>
                  ) : isUpcoming ? (
                    <View style={styles.upcomingChip}>
                      <View style={styles.blueDotSmall} />
                      <Text style={styles.upcomingChipText}>Upcoming</Text>
                    </View>
                  ) : (
                    <View style={styles.onTimeChip}>
                      <View style={styles.greenDotSmall} />
                      <Text style={styles.onTimeChipText}>On Time</Text>
                    </View>
                  )}
                </View>

                {/* Next Token Row */}
                {queue?.nextTokenNumber != null ? (
                  <View style={styles.nextRow}>
                    <Text style={styles.nextLabel}>Next: </Text>
                    <Text style={styles.nextToken}>
                      Token #{String(queue.nextTokenNumber).padStart(2, '0')}
                    </Text>
                    <Text style={styles.nextName}>
                      • {queue.nextPatientName ?? '—'}
                    </Text>
                    <TouchableOpacity style={styles.callBtn}>
                      <Text style={styles.callBtnText}>🔊 Call</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.clockBtn}>
                      <Text style={styles.clockBtnText}>🕐</Text>
                    </TouchableOpacity>
                  </View>
                ) : null}

                {/* Broadcast Delay (when upcoming) */}
                {isUpcoming && (
                  <TouchableOpacity
                    style={styles.broadcastBtn}
                    onPress={() =>
                      router.push({
                        pathname: '/admin/broadcast',
                        params: { doctorId: doctor.id, doctorName: doctor.name },
                      })
                    }
                  >
                    <Text style={styles.broadcastBtnText}>
                      📢 Broadcast Delay →
                    </Text>
                  </TouchableOpacity>
                )}

                {/* Serving Row */}
                <View style={styles.servingRow}>
                  <Text style={styles.servingLabel}>Serving </Text>
                  <Text style={styles.servingToken}>
                    #{String(queue?.currentToken ?? 0).padStart(2, '0')}
                  </Text>
                  <TouchableOpacity
                    style={[
                      styles.actionBtn,
                      !isOnBreak && !isUpcoming && styles.actionBtnActive,
                    ]}
                    onPress={() => handleStatusToggle(doctor, 'active')}
                  >
                    <Text
                      style={[
                        styles.actionBtnText,
                        !isOnBreak && !isUpcoming && styles.actionBtnTextActive,
                      ]}
                    >
                      Active
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionBtn, isOnBreak && styles.actionBtnBreak]}
                    onPress={() => handleStatusToggle(doctor, 'break')}
                  >
                    <Text
                      style={[
                        styles.actionBtnText,
                        isOnBreak && styles.actionBtnTextActive,
                      ]}
                    >
                      Break
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.delayBtn, isDelayed && styles.delayBtnActive]}
                    onPress={() =>
                      router.push({
                        pathname: '/admin/broadcast',
                        params: { doctorId: doctor.id, doctorName: doctor.name },
                      })
                    }
                  >
                    <Text style={styles.delayBtnText}>+10m{'\n'}Delay</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </View>

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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#EAEDF3',
  },
  headerLeft: { flex: 1 },
  headerBrand: { fontSize: 14, fontWeight: '700', color: '#5B6CF8' },
  headerTitle: { fontSize: 10, color: '#8B90A7', marginTop: 1 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  notifDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F0F1FA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#D1D5F8',
  },

  scroll: { flex: 1 },

  // Status Card
  statusCard: {
    margin: 16,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  statusTitle: { fontSize: 16, fontWeight: '700', color: '#1A1D2E', lineHeight: 22 },
  hospital: { fontSize: 12, color: '#8B90A7', marginTop: 4, lineHeight: 18 },
  statusBadges: { flexDirection: 'row', gap: 10 },
  availableBadge: {
    backgroundColor: '#EAF7EE',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
  },
  greenDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#22C55E' },
  availableText: { fontSize: 14, fontWeight: '700', color: '#16A34A' },
  badgeLabel: { fontSize: 11, color: '#22C55E', fontWeight: '500' },
  delayedBadge: {
    backgroundColor: '#FFF3E8',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
  },
  orangeDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#F97316' },
  delayedText: { fontSize: 14, fontWeight: '700', color: '#EA580C' },
  delayedLabel: { fontSize: 11, color: '#F97316', fontWeight: '500' },

  // Filters
  filterRow: { marginBottom: 4 },
  filterContent: { paddingHorizontal: 16, gap: 8 },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  filterChipActive: {
    backgroundColor: '#5B6CF8',
    borderColor: '#5B6CF8',
  },
  filterChipText: { fontSize: 13, color: '#6B7280', fontWeight: '500' },
  filterChipTextActive: { color: '#fff' },

  // Doctor List
  doctorList: { paddingHorizontal: 16, gap: 12, marginTop: 12 },

  doctorCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    gap: 10,
  },

  doctorTop: { flexDirection: 'row', alignItems: 'center' },
  doctorAvatarWrap: { marginRight: 10 },
  doctorAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E0E4FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  doctorAvatarText: { fontSize: 18, fontWeight: '700', color: '#5B6CF8' },
  doctorInfo: { flex: 1 },
  doctorName: { fontSize: 15, fontWeight: '700', color: '#1A1D2E' },
  doctorSub: { fontSize: 12, color: '#8B90A7', marginTop: 2 },

  onTimeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EAF7EE',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  greenDotSmall: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#22C55E' },
  onTimeChipText: { fontSize: 11, color: '#16A34A', fontWeight: '600' },

  delayedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E8',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  orangeDotSmall: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#F97316' },
  delayedChipText: { fontSize: 11, color: '#EA580C', fontWeight: '600' },

  upcomingChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  blueDotSmall: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#5B6CF8' },
  upcomingChipText: { fontSize: 11, color: '#5B6CF8', fontWeight: '600' },

  nextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F6FA',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
    gap: 4,
  },
  nextLabel: { fontSize: 12, color: '#8B90A7' },
  nextToken: { fontSize: 12, fontWeight: '700', color: '#5B6CF8' },
  nextName: { fontSize: 12, color: '#4B5563', flex: 1 },
  callBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#EEF2FF',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  callBtnText: { fontSize: 11, color: '#5B6CF8', fontWeight: '600' },
  clockBtn: { padding: 4 },
  clockBtnText: { fontSize: 14 },

  broadcastBtn: {
    backgroundColor: '#EEF2FF',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  broadcastBtnText: { fontSize: 13, color: '#5B6CF8', fontWeight: '600' },

  servingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: '#F0F1F5',
    paddingTop: 10,
  },
  servingLabel: { fontSize: 13, color: '#8B90A7' },
  servingToken: { fontSize: 20, fontWeight: '800', color: '#1A1D2E', flex: 1 },

  actionBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#F5F6FA',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  actionBtnActive: {
    backgroundColor: '#EEF2FF',
    borderColor: '#5B6CF8',
  },
  actionBtnBreak: {
    backgroundColor: '#FFF3E8',
    borderColor: '#F97316',
  },
  actionBtnText: { fontSize: 12, color: '#6B7280', fontWeight: '600' },
  actionBtnTextActive: { color: '#5B6CF8' },

  delayBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: '#FFF3E8',
    borderWidth: 1,
    borderColor: '#FED7AA',
    alignItems: 'center',
  },
  delayBtnActive: { backgroundColor: '#F97316', borderColor: '#F97316' },
  delayBtnText: { fontSize: 10, color: '#EA580C', fontWeight: '700', textAlign: 'center' },

  bottomSpacer: { height: 100 },
});
