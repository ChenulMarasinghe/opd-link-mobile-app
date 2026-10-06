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
    borderRadius: 16,
    padding: 17,
    borderWidth: 1,
    borderColor: '#E0E8F4',
    marginBottom: 18,
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 8,
  },
  divider: {
    height: 1,
    backgroundColor: '#EAF0F7',
    marginVertical: 10,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 9,
  },
  label: {
    flex: 1,
    fontSize: 13,
    color: '#66758C',
    fontWeight: '500',
  },
  value: {
    flex: 1.6,
    fontSize: 14,
    color: '#25344B',
    fontWeight: '600',
    textAlign: 'right',
  },
  valueHighlight: {
    flex: 1.6,
    fontSize: 14,
    color: '#5148D8',
    fontWeight: '700',
    textAlign: 'right',
  },
  valueBadge: {
    flex: 1.6,
    fontSize: 13,
    color: '#5148D8',
    fontWeight: '700',
    textAlign: 'right',
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
});
