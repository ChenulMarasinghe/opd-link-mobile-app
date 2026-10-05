import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';

const services = [
  { label: 'Appointment Service', symbols: { ios: 'calendar', android: 'event', web: 'event' }, status: 'Operational' },
  { label: 'Queue Service', symbols: { ios: 'person.2.fill', android: 'people', web: 'people' }, status: 'Operational' },
  { label: 'Notification Service', symbols: { ios: 'bell.fill', android: 'notifications', web: 'notifications' }, status: 'Operational' },
  { label: 'Authentication', symbols: { ios: 'lock.fill', android: 'lock', web: 'lock' }, status: 'Operational' },
  { label: 'Database', symbols: { ios: 'externaldrive.fill', android: 'storage', web: 'storage' }, status: 'Operational' },
] as const;

const navigationItems = [
  { label: 'Dashboard', ios: 'house.fill', android: 'home', web: 'home' },
  { label: 'Monitoring', ios: 'waveform.path.ecg', android: 'monitor_heart', web: 'monitor_heart' },
  { label: 'Error Logs', ios: 'exclamationmark.triangle.fill', android: 'warning', web: 'warning' },
  { label: 'Maintenance', ios: 'wrench.and.screwdriver.fill', android: 'build', web: 'build' },
] as const;

export default function ITMonitoringScreen() {
  const insets = useSafeAreaInsets();

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 88 }]} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Pressable accessibilityRole="button" accessibilityLabel="Back to dashboard" onPress={() => router.replace('/it-dashboard')} style={styles.backButton}>
            <SymbolView name={{ ios: 'chevron.left', android: 'arrow_back', web: 'arrow_back' }} size={15} tintColor="#18233A" />
          </Pressable>
          <View style={styles.headerCopy}>
            <ThemedText style={styles.heading}>IT Monitoring</ThemedText>
            <ThemedText style={styles.subtitle}>System health &amp; performance</ThemedText>
          </View>
          <View style={styles.opdBadge}>
            <SymbolView name={{ ios: 'waveform.path.ecg', android: 'monitor_heart', web: 'monitor_heart' }} size={11} tintColor="#6875FF" />
            <ThemedText style={styles.opdText}>OPD</ThemedText>
          </View>
        </View>

        <View style={styles.operationalCard}>
          <View style={styles.checkCircle}>
            <SymbolView name={{ ios: 'checkmark', android: 'check', web: 'check' }} size={16} tintColor="#0AAB83" />
          </View>
          <View>
            <ThemedText style={styles.operationalTitle}>All Systems Operational</ThemedText>
            <ThemedText style={styles.operationalSubtitle}>Last checked just now</ThemedText>
          </View>
        </View>

        <View style={styles.availabilityCard}>
          <View style={styles.cardHeader}>
            <ThemedText style={styles.cardLabel}>System Availability</ThemedText>
            <View style={styles.changeBadge}>
              <SymbolView name={{ ios: 'arrow.up', android: 'arrow_upward', web: 'arrow_upward' }} size={9} tintColor="#0AAB83" />
              <ThemedText style={styles.changeText}>0.05%</ThemedText>
            </View>
          </View>
          <View style={styles.availabilityValueRow}>
            <ThemedText style={styles.availabilityValue}>99.9%</ThemedText>
            <ThemedText style={styles.period}>Last 30 days</ThemedText>
          </View>
        </View>

        <View style={styles.metricsRow}>
          <MetricCard label="API Response" value="184 ms" status="HEALTHY" symbols={{ ios: 'speedometer', android: 'speed', web: 'speed' }} />
          <MetricCard label="Server Load" value="42%" status="NORMAL" symbols={{ ios: 'server.rack', android: 'dns', web: 'dns' }} />
          <MetricCard label="Database" value="28%" status="HEALTHY" symbols={{ ios: 'externaldrive.fill', android: 'storage', web: 'storage' }} />
        </View>

        <ThemedText style={styles.sectionTitle}>Services</ThemedText>
        <View style={styles.servicesCard}>
          {services.map((service) => (
            <View key={service.label} style={styles.serviceRow}>
              <View style={styles.serviceIcon}>
                <SymbolView name={service.symbols} size={13} tintColor="#6875FF" />
              </View>
              <ThemedText style={styles.serviceLabel}>{service.label}</ThemedText>
              <View style={styles.serviceStatus}>
                <View style={styles.statusDot} />
                <ThemedText style={styles.statusText}>{service.status}</ThemedText>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.footerRow}>
          <View style={styles.updated}>
            <SymbolView name={{ ios: 'clock', android: 'schedule', web: 'schedule' }} size={11} tintColor="#91A0B5" />
            <ThemedText style={styles.updatedText}>Last updated 11:12 AM</ThemedText>
          </View>
          <Pressable accessibilityRole="button" style={({ pressed }) => [styles.refreshButton, pressed && styles.pressed]}>
            <SymbolView name={{ ios: 'arrow.clockwise', android: 'refresh', web: 'refresh' }} size={12} tintColor="#FFFFFF" />
            <ThemedText style={styles.refreshText}>Refresh</ThemedText>
          </Pressable>
        </View>
      </ScrollView>

      <View style={[styles.bottomNavigation, { paddingBottom: Math.max(insets.bottom, 8) }]}>
        {navigationItems.map((item) => (
          <Pressable
            key={item.label}
            accessibilityRole="tab"
            accessibilityState={{ selected: item.label === 'Monitoring' }}
            onPress={() => item.label === 'Dashboard' && router.replace('/it-dashboard')}
            style={styles.navItem}>
            <SymbolView name={{ ios: item.ios, android: item.android, web: item.web }} size={16} tintColor={item.label === 'Monitoring' ? '#10C995' : '#A5B3C7'} />
            <ThemedText style={[styles.navLabel, { color: item.label === 'Monitoring' ? '#10C995' : '#A5B3C7' }]}>{item.label}</ThemedText>
          </Pressable>
        ))}
      </View>
    </SafeAreaView>
  );
}

