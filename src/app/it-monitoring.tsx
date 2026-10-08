import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '@/context/AuthContext';
import { ThemedText } from '@/components/themed-text';
import { runSystemDiagnostics, type DiagnosticCheck, type DiagnosticsResult, type DiagnosticStatus } from '@/services/diagnosticsService';
import { runMonitoringChecks, type MonitoringResult, type ServiceStatus } from '@/services/monitoringService';

const serviceDefinitions = [
  { key: 'appointment', label: 'Appointment Service', symbols: { ios: 'calendar', android: 'event', web: 'event' } },
  { key: 'queue', label: 'Queue Service', symbols: { ios: 'person.2.fill', android: 'people', web: 'people' } },
  { key: 'notification', label: 'Notification Service', symbols: { ios: 'bell.fill', android: 'notifications', web: 'notifications' } },
  { key: 'authentication', label: 'Authentication', symbols: { ios: 'lock.fill', android: 'lock', web: 'lock' } },
  { key: 'database', label: 'Database', symbols: { ios: 'externaldrive.fill', android: 'storage', web: 'storage' } },
] as const;

const navigationItems = [
  { label: 'Dashboard', ios: 'house.fill', android: 'home', web: 'home' },
  { label: 'Monitoring', ios: 'waveform.path.ecg', android: 'monitor_heart', web: 'monitor_heart' },
  { label: 'Error Logs', ios: 'exclamationmark.triangle.fill', android: 'warning', web: 'warning' },
  { label: 'Maintenance', ios: 'wrench.and.screwdriver.fill', android: 'build', web: 'build' },
] as const;

