import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';

const logs = [
  { level: 'Critical', title: 'Database Connection Failed', detail: 'Temporary connection failure detected', time: 'Today, 09:18 AM' },
  { level: 'Warning', title: 'API Request Timeout', detail: 'Appointment service exceeded response threshold', time: 'Today, 10:42 AM' },
  { level: 'Warning', title: 'Notification Delivery Delay', detail: 'Push notification delivery exceeded 30 seconds', time: 'Yesterday, 04:35 PM' },
] as const;

export default function ErrorLogsScreen() {
  const insets = useSafeAreaInsets();

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 84 }]} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Pressable accessibilityRole="button" accessibilityLabel="Back to dashboard" onPress={() => router.replace('/it-dashboard')} style={styles.backButton}>
            <SymbolView name={{ ios: 'chevron.left', android: 'arrow_back', web: 'arrow_back' }} size={15} tintColor="#18233A" />
          </Pressable>
          <View style={styles.headerCopy}>
            <ThemedText style={styles.heading}>Error Logs</ThemedText>
            <ThemedText style={styles.subtitle}>Technical issues &amp; system events</ThemedText>
          </View>
          <ThemedText style={styles.badge}>OPD</ThemedText>
        </View>

        <View style={styles.summaryRow}>
          <Summary label="Critical" value="2" color="#F04444" background="#FFE0E0" />
          <Summary label="Warnings" value="5" color="#E99A00" background="#FFF1C8" />
          <Summary label="Resolved" value="18" color="#0AAB83" background="#DDF8F1" />
        </View>

        <ThemedText style={styles.sectionTitle}>Recent Errors</ThemedText>
        <View style={styles.list}>
          {logs.map((log) => (
            <View key={log.title} style={styles.logCard}>
              <View style={styles.logTop}>
                <ThemedText style={[styles.level, log.level === 'Critical' ? styles.critical : styles.warning]}>{log.level}</ThemedText>
                <ThemedText style={styles.time}>{log.time}</ThemedText>
              </View>
              <ThemedText style={styles.title}>{log.title}</ThemedText>
              <ThemedText style={styles.detail}>{log.detail}</ThemedText>
              <Pressable accessibilityRole="button" onPress={() => undefined} style={styles.detailsButton}>
                <ThemedText style={styles.detailsText}>View Details ›</ThemedText>
              </Pressable>
            </View>
          ))}
        </View>
      </ScrollView>

      <View style={[styles.bottomNavigation, { paddingBottom: Math.max(insets.bottom, 8) }]}>
        <NavItem label="Dashboard" icon={{ ios: 'house.fill', android: 'home', web: 'home' }} onPress={() => router.replace('/it-dashboard')} />
        <NavItem label="Monitoring" icon={{ ios: 'waveform.path.ecg', android: 'monitor_heart', web: 'monitor_heart' }} onPress={() => router.replace('/it-monitoring')} />
        <NavItem active label="Error Logs" icon={{ ios: 'exclamationmark.triangle.fill', android: 'warning', web: 'warning' }} />
        <NavItem label="Maintenance" icon={{ ios: 'wrench.and.screwdriver.fill', android: 'build', web: 'build' }} onPress={() => router.replace('/it-dashboard')} />
      </View>
    </SafeAreaView>
  );
}

function Summary({ label, value, color, background }: { label: string; value: string; color: string; background: string }) {
  return (
    <View style={[styles.summary, { backgroundColor: background }]}>
      <ThemedText style={[styles.summaryLabel, { color }]}>{label}</ThemedText>
      <ThemedText style={[styles.summaryValue, { color }]}>{value}</ThemedText>
    </View>
  );
}

function NavItem({ label, icon, onPress, active = false }: { label: string; icon: { ios: string; android: string; web: string }; onPress?: () => void; active?: boolean }) {
  return (
    <Pressable accessibilityRole="tab" accessibilityState={{ selected: active }} onPress={onPress} style={styles.navItem}>
      <SymbolView name={icon} size={16} tintColor={active ? '#10C995' : '#A5B3C7'} />
      <ThemedText style={[styles.navLabel, { color: active ? '#10C995' : '#A5B3C7' }]}>{label}</ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#EAF4FF' },
  content: { paddingHorizontal: 12, paddingTop: 10 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 22 },
  backButton: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  headerCopy: { flex: 1 },
  heading: { color: '#18233A', fontSize: 20, fontWeight: '800' },
  subtitle: { color: '#43536D', fontSize: 10 },
  badge: { color: '#6875FF', backgroundColor: '#E8EBFF', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 5, fontSize: 9, fontWeight: '700' },
  summaryRow: { flexDirection: 'row', gap: 7, marginBottom: 16 },
  summary: { flex: 1, borderRadius: 12, padding: 9 },
  summaryLabel: { fontSize: 9 },
  summaryValue: { fontSize: 20, fontWeight: '800' },
  sectionTitle: { color: '#18233A', fontSize: 14, fontWeight: '700', marginBottom: 8 },
  list: { gap: 10 },
  logCard: { backgroundColor: '#FFF', borderRadius: 15, padding: 12 },
  logTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  level: { borderRadius: 5, paddingHorizontal: 7, paddingVertical: 3, fontSize: 8, fontWeight: '700' },
  critical: { color: '#F04444', backgroundColor: '#FFE0E0' },
  warning: { color: '#E99A00', backgroundColor: '#FFF1C8' },
  time: { color: '#536681', fontSize: 8 },
  title: { color: '#18233A', fontSize: 12, fontWeight: '700' },
  detail: { color: '#536681', fontSize: 10, marginTop: 2 },
  detailsButton: { alignSelf: 'flex-end', marginTop: 8 },
  detailsText: { color: '#6875FF', fontSize: 9, fontWeight: '700' },
  bottomNavigation: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: '#FFF', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#DDE8F5', flexDirection: 'row', justifyContent: 'space-around', paddingTop: 8 },
  navItem: { alignItems: 'center', minWidth: 64, gap: 3 },
  navLabel: { fontSize: 8 },
});
