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
  subscribeDoctors,
  subscribeQueues,
  updateQueueStatus,
  broadcastDelay,
} from '@/services/adminService';
import type { Doctor, Queue } from '@/services/adminService';

const TODAY = new Date().toISOString().split('T')[0];

const DELAY_OPTIONS = [5, 10, 15, 20, 30];

export default function QueueManagement() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [queues, setQueues] = useState<Queue[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const unsubDoctors = subscribeDoctors((docs) => {
      setDoctors(docs);
      setLoading(false);
    });
    const unsubQueues = subscribeQueues(TODAY, setQueues);
    return () => {
      unsubDoctors();
      unsubQueues();
    };
  }, []);

  const getQueue = (doctorId: string): Queue | undefined =>
    queues.find((q) => q.doctorId === doctorId);

  const handleSetStatus = async (doctor: Doctor, status: Queue['status']) => {
    try {
      await updateQueueStatus(doctor.id!, TODAY, status);
    } catch (e) {
      Alert.alert('Error', 'Failed to update status');
    }
  };

  const handleQuickDelay = async (doctor: Doctor, minutes: number) => {
    try {
      await updateQueueStatus(doctor.id!, TODAY, 'delayed', minutes);
      await broadcastDelay({
        doctorId: doctor.id!,
        doctorName: doctor.name,
        message: `${doctor.name} session is delayed by ${minutes} minutes. We apologize for the inconvenience.`,
        minutes,
      });
      Alert.alert(
        'Delay Broadcast Sent',
        `+${minutes}m delay has been set and broadcast for ${doctor.name}`
      );
    } catch (e) {
      Alert.alert('Error', 'Failed to broadcast delay');
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

  const activeDoctors = doctors.filter((d) => {
    const q = getQueue(d.id!);
    return !q || q.status === 'active';
  }).length;

  const delayedDoctors = doctors.filter((d) => {
    const q = getQueue(d.id!);
    return q?.status === 'delayed';
  }).length;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.pageHeader}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.pageTitle}>Queue Management</Text>
      </View>

      {/* Summary */}
      <View style={styles.summaryCard}>
        <View style={styles.summaryItem}>
          <View style={styles.greenDot} />
          <Text style={styles.summaryNum}>{activeDoctors}</Text>
          <Text style={styles.summaryLabel}>Active</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <View style={styles.orangeDot} />
          <Text style={styles.summaryNum}>{delayedDoctors}</Text>
          <Text style={styles.summaryLabel}>Delayed</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryNum}>{doctors.length}</Text>
          <Text style={styles.summaryLabel}>Total Doctors</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#5B6CF8" />
        }
      >
        <Text style={styles.sectionTitle}>Today's Queues</Text>

        {doctors.map((doctor) => {
          const queue = getQueue(doctor.id!);
          const status = queue?.status ?? 'active';
          const isActive = status === 'active';
          const isBreak = status === 'break';
          const isDelayed = status === 'delayed';
          const isUpcoming = status === 'upcoming';

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
                    Room {doctor.room} • {doctor.department}
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
                  <Text style={styles.tokenStatNum}>
                    {String(queue?.currentToken ?? 0).padStart(2, '0')}
                  </Text>
                  <Text style={styles.tokenStatLabel}>Current</Text>
                </View>
                <View style={styles.tokenDivider} />
                <View style={styles.tokenStat}>
                  <Text style={styles.tokenStatNum}>
                    {queue?.nextTokenNumber != null
                      ? String(queue.nextTokenNumber).padStart(2, '0')
                      : '--'}
                  </Text>
                  <Text style={styles.tokenStatLabel}>Next</Text>
                </View>
                <View style={styles.tokenDivider} />
                <View style={styles.tokenStat}>
                  <Text style={styles.tokenStatNum}>{doctor.maxTokens}</Text>
                  <Text style={styles.tokenStatLabel}>Max</Text>
                </View>
              </View>

              {queue?.nextPatientName && (
                <View style={styles.nextPatientRow}>
                  <Text style={styles.nextLabel}>Next Patient: </Text>
                  <Text style={styles.nextName}>{queue.nextPatientName}</Text>
                  <TouchableOpacity style={styles.callBtn}>
                    <Text style={styles.callBtnText}>🔊 Call</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Status Controls */}
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
                  <Text style={[styles.controlBtnText, isBreak && { color: '#EA580C' }]}>
                    Break
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.broadcastNavBtn}
                  onPress={() =>
                    router.push({
                      pathname: '/admin/broadcast',
                      params: { doctorId: doctor.id, doctorName: doctor.name },
                    })
                  }
                >
                  <Text style={styles.broadcastNavBtnText}>📢 Broadcast Delay</Text>
                </TouchableOpacity>
              </View>

              {/* Quick Delay Buttons */}
              <View style={styles.quickDelayRow}>
                <Text style={styles.quickDelayLabel}>Quick Delay:</Text>
                {DELAY_OPTIONS.map((min) => (
                  <TouchableOpacity
                    key={min}
                    style={[
                      styles.quickDelayBtn,
                      isDelayed &&
                        queue?.delayMinutes === min &&
                        styles.quickDelayBtnActive,
                    ]}
                    onPress={() => handleQuickDelay(doctor, min)}
                  >
                    <Text
                      style={[
                        styles.quickDelayBtnText,
                        isDelayed &&
                          queue?.delayMinutes === min &&
                          styles.quickDelayBtnTextActive,
                      ]}
                    >
                      +{min}m
                    </Text>
                  </TouchableOpacity>
                ))}
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
  safe: { flex: 1, backgroundColor: '#F5F6FA' },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F6FA',
  },

  pageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#EAEDF3',
    gap: 12,
  },
  backBtn: { padding: 4 },
  backText: { fontSize: 16, color: '#5B6CF8', fontWeight: '600' },
  pageTitle: { fontSize: 17, fontWeight: '700', color: '#1A1D2E' },

  summaryCard: {
    backgroundColor: '#fff',
    margin: 16,
    marginBottom: 8,
    borderRadius: 14,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  summaryItem: { alignItems: 'center', gap: 2 },
  summaryNum: { fontSize: 24, fontWeight: '800', color: '#1A1D2E' },
  summaryLabel: { fontSize: 12, color: '#8B90A7' },
  summaryDivider: { width: 1, height: 36, backgroundColor: '#E5E7EB' },
  greenDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#22C55E' },
  orangeDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#F97316' },

  scroll: { flex: 1 },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#8B90A7',
    paddingHorizontal: 16,
    paddingBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  card: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 16,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    gap: 10,
  },

  cardHeader: { flexDirection: 'row', alignItems: 'center' },
  doctorAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  avatarText: { fontSize: 16, fontWeight: '700', color: '#5B6CF8' },
  doctorInfo: { flex: 1 },
  doctorName: { fontSize: 15, fontWeight: '700', color: '#1A1D2E' },
  doctorSub: { fontSize: 12, color: '#8B90A7', marginTop: 2 },

  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  activeBadge: { backgroundColor: '#DCFCE7' },
  breakBadge: { backgroundColor: '#FFF3E8' },
  delayedBadge: { backgroundColor: '#FEE2E2' },
  upcomingBadge: { backgroundColor: '#EEF2FF' },
  statusBadgeText: { fontSize: 11, fontWeight: '700' },

  tokenRow: {
    flexDirection: 'row',
    backgroundColor: '#F8F9FB',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  tokenStat: { alignItems: 'center' },
  tokenStatNum: { fontSize: 22, fontWeight: '800', color: '#1A1D2E' },
  tokenStatLabel: { fontSize: 11, color: '#8B90A7', marginTop: 2 },
  tokenDivider: { width: 1, height: 32, backgroundColor: '#E5E7EB' },

  nextPatientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F6FA',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 4,
  },
  nextLabel: { fontSize: 12, color: '#8B90A7' },
  nextName: { flex: 1, fontSize: 13, fontWeight: '600', color: '#1A1D2E' },
  callBtn: {
    backgroundColor: '#EEF2FF',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  callBtnText: { fontSize: 12, color: '#5B6CF8', fontWeight: '600' },

  controlRow: { flexDirection: 'row', gap: 8 },
  controlBtn: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: '#F5F6FA',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  controlBtnActive: { backgroundColor: '#EEF2FF', borderColor: '#5B6CF8' },
  controlBtnBreak: { backgroundColor: '#FFF3E8', borderColor: '#FED7AA' },
  controlBtnText: { fontSize: 13, fontWeight: '600', color: '#6B7280' },
  controlBtnTextActive: { color: '#5B6CF8' },
  broadcastNavBtn: {
    flex: 2,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: '#5B6CF8',
    alignItems: 'center',
  },
  broadcastNavBtnText: { fontSize: 13, fontWeight: '600', color: '#fff' },

  quickDelayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  quickDelayLabel: { fontSize: 12, color: '#8B90A7', marginRight: 2 },
  quickDelayBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: '#FFF3E8',
    borderWidth: 1,
    borderColor: '#FED7AA',
  },
  quickDelayBtnActive: { backgroundColor: '#F97316', borderColor: '#F97316' },
  quickDelayBtnText: { fontSize: 12, fontWeight: '600', color: '#EA580C' },
  quickDelayBtnTextActive: { color: '#fff' },

  bottomSpacer: { height: 100 },
});
