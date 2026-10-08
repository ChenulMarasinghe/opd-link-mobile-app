import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { formatMegabytes, getBackupHistory, getLatestBackup, getNextBackupTime, type BackupRecord } from '@/services/backupService';
import { getCurrentMaintenance, getNextMaintenance, type MaintenanceRecord } from '@/services/maintenanceService';

const navigationItems = [
  { label: 'Dashboard', ios: 'house.fill', android: 'home', web: 'home' },
  { label: 'Monitoring', ios: 'waveform.path.ecg', android: 'monitor_heart', web: 'monitor_heart' },
  { label: 'Error Logs', ios: 'exclamationmark.triangle.fill', android: 'warning', web: 'warning' },
  { label: 'Maintenance', ios: 'wrench.and.screwdriver.fill', android: 'build', web: 'build' },
] as const;

export default function MaintenanceScreen() {
  const insets = useSafeAreaInsets();
  const [currentMaintenance, setCurrentMaintenance] = useState<MaintenanceRecord | null>(null);
  const [nextMaintenance, setNextMaintenance] = useState<MaintenanceRecord | null>(null);
  const [backup, setBackup] = useState<BackupRecord | null>(null);
  const [backupHistory, setBackupHistory] = useState<BackupRecord[]>([]);
  const [nextBackupTime, setNextBackupTime] = useState<Awaited<ReturnType<typeof getNextBackupTime>>>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const [current, next, latestBackup, backups, nextTime] = await Promise.all([
        getCurrentMaintenance(),
        getNextMaintenance(),
        getLatestBackup(),
        getBackupHistory(),
        getNextBackupTime(),
      ]);
      setCurrentMaintenance(current);
      setNextMaintenance(next);
      setBackup(latestBackup);
      setBackupHistory(backups);
      setNextBackupTime(nextTime);
      setLastUpdated(new Date());
      setLoadError(null);
    } catch (error) {
      console.error('Unable to load maintenance and backup data from Firestore.', error);
      setLoadError('Live maintenance data is unavailable');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const navigateTo = (label: (typeof navigationItems)[number]['label']) => {
    if (label === 'Dashboard') router.replace('/it-dashboard');
    if (label === 'Monitoring') router.replace('/it-monitoring');
    if (label === 'Error Logs') router.replace('/error-logs');
  };

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 84 }]} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void refresh()} />}>
        <View style={styles.header}>
          <Pressable accessibilityRole="button" accessibilityLabel="Back to dashboard" onPress={() => router.replace('/it-dashboard')} style={styles.backButton}>
            <SymbolView name={{ ios: 'chevron.left', android: 'arrow_back', web: 'arrow_back' }} size={15} tintColor="#18233A" />
          </Pressable>
          <View style={styles.headerCopy}>
            <ThemedText style={styles.heading}>Maintenance &amp; Backup</ThemedText>
            <ThemedText style={styles.subtitle}>System maintenance status</ThemedText>
          </View>
          <ThemedText style={styles.badge}>OPD</ThemedText>
        </View>

        <View style={styles.card}>
          <View style={styles.statusHeader}>
            <View style={styles.checkCircle}><SymbolView name={{ ios: 'checkmark', android: 'check', web: 'check' }} size={17} tintColor="#0AAB83" /></View>
            <ThemedText style={styles.cardTitle}>{currentMaintenance?.title ?? 'No Maintenance Scheduled'}</ThemedText>
          </View>
          <ThemedText style={styles.successText}>{currentMaintenance?.description ?? (loadError ?? 'All systems active')}</ThemedText>
          <View style={styles.divider} />
          <View style={styles.nextRow}>
            <ThemedText style={styles.muted}>Next Scheduled</ThemedText>
            <ThemedText style={styles.bold}>{formatMaintenanceWindow(nextMaintenance)}</ThemedText>
          </View>
          <ThemedText style={styles.note}>{nextMaintenance?.description ?? '* Users may experience brief service interruptions during this window.'}</ThemedText>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <ThemedText style={styles.cardLabel}>Backup Status</ThemedText>
            <ThemedText style={styles.completedBadge}>{capitalize(backup?.status ?? 'unavailable')}</ThemedText>
          </View>
          <View style={styles.completedIcon}><SymbolView name={{ ios: 'checkmark', android: 'check', web: 'check' }} size={22} tintColor="#0AAB83" /></View>
          <ThemedText style={styles.backupTitle}>{backup ? `Backup ${capitalize(backup.status)}` : 'Backup Unavailable'}</ThemedText>
          <ThemedText style={styles.backupTime}>{backup ? formatDateTime(backup.completedAt ?? backup.startedAt) : 'No backup records found'}</ThemedText>
          <View style={styles.statsRow}>
            <Stat label="Next Backup" value={formatDateTime(nextBackupTime)} />
            <Stat label="Backup Size" value={formatMegabytes(backup?.sizeMB)} />
          </View>
          <View style={styles.storageHeader}><ThemedText style={styles.muted}>Cloud Storage Allocation</ThemedText><ThemedText style={styles.storageText}>{formatStoragePercentage(backup)}</ThemedText></View>
          <View style={styles.progress}><View style={[styles.progressFill, { width: `${storagePercentage(backup)}%` }]} /></View>
          <View style={styles.storageHeader}><ThemedText style={styles.muted}>{formatMegabytes(backup?.storageUsedMB)} Used</ThemedText><ThemedText style={styles.muted}>{formatMegabytes(backup?.storageLimitMB)} Limit</ThemedText></View>
        </View>

        <ThemedText style={styles.sectionTitle}>Backup Components</ThemedText>
        <View style={styles.listCard}>
          {(backup?.components ?? []).map((component, index) => (
            <View key={component.name} style={[styles.componentRow, index > 0 && styles.rowBorder]}>
              <View style={styles.componentIcon}><SymbolView name={{ ios: index === 0 ? 'person.fill' : index === 1 ? 'calendar' : index === 2 ? 'waveform.path.ecg' : 'lock.fill', android: index === 0 ? 'person' : index === 1 ? 'event' : index === 2 ? 'monitor_heart' : 'lock', web: index === 0 ? 'person' : index === 1 ? 'event' : index === 2 ? 'monitor_heart' : 'lock' }} size={14} tintColor="#6875FF" /></View>
              <ThemedText style={styles.componentLabel}>{component.name}</ThemedText>
              <ThemedText style={styles.componentStatus}>● {capitalize(component.status)}</ThemedText>
            </View>
          ))}
          {(backup?.components ?? []).length === 0 ? <ThemedText style={styles.emptyText}>{loading ? 'Loading backup components...' : 'No backup components found'}</ThemedText> : null}
        </View>

        <ThemedText style={styles.sectionTitle}>Backup History</ThemedText>
        <View style={styles.historyCard}>
          {backupHistory.map((historyItem) => (
            <View key={historyItem.id} style={styles.historyRow}>
              <ThemedText style={styles.historyDot}>•</ThemedText>
              <View style={styles.historyCopy}><ThemedText style={styles.bold}>{formatDate(historyItem.completedAt ?? historyItem.startedAt)}</ThemedText><ThemedText style={styles.muted}>{formatTime(historyItem.completedAt ?? historyItem.startedAt)} • {capitalize(historyItem.type)}</ThemedText></View>
              <ThemedText style={styles.completedBadge}>{capitalize(historyItem.status)}</ThemedText>
            </View>
          ))}
          {backupHistory.length === 0 ? <ThemedText style={styles.emptyText}>{loading ? 'Loading backup history...' : 'No backup history found'}</ThemedText> : null}
        </View>

        <Pressable accessibilityRole="button" onPress={() => void refresh()} style={styles.refreshButton}>
          <SymbolView name={{ ios: 'arrow.clockwise', android: 'refresh', web: 'refresh' }} size={12} tintColor="#FFF" />
          <ThemedText style={styles.refreshText}>Refresh • {lastUpdated ? formatTime(lastUpdated) : '--'}</ThemedText>
        </Pressable>
      </ScrollView>

      <View style={[styles.bottomNavigation, { paddingBottom: Math.max(insets.bottom, 8) }]}>
        {navigationItems.map((item) => {
          const active = item.label === 'Maintenance';
          return <Pressable accessibilityRole="tab" accessibilityState={{ selected: active }} key={item.label} onPress={() => navigateTo(item.label)} style={styles.navItem}><SymbolView name={{ ios: item.ios, android: item.android, web: item.web }} size={16} tintColor={active ? '#10C995' : '#A5B3C7'} /><ThemedText style={[styles.navLabel, { color: active ? '#10C995' : '#A5B3C7' }]}>{item.label}</ThemedText></Pressable>;
        })}
      </View>
    </SafeAreaView>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return <View style={styles.stat}><ThemedText style={styles.muted}>{label}</ThemedText><ThemedText style={styles.bold}>{value}</ThemedText></View>;
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function formatDateTime(value: { toDate: () => Date } | null | undefined) {
  return value ? value.toDate().toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : '--';
}

