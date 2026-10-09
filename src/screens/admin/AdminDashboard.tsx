import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  subscribeAppointments,
  subscribeClinicWings,
  subscribeDoctors,
  subscribeQueues,
  syncQueueMaxToken,
} from '@/services/adminService';
import type { Appointment, ClinicWing, Doctor, Queue } from '@/services/adminService';
import {
  getTodayDateString,
} from '@/services/mockData';

const TODAY = getTodayDateString();

export default function AdminDashboard() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [queues, setQueues] = useState<Queue[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [clinicWings, setClinicWings] = useState<ClinicWing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubDoctors = subscribeDoctors((docs) => {
      setDoctors(docs);
      setLoading(false);
    });
    const unsubQueues = subscribeQueues(TODAY, setQueues);
    const unsubAppointments = subscribeAppointments(setAppointments);
    const unsubClinicWings = subscribeClinicWings(setClinicWings);

    return () => {
      unsubDoctors();
      unsubQueues();
      unsubAppointments();
      unsubClinicWings();
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

  const todayAppointments = appointments.filter(
    (appointment) => appointment.date === TODAY && appointment.status !== 'cancelled'
  );
  const patientsInQueue = todayAppointments.filter(
    (appointment) =>
      appointment.status === 'upcoming' || appointment.status === 'arrived'
  );
  const summaryCards = [
    {
      label: 'Patients Today',
      value: String(new Set(todayAppointments.map((appointment) => appointment.patientId)).size),
    },
    {
      label: 'In Queue',
      value: String(new Set(patientsInQueue.map((appointment) => appointment.patientId)).size),
    },
    {
      label: 'Doctors',
      value: String(doctors.length),
    },
  ];

  const liveDepartments = queues.map((queue) => {
    const doctor = doctors.find((item) => item.id === queue.doctorId);
    const nextToken = queue.nextToken ?? null;
    const nextAppointment = patientsInQueue.find(
      (appointment) =>
        appointment.doctorId === queue.doctorId &&
        appointment.session === queue.session &&
        appointment.tokenNumber === nextToken
    );
    const nextPatient =
      nextAppointment?.patientName ??
      (queue.nextToken === nextToken ? queue.nextPatientName || undefined : undefined) ??
      'No patient assigned';

    return {
      doctorId: queue.id ?? `${queue.doctorId}-${queue.date}-${queue.session}`,
      name: queue.opdName ?? doctor?.department ?? 'OPD',
      doctorName: doctor?.name ?? queue.doctorName ?? 'Doctor',
      room: queue.location ?? doctor?.room ?? '',
      session: queue.session ?? '',
      currentToken: queue.currentToken,
      nextToken,
      nextPatient,
      status: queue.status,
    };
  });

  const activeCount = liveDepartments.filter((department) => department.status === 'in_progress').length;

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#5B6CF8" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.brandWrap}>
          <View style={styles.brandIcon}>
            <Text style={styles.brandIconText}>+</Text>
          </View>
          <View>
            <Text style={styles.brandName}>OPDLink</Text>
            <Text style={styles.brandSub}>ADMIN PORTAL</Text>
          </View>
        </View>
        <View style={styles.avatar} />
      </View>

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.summaryRow}>
          {summaryCards.map((card) => (
            <View key={card.label} style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>{card.label}</Text>
              <Text style={styles.summaryValue}>{card.value}</Text>
            </View>
          ))}
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Live Departments</Text>
          <Text style={styles.sectionMeta}>{activeCount} Active</Text>
        </View>

        <View style={styles.departmentList}>
          {liveDepartments.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>No active departments found</Text>
              <Text style={styles.emptyMessage}>
                Doctor and queue information will appear here when it is available in the backend.
              </Text>
            </View>
          ) : (
            liveDepartments.map((department) => {
              const isPaused = department.status === 'paused';
              const isWaiting = department.status === 'waiting';
              const statusStyle = isPaused
                ? styles.statusBreak
                : isWaiting
                  ? styles.statusUpcoming
                  : styles.statusActive;

              return (
                <View key={department.doctorId} style={styles.departmentCard}>
                  <View style={styles.cardTopLine}>
                    <Text style={styles.departmentName}>{department.name}</Text>
                    <Text style={[styles.statusPill, statusStyle]}>
                      {department.status?.replace('_', ' ') ?? 'waiting'}
                    </Text>
                  </View>

                  <View style={styles.cardMiddleLine}>
                    <Text style={styles.doctorText}>
                      {department.doctorName} • {department.room} • {department.session}
                    </Text>
                    <Text style={styles.servingNumber}>#{department.currentToken}</Text>
                  </View>

                  <Text style={styles.nextLine}>
                    Next patient: #{department.nextToken ?? '—'} • {department.nextPatient}
                  </Text>
                </View>
              );
            })
          )}
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Clinic Wings</Text>
          <Text style={styles.sectionMeta}>
            {clinicWings.length} OPDs
          </Text>
        </View>
        <View style={styles.departmentList}>
          {clinicWings.map((wing) => (
            <View key={wing.id ?? wing.name} style={styles.wingCard}>
              <View style={styles.cardTopLine}>
                <Text style={styles.departmentName}>{wing.name}</Text>
                <Text style={[styles.statusPill, wing.closedToday ? styles.statusBreak : styles.statusActive]}>{wing.closedToday ? 'Closed today' : 'Open today'}</Text>
              </View>
              <Text style={styles.wingDetails}>
                {wing.sessions?.join(' • ') ?? 'No sessions configured'}
              </Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#EEF1F7',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#EEF1F7',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 14,
    backgroundColor: '#F4F5FA',
  },
  brandWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  brandIcon: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#5B6CF8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandIconText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 18,
    lineHeight: 18,
  },
  brandName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#2D3142',
  },
  brandSub: {
    fontSize: 8,
    letterSpacing: 0.8,
    color: '#7A7F95',
    fontWeight: '700',
    marginTop: 2,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#DDE2F9',
  },
  scroll: { flex: 1 },
  summaryRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 14,
    gap: 12,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#F7F8FB',
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#E4E8F2',
  },
  summaryLabel: {
    fontSize: 16,
    color: '#4A4F63',
    fontWeight: '600',
  },
  summaryValue: {
    fontSize: 38,
    fontWeight: '800',
    color: '#1F2430',
    marginTop: 6,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 8,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1E2430',
  },
  sectionMeta: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '600',
  },
  departmentList: {
    paddingHorizontal: 16,
    paddingTop: 2,
    gap: 10,
    paddingBottom: 22,
  },
  emptyState: {
    backgroundColor: '#F7F8FB',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E7F1',
    padding: 20,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2430',
    textAlign: 'center',
  },
  emptyMessage: {
    fontSize: 13,
    color: '#5E6475',
    marginTop: 6,
    textAlign: 'center',
    lineHeight: 19,
  },
  departmentCard: {
    backgroundColor: '#F7F8FB',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E7F1',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  wingCard: {
    backgroundColor: '#F7F8FB',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E7F1',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  wingDetails: { fontSize: 13, color: '#5E6475', marginTop: 7, lineHeight: 18 },
  cardTopLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  departmentName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1F2430',
  },
  statusPill: {
    fontSize: 13,
    fontWeight: '700',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    overflow: 'hidden',
  },
  statusActive: {
    color: '#0F766E',
    backgroundColor: '#E8F9F5',
  },
  statusBreak: {
    color: '#C2410C',
    backgroundColor: '#FFF1E8',
  },
  statusUpcoming: {
    color: '#4F46E5',
    backgroundColor: '#E8EBFF',
  },
  cardMiddleLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  doctorText: {
    fontSize: 16,
    color: '#464D5E',
    fontWeight: '600',
    flex: 1,
  },
  servingNumber: {
    fontSize: 28,
    fontWeight: '800',
    color: '#2E6BFF',
    marginLeft: 14,
  },
  nextLine: {
    fontSize: 15,
    color: '#5E6475',
    marginTop: 8,
    fontWeight: '600',
  },
});
