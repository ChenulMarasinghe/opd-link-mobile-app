import React from 'react';
import { StyleSheet, Text, View, Pressable } from 'react-native';
import { Doctor } from '@/services/bookingService';

interface DoctorCardProps {
  doctor: Doctor;
  isSelected: boolean;
  onSelect: (doctor: Doctor) => void;
}

export function DoctorCard({ doctor, isSelected, onSelect }: DoctorCardProps) {
  return (
    <Pressable
      style={[styles.card, isSelected && styles.cardSelected]}
      onPress={() => onSelect(doctor)}
    >
      <View style={styles.avatarContainer}>
        <Text style={styles.avatarText}>
          {doctor.name.replace(/^Dr\.\s*/i, '').charAt(0) || 'D'}
        </Text>
      </View>

      <View style={styles.infoContainer}>
        <Text style={styles.name}>{doctor.name}</Text>
        <Text style={styles.specialty}>{doctor.specialty}</Text>
        <View style={styles.roomBadge}>
          <Text style={styles.roomText}>OPD {doctor.roomNumber}</Text>
        </View>
      </View>

      <View style={[styles.radioButton, isSelected && styles.radioButtonSelected]}>
        {isSelected && <View style={styles.radioInner} />}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  cardSelected: {
    borderColor: '#208AEF',
    backgroundColor: '#F0F7FF',
  },
  avatarContainer: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#E6F4FE',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#208AEF',
    fontSize: 18,
    fontWeight: '700',
  },
  infoContainer: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 2,
  },
  specialty: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 4,
  },
  roomBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  roomText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  radioButtonSelected: {
    borderColor: '#208AEF',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#208AEF',
  },
});