export default function ITMonitoringScreen() {
  const insets = useSafeAreaInsets();
  const { profile } = useAuth();
  const [monitoring, setMonitoring] = useState<MonitoringResult | null>(null);
  const [diagnostics, setDiagnostics] = useState<DiagnosticsResult | null>(null);
  const [diagnosticsLoading, setDiagnosticsLoading] = useState(false);
  const [diagnosticsError, setDiagnosticsError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const refreshMonitoring = useCallback(async (saveSnapshot = false) => {
    if (saveSnapshot) setRefreshing(true);
    else setLoading(true);

    try {
      setMonitoring(await runMonitoringChecks(saveSnapshot));
    } catch (error) {
      console.error('Unable to load IT monitoring data.', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void refreshMonitoring();
    const interval = setInterval(() => {
      void refreshMonitoring();
    }, 30000);
    return () => clearInterval(interval);
  }, [refreshMonitoring]);

  const runDiagnostics = useCallback(async () => {
    if (diagnosticsLoading) return;
    setDiagnosticsLoading(true);
    setDiagnosticsError(null);
    try {
      setDiagnostics(await runSystemDiagnostics(profile?.role));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Diagnostics could not be started.';
      setDiagnosticsError(message);
      console.error('Unable to run system diagnostics.', error);
    } finally {
      setDiagnosticsLoading(false);
    }
  }, [diagnosticsLoading, profile?.role]);

  const status = monitoring?.overallStatus;
  const statusTitle = status === 'critical' ? 'Critical System Alert' : status === 'warning' ? 'System Warning' : status === 'operational' ? 'All Systems Operational' : 'Checking System Status';
  const statusSubtitle = loading ? 'Checking live services...' : status === 'operational' ? 'Last checked just now' : 'Review service health below';
  const serviceStatuses = monitoring?.services;

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 88 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void refreshMonitoring(true)} />}>
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
            <ThemedText style={styles.operationalTitle}>{statusTitle}</ThemedText>
            <ThemedText style={styles.operationalSubtitle}>{statusSubtitle}</ThemedText>
          </View>
        </View>

        <View style={styles.availabilityCard}>
          <View style={styles.cardHeader}>
            <ThemedText style={styles.cardLabel}>System Availability</ThemedText>
            <View style={styles.changeBadge}>
              <SymbolView name={{ ios: 'arrow.up', android: 'arrow_upward', web: 'arrow_upward' }} size={9} tintColor="#0AAB83" />
              <ThemedText style={styles.changeText}>{formatChange(monitoring?.availability.change)}</ThemedText>
            </View>
          </View>
          <View style={styles.availabilityValueRow}>
            <ThemedText style={styles.availabilityValue}>{formatPercentage(monitoring?.availability.percentage)}</ThemedText>
            <ThemedText style={styles.period}>{monitoring?.availability.period ?? 'Current check'}</ThemedText>
          </View>
        </View>

        <View style={styles.metricsRow}>
          <MetricCard label="API Response" value={formatResponseTime(monitoring?.responseTime)} status={formatHealthStatus(monitoring?.responseTime)} symbols={{ ios: 'speedometer', android: 'speed', web: 'speed' }} />
          <MetricCard label="Server Load" value="N/A" status="NOT MEASURED" symbols={{ ios: 'server.rack', android: 'dns', web: 'dns' }} />
          <MetricCard label="Database" value={monitoring?.databaseUsage ?? 'Checking...'} status={formatServiceStatus(serviceStatuses?.database)} symbols={{ ios: 'externaldrive.fill', android: 'storage', web: 'storage' }} />
        </View>

        <View style={styles.diagnosticsCard}>
          <ThemedText style={styles.diagnosticsHeading}>System Diagnostics</ThemedText>
          <ThemedText style={styles.diagnosticsDescription}>
            Check the health and connectivity of your hospital system.
          </ThemedText>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: diagnosticsLoading }}
            disabled={diagnosticsLoading || profile?.role !== 'it'}
            onPress={() => void runDiagnostics()}
            style={({ pressed }) => [
              styles.diagnosticsButton,
              (pressed || diagnosticsLoading) && styles.pressed,
            ]}>
            {diagnosticsLoading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <SymbolView name={{ ios: 'stethoscope', android: 'health_and_safety', web: 'health_and_safety' }} size={14} tintColor="#FFFFFF" />
            )}
            <ThemedText style={styles.diagnosticsButtonText}>
              {diagnosticsLoading ? 'Running Diagnostics...' : diagnostics ? 'Run Again' : 'Run Diagnostics'}
            </ThemedText>
          </Pressable>

          {diagnosticsError ? <ThemedText style={styles.diagnosticsError}>{diagnosticsError}</ThemedText> : null}
          {profile?.role !== 'it' ? (
            <ThemedText style={styles.diagnosticsError}>
              Only authorized IT Supporters can run diagnostics.
            </ThemedText>
          ) : null}
          {diagnostics ? (
            <View style={styles.diagnosticResults}>
              <DiagnosticRow label="Backend Server" check={diagnostics.backend} />
              <DiagnosticRow label="Database Connection" check={diagnostics.database} />
              <DiagnosticRow label="API Response Time" check={diagnostics.apiResponseTime} />
              <DiagnosticRow
                label="Overall System Health"
                check={{
                  status: diagnostics.overallHealth,
                  message: getOverallHealthMessage(diagnostics.overallHealth),
                }}
              />
              <ThemedText style={styles.lastChecked}>
                Last checked {diagnostics.checkedAt.toDate().toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
              </ThemedText>
            </View>
          ) : (
            <ThemedText style={styles.notChecked}>Not checked yet</ThemedText>
          )}
        </View>

        <ThemedText style={styles.sectionTitle}>Services</ThemedText>
        <View style={styles.servicesCard}>
          {serviceDefinitions.map((service) => (
            <View key={service.label} style={styles.serviceRow}>
              <View style={styles.serviceIcon}>
                <SymbolView name={service.symbols} size={13} tintColor="#6875FF" />
              </View>
              <ThemedText style={styles.serviceLabel}>{service.label}</ThemedText>
              <View style={styles.serviceStatus}>
                <View style={styles.statusDot} />
                <ThemedText style={styles.statusText}>{formatServiceStatus(serviceStatuses?.[service.key])}</ThemedText>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.footerRow}>
          <View style={styles.updated}>
            <SymbolView name={{ ios: 'clock', android: 'schedule', web: 'schedule' }} size={11} tintColor="#91A0B5" />
            <ThemedText style={styles.updatedText}>Last updated {formatUpdatedTime(monitoring?.lastUpdated)}</ThemedText>
          </View>
          <Pressable accessibilityRole="button" onPress={() => void refreshMonitoring(true)} style={({ pressed }) => [styles.refreshButton, pressed && styles.pressed]}>
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
            onPress={() => {
              if (item.label === 'Dashboard') router.replace('/it-dashboard');
              if (item.label === 'Error Logs') router.replace('/error-logs');
              if (item.label === 'Maintenance') router.replace('/maintenance');
            }}
            style={styles.navItem}>
            <SymbolView name={{ ios: item.ios, android: item.android, web: item.web }} size={16} tintColor={item.label === 'Monitoring' ? '#10C995' : '#A5B3C7'} />
            <ThemedText style={[styles.navLabel, { color: item.label === 'Monitoring' ? '#10C995' : '#A5B3C7' }]}>{item.label}</ThemedText>
          </Pressable>
        ))}
      </View>
    </SafeAreaView>
  );
}

