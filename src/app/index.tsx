import React, { useState } from 'react';
import { StyleSheet, View, Text, Pressable } from 'react-native';
import BookAppointmentScreen from '@/screens/patient/BookAppointmentScreen';
import NotificationsScreen from '@/screens/patient/NotificationsScreen';

export default function HomeScreen() {
  const [activeScreen, setActiveScreen] = useState<'booking' | 'notifications'>('booking');

  return (
    <View style={styles.container}>
      {/* Top Test Navigation Switcher */}
      <View style={styles.navBar}>
        <Pressable
          style={[styles.navItem, activeScreen === 'booking' && styles.navItemActive]}
          onPress={() => setActiveScreen('booking')}
        >
          <Text style={[styles.navText, activeScreen === 'booking' && styles.navTextActive]}>
            📅 Book Appointment
          </Text>
        </Pressable>

        <Pressable
          style={[styles.navItem, activeScreen === 'notifications' && styles.navItemActive]}
          onPress={() => setActiveScreen('notifications')}
        >
          <Text style={[styles.navText, activeScreen === 'notifications' && styles.navTextActive]}>
            🔔 Notifications
          </Text>
        </Pressable>
      </View>

      {/* Screen Body */}
      <View style={styles.body}>
        {activeScreen === 'booking' ? (
          <BookAppointmentScreen
            onViewNotifications={() => setActiveScreen('notifications')}
          />
        ) : (
          <NotificationsScreen
            onBack={() => setActiveScreen('booking')}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  navBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingTop: 44, // Safe area top offset for testing
    paddingHorizontal: 8,
    paddingBottom: 6,
  },
  navItem: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  navItemActive: {
    backgroundColor: '#EEF2FF',
  },
  navText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  navTextActive: {
    color: '#208AEF',
    fontWeight: '700',
  },
  body: {
    flex: 1,
  },
});