function formatDate(value: { toDate: () => Date }) {
  return value.toDate().toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function formatTime(value: Date | { toDate: () => Date }) {
  const date = value instanceof Date ? value : value.toDate();
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function formatMaintenanceWindow(maintenance: MaintenanceRecord | null) {
  if (!maintenance) return 'No upcoming maintenance';
  return `${formatDateTime(maintenance.scheduledStart)} - ${formatTime(maintenance.scheduledEnd)}`;
}

function storagePercentage(backup: BackupRecord | null) {
  if (!backup?.storageUsedMB || !backup.storageLimitMB) return 0;
  return Math.min(100, Math.round((backup.storageUsedMB / backup.storageLimitMB) * 100));
}

function formatStoragePercentage(backup: BackupRecord | null) {
  return `${storagePercentage(backup)}% Used`;
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#EAF4FF' }, content: { paddingHorizontal: 12, paddingTop: 10 }, header: { flexDirection: 'row', alignItems: 'center', marginBottom: 13 }, backButton: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center', marginRight: 10 }, headerCopy: { flex: 1 }, heading: { color: '#18233A', fontSize: 18, fontWeight: '800' }, subtitle: { color: '#43536D', fontSize: 10 }, badge: { color: '#6875FF', backgroundColor: '#E8EBFF', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 5, fontSize: 9, fontWeight: '700' }, card: { backgroundColor: '#FFF', borderRadius: 15, padding: 11, marginBottom: 9 }, statusHeader: { flexDirection: 'row', alignItems: 'center', gap: 9 }, checkCircle: { width: 29, height: 29, borderRadius: 15, backgroundColor: '#DDF8F1', alignItems: 'center', justifyContent: 'center' }, cardTitle: { color: '#18233A', fontSize: 13, fontWeight: '800' }, successText: { color: '#0AAB83', fontSize: 10, marginLeft: 38 }, divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#DDE8F5', marginVertical: 5 }, nextRow: { flexDirection: 'row', justifyContent: 'space-between' }, muted: { color: '#536681', fontSize: 9 }, bold: { color: '#18233A', fontSize: 10, fontWeight: '700' }, note: { color: '#91A0B5', fontSize: 9, fontStyle: 'italic', marginTop: 4 }, cardHeader: { flexDirection: 'row', justifyContent: 'space-between' }, cardLabel: { color: '#43536D', fontSize: 11 }, completedBadge: { color: '#0AAB83', backgroundColor: '#DDF8F1', borderRadius: 5, paddingHorizontal: 7, paddingVertical: 3, fontSize: 8, fontWeight: '700' }, completedIcon: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#DDF8F1', alignSelf: 'center', alignItems: 'center', justifyContent: 'center', marginTop: 8 }, backupTitle: { color: '#18233A', fontSize: 14, fontWeight: '800', textAlign: 'center', marginTop: 4 }, backupTime: { color: '#536681', fontSize: 10, textAlign: 'center' }, statsRow: { flexDirection: 'row', gap: 7, marginTop: 8 }, stat: { flex: 1, backgroundColor: '#F3F6FA', borderRadius: 7, padding: 7, gap: 2 }, storageHeader: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }, storageText: { color: '#6875FF', fontSize: 9 }, progress: { height: 6, backgroundColor: '#E2E8F0', marginTop: 4 }, progressFill: { width: '0%', height: 6, backgroundColor: '#6875FF' }, sectionTitle: { color: '#18233A', fontSize: 14, fontWeight: '700', marginBottom: 7 }, listCard: { backgroundColor: '#FFF', borderRadius: 14, overflow: 'hidden', marginBottom: 9 }, componentRow: { flexDirection: 'row', alignItems: 'center', padding: 8 }, rowBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#DDE8F5' }, componentIcon: { width: 28, height: 28, borderRadius: 8, backgroundColor: '#EEF0FF', alignItems: 'center', justifyContent: 'center', marginRight: 8 }, componentLabel: { color: '#18233A', fontSize: 11, flex: 1 }, componentStatus: { color: '#0AAB83', fontSize: 9 }, historyCard: { backgroundColor: '#FFF', borderRadius: 14, padding: 8, gap: 6 }, historyRow: { flexDirection: 'row', alignItems: 'center' }, historyDot: { color: '#0AAB83', fontSize: 22, width: 16 }, historyCopy: { flex: 1 }, emptyText: { color: '#536681', fontSize: 10, padding: 10, textAlign: 'center' }, refreshButton: { alignSelf: 'flex-end', flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#6875FF', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 7, marginTop: 10 }, refreshText: { color: '#FFF', fontSize: 9, lineHeight: 12, fontWeight: '700' }, bottomNavigation: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: '#FFF', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#DDE8F5', flexDirection: 'row', justifyContent: 'space-around', paddingTop: 8 }, navItem: { alignItems: 'center', minWidth: 64, gap: 3 }, navLabel: { fontSize: 8 },
});
