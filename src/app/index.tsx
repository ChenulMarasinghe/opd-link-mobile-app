import BookAppointmentScreen from '@/screens/patient/BookAppointmentScreen';
import ClinicStatusScreen from '@/screens/patient/ClinicStatusScreen';
import NotificationsScreen from '@/screens/patient/NotificationsScreen';
import ProfileSettingsScreen from '@/screens/patient/ProfileSettingsScreen';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function HomeScreen() {
  const [activeScreen, setActiveScreen] = useState<'booking' | 'notifications' | 'clinic' | 'profile'>('booking');

  return (
    <SafeAreaView style={styles.container}>
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

        <Pressable
          style={[styles.navItem, activeScreen === 'clinic' && styles.navItemActive]}
          onPress={() => setActiveScreen('clinic')}
        >
          <Text style={[styles.navText, activeScreen === 'clinic' && styles.navTextActive]}>
            🏥 Clinic Status
          </Text>
        </Pressable>

        <Pressable
          style={[styles.navItem, activeScreen === 'profile' && styles.navItemActive]}
          onPress={() => setActiveScreen('profile')}
        >
          <Text style={[styles.navText, activeScreen === 'profile' && styles.navTextActive]}>
            👤 Profile
          </Text>
        </Pressable>
      </View>

      {/* Screen Body */}
      <View style={styles.body}>
        {activeScreen === 'booking' && (
          <BookAppointmentScreen
            onViewNotifications={() => setActiveScreen('notifications')}
          />
        )}
        {activeScreen === 'notifications' && (
          <NotificationsScreen
            onBack={() => setActiveScreen('booking')}
          />
        )}
        {activeScreen === 'clinic' && (
          <ClinicStatusScreen
            onBack={() => setActiveScreen('booking')}
          />
        )}
        {activeScreen === 'profile' && (
          <ProfileSettingsScreen
            onBack={() => setActiveScreen('booking')}
            onOpenClinicStatus={() => setActiveScreen('clinic')}
          />
        )}
      </View>
    </SafeAreaView>
  );;
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
    paddingHorizontal: 8,
    paddingBottom: 6,
    paddingTop: 6,
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
