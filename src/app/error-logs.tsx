import { router } from 'expo-router';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { getErrorLogs, getErrorSummary, type ErrorLog, type ErrorSummary } from '@/services/errorLogService';

export default function ErrorLogsScreen() {
  const insets = useSafeAreaInsets();
  const [logs, setLogs] = useState<ErrorLog[]>([]);
  const [summary, setSummary] = useState<ErrorSummary>({ critical: 0, warnings: 0, resolved: 0 });
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadLogs = async () => {
    setRefreshing(true);
    try {
      const [nextLogs, nextSummary] = await Promise.all([getErrorLogs(), getErrorSummary()]);
      setLogs(nextLogs);
      setSummary(nextSummary);
    } catch (error) {
      console.error('Unable to load error logs from Firestore.', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void loadLogs();
  }, []);

  const filteredLogs = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return logs;
    return logs.filter((log) =>
      [log.title, log.message, log.service].some((value) => value.toLowerCase().includes(term))
    );
  }, [logs, search]);
  const unresolvedLogs = filteredLogs.filter((log) => log.status !== 'resolved');
  const resolvedLogs = filteredLogs.filter((log) => log.status === 'resolved');

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 84 }]} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadLogs} />}>
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

        <TextInput value={search} onChangeText={setSearch} placeholder="Search Error Logs" placeholderTextColor="#91A0B5" style={styles.searchInput} />
        <View style={styles.summaryRow}>
          <Summary label="Critical" value={String(summary.critical)} color="#F04444" background="#FFE0E0" />
          <Summary label="Warnings" value={String(summary.warnings)} color="#E99A00" background="#FFF1C8" />
          <Summary label="Resolved" value={String(summary.resolved)} color="#0AAB83" background="#DDF8F1" />
        </View>

        <ThemedText style={styles.sectionTitle}>Recent Errors</ThemedText>
        <View style={styles.list}>
          {unresolvedLogs.map((log) => (
            <View key={log.id} style={styles.logCard}>
              <View style={styles.logTop}>
                <ThemedText style={[styles.level, log.severity === 'critical' ? styles.critical : styles.warning]}>{capitalize(log.severity)}</ThemedText>
                <ThemedText style={styles.time}>{formatTime(log.createdAt)}</ThemedText>
              </View>
              <ThemedText style={styles.title}>{log.title}</ThemedText>
              <ThemedText style={styles.detail}>{log.message}</ThemedText>
              <Pressable accessibilityRole="button" onPress={() => router.push({ pathname: '/error-log-details', params: { id: log.id } })} style={styles.detailsButton}>
                <ThemedText style={styles.detailsText}>View Details ›</ThemedText>
              </Pressable>
            </View>
          ))}
          {!loading && unresolvedLogs.length === 0 ? <ThemedText style={styles.emptyText}>No unresolved errors found</ThemedText> : null}
        </View>
        <ThemedText style={styles.sectionTitle}>Resolved Errors</ThemedText>
        <View style={styles.list}>
          {resolvedLogs.map((log) => (
            <View key={log.id} style={styles.logCard}>
              <View style={styles.logTop}>
                <ThemedText style={styles.resolvedLevel}>Resolved</ThemedText>
                <ThemedText style={styles.time}>{formatTime(log.resolvedAt ?? log.createdAt)}</ThemedText>
              </View>
              <ThemedText style={styles.title}>{log.title}</ThemedText>
              <ThemedText style={styles.detail}>{log.message}</ThemedText>
              <Pressable accessibilityRole="button" onPress={() => router.push({ pathname: '/error-log-details', params: { id: log.id } })} style={styles.detailsButton}>
                <ThemedText style={styles.detailsText}>View Details ›</ThemedText>
              </Pressable>
            </View>
          ))}
          {!loading && resolvedLogs.length === 0 ? <ThemedText style={styles.emptyText}>No resolved errors found</ThemedText> : null}
        </View>
        <Pressable accessibilityRole="button" onPress={() => void loadLogs()} style={styles.refreshButton}>
          <SymbolView name={{ ios: 'arrow.clockwise', android: 'refresh', web: 'refresh' }} size={12} tintColor="#FFF" />
          <ThemedText style={styles.refreshText}>Refresh</ThemedText>
        </Pressable>
      </ScrollView>

      <View style={[styles.bottomNavigation, { paddingBottom: Math.max(insets.bottom, 8) }]}>
        <NavItem label="Dashboard" icon={{ ios: 'house.fill', android: 'home', web: 'home' }} onPress={() => router.replace('/it-dashboard')} />
        <NavItem label="Monitoring" icon={{ ios: 'waveform.path.ecg', android: 'monitor_heart', web: 'monitor_heart' }} onPress={() => router.replace('/it-monitoring')} />
        <NavItem active label="Error Logs" icon={{ ios: 'exclamationmark.triangle.fill', android: 'warning', web: 'warning' }} />
        <NavItem label="Maintenance" icon={{ ios: 'wrench.and.screwdriver.fill', android: 'build', web: 'build' }} onPress={() => router.replace('/maintenance')} />
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

function NavItem({ label, icon, onPress, active = false }: { label: string; icon: NonNullable<SymbolViewProps['name']>; onPress?: () => void; active?: boolean }) {
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
  searchInput: { backgroundColor: '#FFF', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, color: '#18233A', fontSize: 11, marginBottom: 12 },
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
  resolvedLevel: { color: '#0AAB83', backgroundColor: '#DDF8F1', borderRadius: 5, paddingHorizontal: 7, paddingVertical: 3, fontSize: 8, fontWeight: '700' },
  time: { color: '#536681', fontSize: 8 },
  title: { color: '#18233A', fontSize: 12, fontWeight: '700' },
  detail: { color: '#536681', fontSize: 10, marginTop: 2 },
  detailsButton: { alignSelf: 'flex-end', marginTop: 8 },
  detailsText: { color: '#6875FF', fontSize: 9, fontWeight: '700' },
  bottomNavigation: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: '#FFF', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#DDE8F5', flexDirection: 'row', justifyContent: 'space-around', paddingTop: 8 },
  navItem: { alignItems: 'center', minWidth: 64, gap: 3 },
  navLabel: { fontSize: 8 },
  emptyText: { color: '#536681', fontSize: 11, padding: 16, textAlign: 'center' },
  refreshButton: { alignSelf: 'flex-end', flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#6875FF', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 7, marginTop: 10 },
  refreshText: { color: '#FFF', fontSize: 9, fontWeight: '700' },
});

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function formatTime(timestamp: ErrorLog['createdAt']) {
  return timestamp.toDate().toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
}
