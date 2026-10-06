import BookAppointmentScreen from '@/screens/patient/BookAppointmentScreen';
import ClinicStatusScreen from '@/screens/patient/ClinicStatusScreen';
import NotificationsScreen from '@/screens/patient/NotificationsScreen';
import ProfileSettingsScreen from '@/screens/patient/ProfileSettingsScreen';
import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const patientTabs = [
  {
    key: 'booking',
    label: 'Book\nAppointment',
    accessibilityLabel: 'Book Appointment',
    icon: { ios: 'calendar', android: 'calendar_month', web: 'calendar_month' },
  },
  {
    key: 'notifications',
    label: 'Notifications',
    accessibilityLabel: 'Notifications',
    icon: { ios: 'bell', android: 'notifications', web: 'notifications' },
  },
  {
    key: 'clinic',
    label: 'Clinic Status',
    accessibilityLabel: 'Clinic Status',
    icon: { ios: 'building.2', android: 'domain', web: 'domain' },
  },
  {
    key: 'profile',
    label: 'Profile',
    accessibilityLabel: 'Profile',
    icon: { ios: 'person.crop.circle', android: 'account_circle', web: 'account_circle' },
  },
] as const;

export default function HomeScreen() {
  const [activeScreen, setActiveScreen] = useState<'booking' | 'notifications' | 'clinic' | 'profile'>('booking');

  return (
    <View style={styles.container}>
      <View style={styles.body}>
        {activeScreen === 'booking' && (
          <BookAppointmentScreen onViewNotifications={() => setActiveScreen('notifications')} />
        )}
        {activeScreen === 'notifications' && (
          <NotificationsScreen onBack={() => setActiveScreen('booking')} />
        )}
        {activeScreen === 'clinic' && (
          <ClinicStatusScreen onBack={() => setActiveScreen('booking')} />
        )}
        {activeScreen === 'profile' && (
          <ProfileSettingsScreen
            onBack={() => setActiveScreen('booking')}
            onOpenClinicStatus={() => setActiveScreen('clinic')}
          />
        )}
      </View>

      <SafeAreaView edges={['bottom']} style={styles.bottomNavSafeArea}>
        <View style={styles.bottomNav}>
          {patientTabs.map((tab) => {
            const selected = activeScreen === tab.key;
            return (
              <Pressable
                key={tab.key}
                style={styles.tabButton}
                onPress={() => setActiveScreen(tab.key)}
                accessibilityRole="tab"
                accessibilityLabel={tab.accessibilityLabel}
                accessibilityState={{ selected }}
              >
                <View style={[styles.tabIconContainer, selected && styles.tabIconContainerSelected]}>
                  <SymbolView
                    name={tab.icon}
                    size={20}
                    tintColor={selected ? '#635BFF' : '#64748B'}
                  />
                </View>
                <Text style={[styles.tabLabel, selected && styles.tabLabelSelected]} numberOfLines={2}>
                  {tab.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  bottomNavSafeArea: {
    backgroundColor: '#FFFFFF',
  },
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingHorizontal: 4,
    paddingTop: 6,
  },
  tabButton: {
    flex: 1,
    minHeight: 56,
    paddingHorizontal: 2,
    paddingBottom: 4,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  tabIconContainer: {
    width: 34,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabIconContainerSelected: {
    backgroundColor: '#EEF2FF',
  },
  tabLabel: {
    fontSize: 9,
    fontWeight: '600',
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 11,
  },
  tabLabelSelected: {
    color: '#635BFF',
    fontWeight: '700',
  },
  body: {
    flex: 1,
  },
});
