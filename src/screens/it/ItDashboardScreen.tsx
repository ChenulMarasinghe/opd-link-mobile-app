import { SymbolView } from 'expo-symbols';
import * as Print from 'expo-print';
import { router } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { ActivityItem, type ActivityTone } from '@/components/it-dashboard/activity-item';
import { StatusCard, type StatusCardTone } from '@/components/it-dashboard/status-card';
import { ThemedText } from '@/components/themed-text';
import {
  getDashboardData,
  type ITDashboardData,
  type SystemActivity,
} from '@/services/itDashboardService';

const emptyDashboardData: ITDashboardData = {
  systemHealth: null,
  unresolvedCriticalErrors: 0,
  latestBackup: null,
  latestMaintenance: null,
  recentActivities: [],
};

const navigationItems = [
  { label: 'Dashboard', ios: 'house.fill', android: 'home', web: 'home', active: true },
  { label: 'Monitoring', ios: 'waveform.path.ecg', android: 'monitor_heart', web: 'monitor_heart', active: false },
  { label: 'Error Logs', ios: 'exclamationmark.triangle.fill', android: 'warning', web: 'warning', active: false },
  { label: 'Maintenance', ios: 'wrench.and.screwdriver.fill', android: 'build', web: 'build', active: false },
] as const;

