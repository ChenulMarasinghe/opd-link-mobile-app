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
    borderRadius: 16,
    padding: 15,
    marginBottom: 11,
    borderWidth: 1,
    borderColor: '#E0E8F4',
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  cardSelected: {
    borderColor: '#635BFF',
    backgroundColor: '#F8F7FF',
  },
  avatarContainer: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#635BFF',
    fontSize: 18,
    fontWeight: '700',
  },
  infoContainer: {
    flex: 1,
  },
  name: {
    fontSize: 15,
    fontWeight: '700',
    color: '#17243A',
    marginBottom: 2,
  },
  specialty: {
    fontSize: 12,
    color: '#66758C',
    marginBottom: 6,
  },
  roomBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#F0F5FC',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  roomText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#52627A',
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
    borderColor: '#635BFF',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#635BFF',
  },
});