function MetricCard({ label, value, status, symbols }: { label: string; value: string; status: string; symbols: { ios: 'speedometer' | 'server.rack' | 'externaldrive.fill'; android: 'speed' | 'dns' | 'storage'; web: 'speed' | 'dns' | 'storage' } }) {
  return (
    <View style={styles.metricCard}>
      <View style={styles.metricLabelRow}>
        <ThemedText style={styles.metricLabel}>{label}</ThemedText>
        <SymbolView name={symbols} size={10} tintColor="#91A0B5" />
      </View>
      <ThemedText style={styles.metricValue}>{value}</ThemedText>
      <ThemedText style={styles.metricStatus}>{status}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#EAF4FF' },
  content: { paddingHorizontal: 16, paddingTop: 10 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 13 },
  backButton: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', marginRight: 9 },
  headerCopy: { flex: 1 },
  heading: { color: '#18233A', fontSize: 17, lineHeight: 21, fontWeight: '800' },
  subtitle: { color: '#43536D', fontSize: 9, lineHeight: 12 },
  opdBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#E8EBFF', borderRadius: 10, paddingHorizontal: 7, paddingVertical: 5 },
  opdText: { color: '#6875FF', fontSize: 8, fontWeight: '700' },
  operationalCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 14, padding: 11, marginBottom: 10 },
  checkCircle: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#E0FAF3', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  operationalTitle: { color: '#18233A', fontSize: 11, lineHeight: 15, fontWeight: '700' },
  operationalSubtitle: { color: '#0AAB83', fontSize: 8, lineHeight: 11 },
  availabilityCard: { backgroundColor: '#FFFFFF', borderRadius: 14, padding: 11, marginBottom: 10 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardLabel: { color: '#43536D', fontSize: 9 },
  changeBadge: { flexDirection: 'row', alignItems: 'center', gap: 2, backgroundColor: '#DDF8F1', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 3 },
  changeText: { color: '#0AAB83', fontSize: 7, fontWeight: '700' },
  availabilityValueRow: { flexDirection: 'row', alignItems: 'baseline', gap: 7, marginTop: 2 },
  availabilityValue: { color: '#18233A', fontSize: 25, lineHeight: 29, fontWeight: '800' },
  period: { color: '#91A0B5', fontSize: 8 },
  metricsRow: { flexDirection: 'row', gap: 7 },
  metricCard: { flex: 1, backgroundColor: '#FFFFFF', borderRadius: 11, padding: 9 },
  metricLabelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  metricLabel: { color: '#43536D', fontSize: 7 },
  metricValue: { color: '#18233A', fontSize: 14, lineHeight: 18, fontWeight: '800', marginTop: 2 },
  metricStatus: { color: '#0AAB83', fontSize: 7, lineHeight: 10, fontWeight: '700', marginTop: 2 },
  sectionTitle: { color: '#18233A', fontSize: 12, lineHeight: 16, fontWeight: '700', marginTop: 12, marginBottom: 6 },
  servicesCard: { backgroundColor: '#FFFFFF', borderRadius: 14, overflow: 'hidden' },
  serviceRow: { minHeight: 34, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 9, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E7EDF5' },
  serviceIcon: { width: 24, height: 24, borderRadius: 7, backgroundColor: '#F0F2FF', alignItems: 'center', justifyContent: 'center', marginRight: 7 },
  serviceLabel: { color: '#18233A', fontSize: 9, flex: 1 },
  serviceStatus: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statusDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#0AAB83' },
  statusText: { color: '#0AAB83', fontSize: 8 },
  footerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 13 },
  updated: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  updatedText: { color: '#91A0B5', fontSize: 8 },
  refreshButton: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#6875FF', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 6 },
  refreshText: { color: '#FFFFFF', fontSize: 8, fontWeight: '700' },
  pressed: { opacity: 0.8 },
  bottomNavigation: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: '#FFFFFF', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#DDE8F5', flexDirection: 'row', justifyContent: 'space-around', paddingTop: 8 },
  navItem: { alignItems: 'center', justifyContent: 'center', minWidth: 64, gap: 3 },
  navLabel: { fontSize: 7, lineHeight: 10 },
});