export default function ITDashboardScreen() {
  const insets = useSafeAreaInsets();
  const [dashboardData, setDashboardData] = useState(emptyDashboardData);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadDashboardData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      setDashboardData(await getDashboardData());
      setLoadError(null);
    } catch (error) {
      console.error('Unable to load IT dashboard data from Firestore.', error);
      setLoadError('Live data is unavailable');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadDashboardData();
  }, [loadDashboardData]);

  const cards = useMemo(() => {
    const health = dashboardData.systemHealth;
    const uptime = health ? `${health.uptimePercentage.toFixed(1)}% Uptime` : 'Unavailable';
    const errorStatus = loading ? 'Loading...' : `${dashboardData.unresolvedCriticalErrors} Critical Alerts`;
    const backupStatus = loading
      ? 'Loading...'
      : dashboardData.latestBackup?.status ?? 'Unavailable';

    return [
      { title: 'IT Monitoring', subtitle: 'System health & performance', status: uptime, tone: 'monitoring' as const },
      { title: 'Error Logs', subtitle: 'Technical issues & events', status: errorStatus, tone: 'critical' as const },
      { title: 'Maintenance & Backup', subtitle: 'System maintenance status', status: backupStatus, tone: 'maintenance' as const },
    ];
  }, [dashboardData, loading]);

  const recentActivities = useMemo(
    () => dashboardData.recentActivities.map(toActivityItem),
    [dashboardData.recentActivities]
  );

  const overallStatus = dashboardData.systemHealth?.overallStatus;
  const operationalTitle =
    overallStatus === 'critical'
      ? 'Critical System Alert'
      : overallStatus === 'warning'
        ? 'System Warning'
        : overallStatus === 'operational'
          ? 'All Systems Operational'
          : 'System Status Unavailable';
  const operationalSubtitle = loadError
    ? loadError
    : loading
      ? 'Loading live system status...'
      : overallStatus === 'operational'
        ? 'Uptime normal • checked just now'
        : 'Review the latest system status';

  const handleCardPress = (title: string) => {
    if (title === 'IT Monitoring') {
      router.push('/it-monitoring');
    } else if (title === 'Error Logs') {
      router.push('/error-logs');
    } else if (title === 'Maintenance & Backup') {
      router.push('/maintenance-backup');
    }
  };

  const exportReport = async () => {
    if (exporting) return;

    setExporting(true);
    const health = dashboardData.systemHealth;
    const generatedAt = new Date().toLocaleString();
    const activityRows = dashboardData.recentActivities
      .map(
        (activity) =>
          `<tr><td>${escapeHtml(activity.title)}</td><td>${escapeHtml(
            activity.status.toUpperCase()
          )}</td><td>${escapeHtml(formatActivityTime(activity.createdAt))}</td></tr>`
      )
      .join('');
    const html = `
      <!doctype html>
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <style>
            @page { margin: 36px; }
            body { color: #18233A; font-family: Arial, sans-serif; }
            .header { background: #EAF4FF; border-radius: 14px; padding: 22px; }
            h1 { margin: 0 0 6px; font-size: 24px; }
            .muted { color: #536681; }
            .status { color: #0AAB83; font-size: 18px; font-weight: bold; }
            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 20px; }
            .metric { border: 1px solid #DDE8F5; border-radius: 10px; padding: 12px; }
            .label { color: #536681; font-size: 12px; }
            .value { font-size: 17px; font-weight: bold; margin-top: 5px; }
            table { border-collapse: collapse; margin-top: 20px; width: 100%; }
            th, td { border-bottom: 1px solid #DDE8F5; padding: 9px 5px; text-align: left; font-size: 12px; }
            th { color: #536681; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>OPD Link IT System Report</h1>
            <div class="muted">Generated ${escapeHtml(generatedAt)}</div>
            <p class="status">${escapeHtml(health?.overallStatus ?? 'Unavailable')}</p>
          </div>
          <div class="grid">
            <div class="metric"><div class="label">Uptime</div><div class="value">${escapeHtml(health ? `${health.uptimePercentage.toFixed(1)}%` : 'Unavailable')}</div></div>
            <div class="metric"><div class="label">Critical alerts</div><div class="value">${dashboardData.unresolvedCriticalErrors}</div></div>
            <div class="metric"><div class="label">Latest backup</div><div class="value">${escapeHtml(dashboardData.latestBackup?.status ?? 'Unavailable')}</div></div>
            <div class="metric"><div class="label">Latest maintenance</div><div class="value">${escapeHtml(dashboardData.latestMaintenance?.status ?? 'Unavailable')}</div></div>
          </div>
          <h2>Recent System Activity</h2>
          <table>
            <thead><tr><th>Activity</th><th>Status</th><th>Time</th></tr></thead>
            <tbody>${activityRows || '<tr><td colspan="3">No recent system activity</td></tr>'}</tbody>
          </table>
        </body>
      </html>`;

    try {
      const { uri } = await Print.printToFileAsync({ html });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          UTI: '.pdf',
          dialogTitle: 'Share OPD Link IT System Report',
        });
      } else {
        await Print.printAsync({ html });
      }
    } catch (error) {
      console.error('Unable to generate the IT system PDF report.', error);
    } finally {
      setExporting(false);
    }
  };

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 84 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => void loadDashboardData(true)} />
        }>
        <View style={styles.header}>
          <View>
            <ThemedText style={styles.heading}>IT Dashboard</ThemedText>
            <ThemedText style={styles.welcome}>Welcome back, Admin Support</ThemedText>
          </View>
        </View>

        <View style={styles.operationalCard}>
          <View style={styles.checkCircle}>
            <SymbolView name={{ ios: 'checkmark', android: 'check', web: 'check' }} size={17} tintColor="#0AAB83" />
          </View>
          <View>
            <ThemedText style={styles.operationalTitle}>{operationalTitle}</ThemedText>
            <ThemedText style={styles.operationalSubtitle}>{operationalSubtitle}</ThemedText>
          </View>
        </View>

        <View style={styles.cardList}>
          {cards.map((card) => (
            <StatusCard key={card.title} {...card} onPress={() => handleCardPress(card.title)} />
          ))}
        </View>

        <ThemedText style={styles.sectionTitle}>Quick Actions</ThemedText>
        <View style={styles.quickActionsCard}>
          <QuickAction
            label="Run Diagnostics"
            icon={{ ios: 'stethoscope', android: 'health_and_safety', web: 'health_and_safety' }}
            tone="green"
            onPress={() => router.push({ pathname: '/it-monitoring', params: { runDiagnostics: '1' } })}
          />
          <QuickAction
            label="Refresh Status"
            icon={{ ios: 'arrow.clockwise', android: 'refresh', web: 'refresh' }}
            tone="blue"
            onPress={() => void loadDashboardData(true)}
          />
          <QuickAction
            label={exporting ? 'Generating PDF...' : 'Export PDF'}
            icon={{ ios: 'doc.text', android: 'description', web: 'description' }}
            tone="purple"
            disabled={exporting}
            onPress={() => void exportReport()}
          />
        </View>

        <ThemedText style={styles.sectionTitle}>Recent System Activity</ThemedText>
        <View style={styles.activityCard}>
          {recentActivities.length > 0 ? (
            recentActivities.map((activity, index) => (
              <ActivityItem key={activity.id} {...activity} isLast={index === recentActivities.length - 1} />
            ))
          ) : (
            <ThemedText style={styles.emptyActivity}>
              {loading ? 'Loading recent activity...' : 'No recent system activity'}
            </ThemedText>
          )}
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
              if (item.label === 'Maintenance') router.push('/maintenance-backup');
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

