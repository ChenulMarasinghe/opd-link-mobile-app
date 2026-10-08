import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { DoctorClinicStatus } from '@/services/clinicStatusService';

interface ClinicDoctorCardProps {
  doctor: DoctorClinicStatus;
}

export function ClinicDoctorCard({ doctor }: ClinicDoctorCardProps) {
  const { name, specialty, roomNumber, status, delayMinutes } = doctor;

  // Status Badge Configuration
  const getBadgeStyle = () => {
    switch (status) {
      case 'on_time':
        return {
          container: styles.badgeOnTime,
          text: styles.badgeTextOnTime,
          label: '● On Time',
        };
      case 'delayed':
        return {
          container: styles.badgeDelayed,
          text: styles.badgeTextDelayed,
          label: `● Delayed ${delayMinutes ? `${delayMinutes} min` : '15 min'}`,
        };
      case 'not_started':
        return {
          container: styles.badgeNotStarted,
          text: styles.badgeTextNotStarted,
          label: '● Not Started',
        };
      default:
        return {
          container: styles.badgeNotStarted,
          text: styles.badgeTextNotStarted,
          label: '● On Time',
        };
    }
  };

  const badge = getBadgeStyle();

  return (
    <View style={styles.card}>
      {/* Avatar Icon */}
      <View style={styles.avatarContainer}>
        <Text style={styles.avatarIcon}>👤</Text>
      </View>

      {/* Info Section */}
      <View style={styles.infoContainer}>
        <Text style={styles.nameText} numberOfLines={1}>
          {name}
        </Text>
        <Text style={styles.detailsText} numberOfLines={1}>
          {specialty} • Room {roomNumber}
        </Text>
      </View>

      {/* Status Badge */}
      <View style={[styles.badgeBase, badge.container]}>
        <Text style={[styles.badgeTextBase, badge.text]}>{badge.label}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 1,
    borderWidth: 1,
    borderColor: '#E0E8F4',
  },
  avatarContainer: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarIcon: {
    fontSize: 20,
    color: '#635BFF',
  },
  infoContainer: {
    flex: 1,
    minWidth: 0,
    marginRight: 8,
  },
  nameText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#17243A',
    marginBottom: 3,
  },
  detailsText: {
    fontSize: 12,
    color: '#66758C',
    fontWeight: '500',
  },
  badgeBase: {
    minHeight: 30,
    maxWidth: '43%',
    flexShrink: 0,
    justifyContent: 'center',
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 15,
    borderWidth: 1,
  },
  badgeTextBase: {
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'center',
  },

  // On Time (Green)
  badgeOnTime: {
    backgroundColor: '#E8F8EE',
    borderColor: '#C7EBD3',
  },
  badgeTextOnTime: {
    color: '#247A45',
  },

  // Delayed (Orange/Amber)
  badgeDelayed: {
    backgroundColor: '#FFF5D9',
    borderColor: '#F3DEA3',
  },
  badgeTextDelayed: {
    color: '#9A5A08',
  },

  // Not Started (Gray)
  badgeNotStarted: {
    backgroundColor: '#F0F3F7',
    borderColor: '#DFE5ED',
  },
  badgeTextNotStarted: {
    color: '#657286',
  },
});
