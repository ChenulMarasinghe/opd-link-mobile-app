import React from 'react';
import { StyleSheet, Text, View, Pressable } from 'react-native';

interface TimeSlotPickerProps {
  allSlots?: string[];
  bookedSlots: string[];
  selectedSlot: string | null;
  onSelectSlot: (slot: string) => void;
}

const DEFAULT_SLOTS = [
  '08:30 AM',
  '08:45 AM',
  '09:00 AM',
  '09:15 AM',
  '09:30 AM',
  '09:45 AM',
  '10:00 AM',
  '10:15 AM',
  '10:30 AM',
  '10:45 AM',
  '11:00 AM',
  '11:15 AM',
];

export function TimeSlotPicker({
  allSlots = DEFAULT_SLOTS,
  bookedSlots,
  selectedSlot,
  onSelectSlot,
}: TimeSlotPickerProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Available Time Slots</Text>
      <View style={styles.grid}>
        {allSlots.map((slot) => {
          const isBooked = bookedSlots.includes(slot);
          const isSelected = selectedSlot === slot;

          return (
            <Pressable
              key={slot}
              disabled={isBooked}
              onPress={() => onSelectSlot(slot)}
              style={[
                styles.slotChip,
                isBooked && styles.slotBooked,
                isSelected && styles.slotSelected,
              ]}
            >
              <Text
                style={[
                  styles.slotText,
                  isBooked && styles.slotTextBooked,
                  isSelected && styles.slotTextSelected,
                ]}
              >
                {slot}
              </Text>
              {isBooked && <Text style={styles.bookedTag}>Booked</Text>}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 10,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  slotChip: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: '29%',
    flexGrow: 1,
  },
  slotSelected: {
    backgroundColor: '#208AEF',
    borderColor: '#208AEF',
  },
  slotBooked: {
    backgroundColor: '#F1F5F9',
    borderColor: '#E2E8F0',
    opacity: 0.7,
  },
  slotText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },
  slotTextSelected: {
    color: '#FFFFFF',
  },
  slotTextBooked: {
    color: '#94A3B8',
    textDecorationLine: 'line-through',
  },
  bookedTag: {
    fontSize: 9,
    color: '#EF4444',
    fontWeight: '700',
    marginTop: 2,
    textTransform: 'uppercase',
  },
});