function formatPercentage(value: number | undefined) {
  return value === undefined ? '--' : `${value.toFixed(1)}%`;
}

function formatChange(value: number | null | undefined) {
  return value === null || value === undefined ? '--' : `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
}

function formatResponseTime(value: number | null | undefined) {
  return value === null || value === undefined ? '--' : `${value} ms`;
}

function formatHealthStatus(value: number | null | undefined) {
  return value === null || value === undefined ? 'CHECKING' : value < 500 ? 'HEALTHY' : 'SLOW';
}

function formatServiceStatus(value: ServiceStatus | undefined) {
  if (value === 'operational') return 'Operational';
  if (value === 'warning') return 'Warning';
  if (value === 'down') return 'Down';
  return 'Checking...';
}

function formatUpdatedTime(value: MonitoringResult['lastUpdated'] | undefined) {
  return value ? value.toDate().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : '--';
}

function getStatusColor(status: DiagnosticStatus) {
  if (status === 'healthy') return '#0AAB83';
  if (status === 'warning') return '#E99A00';
  if (status === 'critical') return '#F04444';
  return '#91A0B5';
}

function getStatusLabel(status: DiagnosticStatus) {
  if (status === 'healthy') return 'Healthy';
  if (status === 'warning') return 'Warning';
  if (status === 'critical') return 'Critical';
  return 'Unavailable';
}

function getOverallHealthMessage(status: DiagnosticStatus) {
  if (status === 'healthy') return 'All required checks passed.';
  if (status === 'warning') return 'System is available but needs attention.';
  if (status === 'critical') return 'A required system check failed.';
  return 'System health could not be determined.';
}

function DiagnosticRow({ label, check }: { label: string; check: DiagnosticCheck }) {
  const color = getStatusColor(check.status);
  const responseTime = check.responseTimeMs === undefined ? '' : ` (${check.responseTimeMs} ms)`;
  return (
    <View style={styles.diagnosticRow}>
      <View style={[styles.diagnosticDot, { backgroundColor: color }]} />
      <View style={styles.diagnosticCopy}>
        <ThemedText style={styles.diagnosticLabel}>{label}</ThemedText>
        <ThemedText style={styles.diagnosticMessage}>{check.message}{responseTime}</ThemedText>
      </View>
      <ThemedText style={[styles.diagnosticStatus, { color }]}>{getStatusLabel(check.status)}</ThemedText>
    </View>
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
  diagnosticsCard: { backgroundColor: '#FFFFFF', borderRadius: 14, padding: 12, marginTop: 12 },
  diagnosticsHeading: { color: '#18233A', fontSize: 13, lineHeight: 17, fontWeight: '800' },
  diagnosticsDescription: { color: '#536681', fontSize: 9, lineHeight: 13, marginTop: 2 },
  diagnosticsButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#6875FF', borderRadius: 11, minHeight: 34, marginTop: 10 },
  diagnosticsButtonText: { color: '#FFFFFF', fontSize: 9, fontWeight: '700' },
  diagnosticsError: { color: '#F04444', backgroundColor: '#FFE8E8', borderRadius: 8, padding: 8, fontSize: 9, lineHeight: 12, marginTop: 9 },
  diagnosticResults: { marginTop: 11 },
  diagnosticRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#E7EDF5' },
  diagnosticDot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  diagnosticCopy: { flex: 1, paddingRight: 6 },
  diagnosticLabel: { color: '#18233A', fontSize: 9, fontWeight: '700' },
  diagnosticMessage: { color: '#536681', fontSize: 8, lineHeight: 11, marginTop: 1 },
  diagnosticStatus: { fontSize: 8, fontWeight: '700' },
  lastChecked: { color: '#91A0B5', fontSize: 8, marginTop: 7 },
  notChecked: { color: '#91A0B5', fontSize: 9, marginTop: 10 },
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
