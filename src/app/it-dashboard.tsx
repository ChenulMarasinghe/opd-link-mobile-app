import { SymbolView } from 'expo-symbols';
import { router } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { ActivityItem, type ActivityTone } from '@/components/it-dashboard/activity-item';
import { StatusCard, type StatusCardTone } from '@/components/it-dashboard/status-card';
import { ThemedText } from '@/components/themed-text';

const dashboardCards: { title: string; subtitle: string; status: string; tone: StatusCardTone }[] = [
  { title: 'IT Monitoring', subtitle: 'System health & performance', status: '99.9% Uptime', tone: 'monitoring' },
  { title: 'Error Logs', subtitle: 'Technical issues & events', status: '2 Critical Alerts', tone: 'critical' },
  { title: 'Maintenance & Backup', subtitle: 'System maintenance status', status: 'Backup Completed', tone: 'maintenance' },
];

const recentActivities: { title: string; time: string; source: string; status: string; tone: ActivityTone }[] = [
  { title: 'Database backup completed successfully', time: 'Today, 03:00 AM', source: 'Automated', status: 'SUCCESS', tone: 'success' },
  { title: 'Database connection timeout', time: 'Today, 09:18 AM', source: 'DB Server', status: 'CRITICAL', tone: 'critical' },
  { title: 'API latency limit warning triggered', time: 'Yesterday, 04:35 PM', source: 'API Service', status: 'WARNING', tone: 'warning' },
];

const navigationItems = [
  { label: 'Dashboard', ios: 'house.fill', android: 'home', web: 'home', active: true },
  { label: 'Monitoring', ios: 'waveform.path.ecg', android: 'monitor_heart', web: 'monitor_heart', active: false },
  { label: 'Error Logs', ios: 'exclamationmark.triangle.fill', android: 'warning', web: 'warning', active: false },
  { label: 'Maintenance', ios: 'wrench.and.screwdriver.fill', android: 'build', web: 'build', active: false },
] as const;

export default function ITDashboardScreen() {
  const insets = useSafeAreaInsets();
  const cards = useMemo(() => dashboardCards, []);

  const handleCardPress = (title: string) => {
    if (title === 'IT Monitoring') {
      router.push('/it-monitoring');
    } else if (title === 'Error Logs') {
      router.push('/error-logs');
    } else if (title === 'Maintenance & Backup') {
      router.push('/maintenance');
    }
  };

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 84 }]} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View>
            <ThemedText style={styles.heading}>IT Dashboard</ThemedText>
            <ThemedText style={styles.welcome}>Welcome back, Admin Support</ThemedText>
          </View>
          <View style={styles.opdBadge}>
            <SymbolView name={{ ios: 'waveform.path.ecg', android: 'monitor_heart', web: 'monitor_heart' }} size={12} tintColor="#6875FF" />
            <ThemedText style={styles.opdText}>OPD</ThemedText>
          </View>
        </View>

        <View style={styles.operationalCard}>
          <View style={styles.checkCircle}>
            <SymbolView name={{ ios: 'checkmark', android: 'check', web: 'check' }} size={17} tintColor="#0AAB83" />
          </View>
          <View>
            <ThemedText style={styles.operationalTitle}>All Systems Operational</ThemedText>
            <ThemedText style={styles.operationalSubtitle}>Uptime normal • checked just now</ThemedText>
          </View>
        </View>

        <View style={styles.cardList}>
          {cards.map((card) => (
            <StatusCard key={card.title} {...card} onPress={() => handleCardPress(card.title)} />
          ))}
        </View>

        <ThemedText style={styles.sectionTitle}>Recent System Activity</ThemedText>
        <View style={styles.activityCard}>
          {recentActivities.map((activity, index) => (
            <ActivityItem key={activity.title} {...activity} isLast={index === recentActivities.length - 1} />
          ))}
        </View>
      </ScrollView>

      <View style={[styles.bottomNavigation, { paddingBottom: Math.max(insets.bottom, 8) }]}>
        {navigationItems.map((item) => (
          <Pressable
            key={item.label}
            accessibilityRole="tab"
            accessibilityState={{ selected: item.active }}
            onPress={() => {
              if (item.label === 'Monitoring') router.push('/it-monitoring');
              if (item.label === 'Error Logs') router.push('/error-logs');
              if (item.label === 'Maintenance') router.push('/maintenance');
            }}
            style={styles.navItem}>
            <SymbolView name={{ ios: item.ios, android: item.android, web: item.web }} size={17} tintColor={item.active ? '#10C995' : '#A5B3C7'} />
            <ThemedText style={[styles.navLabel, { color: item.active ? '#10C995' : '#A5B3C7' }]}>{item.label}</ThemedText>
          </Pressable>
        ))}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#EAF4FF' },
  content: { paddingHorizontal: 16, paddingTop: 12 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  heading: { color: '#18233A', fontSize: 21, lineHeight: 26, fontWeight: '800' },
  welcome: { color: '#43536D', fontSize: 10, lineHeight: 14 },
  opdBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#E8EBFF', borderRadius: 12, paddingHorizontal: 8, paddingVertical: 6 },
  opdText: { color: '#6875FF', fontSize: 9, fontWeight: '700' },
  operationalCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 16, padding: 12, marginBottom: 12, shadowColor: '#7FA4C9', shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 2 },
  checkCircle: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#E0FAF3', alignItems: 'center', justifyContent: 'center', marginRight: 11 },
  operationalTitle: { color: '#18233A', fontSize: 12, lineHeight: 16, fontWeight: '700' },
  operationalSubtitle: { color: '#0AAB83', fontSize: 9, lineHeight: 13 },
  cardList: { gap: 10 },
  sectionTitle: { color: '#18233A', fontSize: 13, lineHeight: 18, fontWeight: '700', marginTop: 12, marginBottom: 7 },
  activityCard: { backgroundColor: '#FFFFFF', borderRadius: 16, overflow: 'hidden', shadowColor: '#7FA4C9', shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 2 },
  bottomNavigation: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: '#FFFFFF', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#DDE8F5', flexDirection: 'row', justifyContent: 'space-around', paddingTop: 8 },
  navItem: { alignItems: 'center', justifyContent: 'center', minWidth: 64, gap: 3 },
  navLabel: { fontSize: 8, lineHeight: 11 },
});
