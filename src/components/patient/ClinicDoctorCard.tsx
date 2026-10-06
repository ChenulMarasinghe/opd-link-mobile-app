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
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  avatarContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  avatarIcon: {
    fontSize: 20,
    color: '#94A3B8',
  },
  infoContainer: {
    flex: 1,
    marginRight: 8,
  },
  nameText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 2,
  },
  detailsText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  badgeBase: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  badgeTextBase: {
    fontSize: 11,
    fontWeight: '700',
  },

  // On Time (Green)
  badgeOnTime: {
    backgroundColor: '#DCFCE7',
    borderColor: '#BBF7D0',
  },
  badgeTextOnTime: {
    color: '#15803D',
  },

  // Delayed (Orange/Amber)
  badgeDelayed: {
    backgroundColor: '#FEF3C7',
    borderColor: '#FDE68A',
  },
  badgeTextDelayed: {
    color: '#B45309',
  },

  // Not Started (Gray)
  badgeNotStarted: {
    backgroundColor: '#F1F5F9',
    borderColor: '#E2E8F0',
  },
  badgeTextNotStarted: {
    color: '#64748B',
  },
});
