import { router } from 'expo-router';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, RefreshControl, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { getErrorLogs, getErrorLogsByCategory, getErrorSummary, type ErrorLog, type ErrorSummary } from '@/services/errorLogService';

type ErrorCategory = 'critical' | 'warning' | 'resolved';

export default function ErrorLogsScreen() {
  const insets = useSafeAreaInsets();
  const [logs, setLogs] = useState<ErrorLog[]>([]);
  const [summary, setSummary] = useState<ErrorSummary>({ critical: 0, warnings: 0, resolved: 0 });
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [popupCategory, setPopupCategory] = useState<ErrorCategory | null>(null);
  const [popupLogs, setPopupLogs] = useState<ErrorLog[]>([]);
  const [popupLoading, setPopupLoading] = useState(false);
  const [popupError, setPopupError] = useState<string | null>(null);

  const loadLogs = async () => {
    setRefreshing(true);
    try {
      const [nextLogs, nextSummary] = await Promise.all([getErrorLogs(), getErrorSummary()]);
      setLogs(nextLogs);
      setSummary(nextSummary);
      setLoadError(
        nextLogs.length === 0 &&
          nextSummary.critical + nextSummary.warnings + nextSummary.resolved > 0
          ? 'Error records exist, but their fields are incomplete or invalid. Check title, message, service, severity, status, and createdAt.'
          : null
      );
    } catch (error) {
      console.error('Unable to load error logs from Firestore.', error);
      setLoadError('Unable to load error logs. Check Firestore permissions and try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void loadLogs();
  }, []);

  const openCategory = async (category: ErrorCategory) => {
    setPopupCategory(category);
    setPopupLogs([]);
    setPopupError(null);
    setPopupLoading(true);
    try {
      setPopupLogs(await getErrorLogsByCategory(category));
    } catch (error) {
      console.error(`Unable to load ${category} error logs.`, error);
      setPopupError('Unable to load these error records. Check Firestore permissions and try again.');
    } finally {
      setPopupLoading(false);
    }
  };

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
          <Summary label="Critical" value={String(summary.critical)} color="#F04444" background="#FFE0E0" onPress={() => void openCategory('critical')} />
          <Summary label="Warnings" value={String(summary.warnings)} color="#E99A00" background="#FFF1C8" onPress={() => void openCategory('warning')} />
          <Summary label="Resolved" value={String(summary.resolved)} color="#0AAB83" background="#DDF8F1" onPress={() => void openCategory('resolved')} />
        </View>
        {loadError ? <ThemedText style={styles.loadError}>{loadError}</ThemedText> : null}

        <ThemedText style={styles.sectionTitle}>Recent Errors</ThemedText>
        <View style={styles.list}>
          {unresolvedLogs.map((log) => (
            <View key={log.id} style={styles.logCard}>
              <View style={styles.logTop}>
                <ThemedText style={[styles.level, getSeverityStyle(log.severity)]}>{capitalize(log.severity)}</ThemedText>
                <ThemedText style={styles.time}>{formatTime(log.createdAt)}</ThemedText>
              </View>
              <ThemedText style={styles.title}>{log.title}</ThemedText>
              <ThemedText style={styles.type}>Type: {capitalize(log.service)} · {capitalize(log.severity)} error</ThemedText>
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
              <ThemedText style={styles.type}>Type: {capitalize(log.service)} · {capitalize(log.severity)} error</ThemedText>
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
        <NavItem label="Maintenance" icon={{ ios: 'wrench.and.screwdriver.fill', android: 'build', web: 'build' }} onPress={() => router.replace('/maintenance-backup')} />
      </View>
      <ErrorCategoryModal
        category={popupCategory}
        logs={popupLogs}
        loading={popupLoading}
        error={popupError}
        onClose={() => setPopupCategory(null)}
      />
    </SafeAreaView>
  );
}

function Summary({ label, value, color, background, onPress }: { label: string; value: string; color: string; background: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`Show ${label} errors`} onPress={onPress} style={[styles.summary, { backgroundColor: background }]}>
      <ThemedText style={[styles.summaryLabel, { color }]}>{label}</ThemedText>
      <ThemedText style={[styles.summaryValue, { color }]}>{value}</ThemedText>
      <ThemedText style={[styles.summaryHint, { color }]}>View all ›</ThemedText>
    </Pressable>
  );
}

function ErrorCategoryModal({
  category,
  logs,
  loading,
  error,
  onClose,
}: {
  category: ErrorCategory | null;
  logs: ErrorLog[];
  loading: boolean;
  error: string | null;
  onClose: () => void;
}) {
  const title = category === 'critical' ? 'Critical Errors' : category === 'warning' ? 'Warnings' : 'Resolved Errors';
  const emptyMessage = category === 'resolved' ? 'No resolved errors found' : `No ${category ?? ''} errors found`;

  return (
    <Modal visible={category !== null} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <ThemedText style={styles.modalTitle}>{title}</ThemedText>
            <Pressable accessibilityRole="button" accessibilityLabel="Close error list" onPress={onClose} style={styles.closeButton}>
              <ThemedText style={styles.closeText}>×</ThemedText>
            </Pressable>
          </View>
          {loading ? <ThemedText style={styles.emptyText}>Loading errors...</ThemedText> : null}
          {error ? <ThemedText style={styles.loadError}>{error}</ThemedText> : null}
          {!loading && !error ? (
            <ScrollView contentContainerStyle={styles.modalList}>
              {logs.map((log) => (
                <Pressable key={log.id} onPress={() => router.push({ pathname: '/error-log-details', params: { id: log.id } })} style={styles.modalLog}>
                  <View style={styles.logTop}>
                    <ThemedText style={[styles.level, category === 'resolved' ? styles.resolvedLevel : getSeverityStyle(log.severity)]}>
                      {category === 'resolved' ? 'Resolved' : capitalize(log.severity)}
                    </ThemedText>
                    <ThemedText style={styles.time}>{formatTime(category === 'resolved' ? log.resolvedAt ?? log.createdAt : log.createdAt)}</ThemedText>
                  </View>
                  <ThemedText style={styles.title}>{log.title}</ThemedText>
                  <ThemedText style={styles.type}>{capitalize(log.service)}</ThemedText>
                  <ThemedText style={styles.detail} numberOfLines={2}>{log.message}</ThemedText>
                </Pressable>
              ))}
              {logs.length === 0 ? <ThemedText style={styles.emptyText}>{emptyMessage}</ThemedText> : null}
            </ScrollView>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

function getSeverityStyle(severity: ErrorLog['severity']) {
  if (severity === 'critical') return styles.critical;
  if (severity === 'info') return styles.info;
  return styles.warning;
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
  summaryHint: { fontSize: 8, fontWeight: '700', marginTop: 3 },
  sectionTitle: { color: '#18233A', fontSize: 14, fontWeight: '700', marginBottom: 8 },
  list: { gap: 10 },
  logCard: { backgroundColor: '#FFF', borderRadius: 15, padding: 12 },
  logTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  level: { borderRadius: 5, paddingHorizontal: 7, paddingVertical: 3, fontSize: 8, fontWeight: '700' },
  critical: { color: '#F04444', backgroundColor: '#FFE0E0' },
  warning: { color: '#E99A00', backgroundColor: '#FFF1C8' },
  info: { color: '#6875FF', backgroundColor: '#E8EBFF' },
  resolvedLevel: { color: '#0AAB83', backgroundColor: '#DDF8F1', borderRadius: 5, paddingHorizontal: 7, paddingVertical: 3, fontSize: 8, fontWeight: '700' },
  time: { color: '#536681', fontSize: 8 },
  title: { color: '#18233A', fontSize: 12, fontWeight: '700' },
  type: { color: '#6875FF', fontSize: 9, marginTop: 4, fontWeight: '600' },
  detail: { color: '#536681', fontSize: 10, marginTop: 2 },
  detailsButton: { alignSelf: 'flex-end', marginTop: 8 },
  detailsText: { color: '#6875FF', fontSize: 9, fontWeight: '700' },
  bottomNavigation: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: '#FFF', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#DDE8F5', flexDirection: 'row', justifyContent: 'space-around', paddingTop: 8 },
  navItem: { alignItems: 'center', minWidth: 64, gap: 3 },
  navLabel: { fontSize: 8 },
  emptyText: { color: '#536681', fontSize: 11, padding: 16, textAlign: 'center' },
  refreshButton: { alignSelf: 'flex-end', flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#6875FF', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 7, marginTop: 10 },
  refreshText: { color: '#FFF', fontSize: 9, fontWeight: '700' },
  loadError: { color: '#F04444', backgroundColor: '#FFE8E8', borderRadius: 8, fontSize: 10, marginBottom: 10, padding: 8 },
  modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(24, 35, 58, 0.45)' },
  modalCard: { maxHeight: '82%', backgroundColor: '#EAF4FF', borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 16 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  modalTitle: { color: '#18233A', fontSize: 18, fontWeight: '800' },
  closeButton: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF' },
  closeText: { color: '#18233A', fontSize: 24, lineHeight: 26 },
  modalList: { gap: 10, paddingBottom: 20 },
  modalLog: { backgroundColor: '#FFF', borderRadius: 14, padding: 12 },
});

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function formatTime(timestamp: ErrorLog['createdAt']) {
  if (timestamp.toMillis() === 0) return 'Date unavailable';
  return timestamp.toDate().toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
}
