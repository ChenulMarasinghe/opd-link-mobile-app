import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Doctor } from '@/services/bookingService';

interface BookingSummaryCardProps {
  doctor: Doctor;
  date: string;
  timeSlot: string;
  patientName?: string;
  patientPhone?: string;
}

export function BookingSummaryCard({
  doctor,
  date,
  timeSlot,
  patientName,
  patientPhone,
}: BookingSummaryCardProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Appointment Summary</Text>

      <View style={styles.divider} />

      <View style={styles.row}>
        <Text style={styles.label}>Doctor:</Text>
        <Text style={styles.valueHighlight}>{doctor.name}</Text>
      </View>

      <View style={styles.row}>
        <Text style={styles.label}>Specialty:</Text>
        <Text style={styles.value}>{doctor.specialty}</Text>
      </View>

      <View style={styles.row}>
        <Text style={styles.label}>Location:</Text>
        <Text style={styles.value}>OPD Room {doctor.roomNumber}</Text>
      </View>

      <View style={styles.row}>
        <Text style={styles.label}>Date:</Text>
        <Text style={styles.value}>{date}</Text>
      </View>

      <View style={styles.row}>
        <Text style={styles.label}>Time Slot:</Text>
        <Text style={styles.valueBadge}>{timeSlot}</Text>
      </View>

      {patientName ? (
        <>
          <View style={styles.divider} />

          <View style={styles.row}>
            <Text style={styles.label}>Patient Name:</Text>
            <Text style={styles.value}>{patientName}</Text>
          </View>

          {patientPhone ? (
            <View style={styles.row}>
              <Text style={styles.label}>Phone:</Text>
              <Text style={styles.value}>{patientPhone}</Text>
            </View>
          ) : null}
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 8,
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 10,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },
  value: {
    fontSize: 14,
    color: '#1E293B',
    fontWeight: '600',
  },
  valueHighlight: {
    fontSize: 14,
    color: '#208AEF',
    fontWeight: '700',
  },
  valueBadge: {
    fontSize: 13,
    color: '#208AEF',
    fontWeight: '700',
    backgroundColor: '#E6F4FE',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
});