function QuickAction({
  label,
  icon,
  tone,
  disabled = false,
  onPress,
}: {
  label: string;
  icon: { ios: 'stethoscope' | 'arrow.clockwise' | 'doc.text'; android: 'health_and_safety' | 'refresh' | 'description'; web: 'health_and_safety' | 'refresh' | 'description' };
  tone: 'green' | 'blue' | 'purple';
  disabled?: boolean;
  onPress: () => void;
}) {
  const colors = {
    green: { background: '#E0FAF3', foreground: '#0AAB83' },
    blue: { background: '#E8F1FF', foreground: '#1479E8' },
    purple: { background: '#F0EBFF', foreground: '#6540E8' },
  }[tone];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.quickAction,
        { backgroundColor: colors.background },
        pressed && styles.pressed,
      ]}>
      <SymbolView name={icon} size={18} tintColor={colors.foreground} />
      <ThemedText style={[styles.quickActionText, { color: colors.foreground }]}>{label}</ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#EAF4FF' },
  content: { paddingHorizontal: 16, paddingTop: 12 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  heading: { color: '#18233A', fontSize: 21, lineHeight: 26, fontWeight: '800' },
  welcome: { color: '#43536D', fontSize: 10, lineHeight: 14 },
  operationalCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 16, padding: 12, marginBottom: 12, shadowColor: '#7FA4C9', shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 2 },
  checkCircle: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#E0FAF3', alignItems: 'center', justifyContent: 'center', marginRight: 11 },
  operationalTitle: { color: '#18233A', fontSize: 12, lineHeight: 16, fontWeight: '700' },
  operationalSubtitle: { color: '#0AAB83', fontSize: 9, lineHeight: 13 },
  cardList: { gap: 10 },
  sectionTitle: { color: '#18233A', fontSize: 13, lineHeight: 18, fontWeight: '700', marginTop: 12, marginBottom: 7 },
  quickActionsCard: { flexDirection: 'row', gap: 8, backgroundColor: '#FFFFFF', borderRadius: 16, padding: 8, shadowColor: '#7FA4C9', shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 2 },
  quickAction: { flex: 1, minHeight: 58, alignItems: 'center', justifyContent: 'center', gap: 5, borderRadius: 11, paddingHorizontal: 4 },
  quickActionText: { fontSize: 8, lineHeight: 11, fontWeight: '700', textAlign: 'center' },
  pressed: { opacity: 0.75 },
  activityCard: { backgroundColor: '#FFFFFF', borderRadius: 16, overflow: 'hidden', shadowColor: '#7FA4C9', shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 2 },
  bottomNavigation: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: '#FFFFFF', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#DDE8F5', flexDirection: 'row', justifyContent: 'space-around', paddingTop: 8 },
  navItem: { alignItems: 'center', justifyContent: 'center', minWidth: 64, gap: 3 },
  navLabel: { fontSize: 8, lineHeight: 11 },
  emptyActivity: { color: '#91A0B5', fontSize: 10, padding: 16, textAlign: 'center' },
});

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function toActivityItem(activity: SystemActivity): {
  id: string;
  title: string;
  time: string;
  source: string;
  status: string;
  tone: ActivityTone;
} {
  return {
    id: activity.id,
    title: activity.title,
    time: formatActivityTime(activity.createdAt),
    source: activity.description ?? activity.type,
    status: activity.status.toUpperCase(),
    tone:
      activity.status === 'critical'
        ? 'critical'
        : activity.status === 'warning'
          ? 'warning'
          : 'success',
  };
}

function formatActivityTime(timestamp: SystemActivity['createdAt']): string {
  const date = timestamp.toDate();
  const today = new Date();
  const isToday =
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate();
  const time = date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  return `${isToday ? 'Today' : date.toLocaleDateString([], { month: 'short', day: 'numeric' })}, ${time}`;
}
