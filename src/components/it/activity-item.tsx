import { SymbolView } from 'expo-symbols';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';

export type ActivityTone = 'success' | 'critical' | 'warning';

type ActivityItemProps = {
  title: string;
  time: string;
  source: string;
  status: string;
  tone: ActivityTone;
  isLast?: boolean;
};

const activityTone = {
  success: { iconBackground: '#DDF8F1', icon: '#0AAB83', badgeBackground: '#DDF8F1', text: '#0AAB83', symbol: 'externaldrive.fill' },
  critical: { iconBackground: '#FFE1E3', icon: '#FF5C63', badgeBackground: '#FFE1E3', text: '#F0444D', symbol: 'waveform.path.ecg' },
  warning: { iconBackground: '#FFF1D8', icon: '#F5A623', badgeBackground: '#FFF1D8', text: '#DE8D0C', symbol: 'clock.fill' },
} as const;

export function ActivityItem({ title, time, source, status, tone, isLast }: ActivityItemProps) {
  const colors = activityTone[tone];

  return (
    <View style={[styles.container, !isLast && styles.withDivider]}>
      <View style={[styles.iconContainer, { backgroundColor: colors.iconBackground }]}>
        <SymbolView name={{ ios: colors.symbol, android: tone === 'warning' ? 'schedule' : 'storage', web: 'circle' }} size={13} tintColor={colors.icon} />
      </View>
      <View style={styles.copy}>
        <ThemedText numberOfLines={1} style={styles.title}>{title}</ThemedText>
        <ThemedText style={styles.details}>{time} • {source}</ThemedText>
      </View>
      <View style={[styles.badge, { backgroundColor: colors.badgeBackground }]}>
        <ThemedText style={[styles.badgeText, { color: colors.text }]}>{status}</ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { minHeight: 45, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10 },
  withDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E7EDF5' },
  iconContainer: { width: 22, height: 22, borderRadius: 7, alignItems: 'center', justifyContent: 'center', marginRight: 9 },
  copy: { flex: 1, minWidth: 0 },
  title: { color: '#18233A', fontSize: 10, lineHeight: 14, fontWeight: '600' },
  details: { color: '#91A0B5', fontSize: 8, lineHeight: 12 },
  badge: { borderRadius: 5, paddingHorizontal: 6, paddingVertical: 3, marginLeft: 6 },
  badgeText: { fontSize: 7, lineHeight: 9, fontWeight: '700' },
});
