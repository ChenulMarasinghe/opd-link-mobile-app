import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';

export type StatusCardTone = 'monitoring' | 'critical' | 'maintenance';

type StatusCardProps = {
  title: string;
  subtitle: string;
  status: string;
  tone: StatusCardTone;
  onPress: () => void;
};

const cardTone = {
  monitoring: { iconBackground: '#E9EDFF', icon: '#6875FF', badgeBackground: '#DDF8F1', badgeText: '#0AAB83', symbol: 'waveform.path.ecg' },
  critical: { iconBackground: '#FFE9EA', icon: '#FF5C63', badgeBackground: '#FFE1E3', badgeText: '#F0444D', symbol: 'waveform.path.ecg' },
  maintenance: { iconBackground: '#E8EBFF', icon: '#4E5BEF', badgeBackground: '#E8EBFF', badgeText: '#5362E8', symbol: 'externaldrive.fill' },
} as const;

export function StatusCard({ title, subtitle, status, tone, onPress }: StatusCardProps) {
  const colors = cardTone[tone];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${status}`}
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      <View style={styles.topRow}>
        <View style={[styles.iconContainer, { backgroundColor: colors.iconBackground }]}>
          <SymbolView name={{ ios: colors.symbol, android: 'monitor_heart', web: 'monitor_heart' }} size={18} tintColor={colors.icon} />
        </View>
        <View style={styles.copy}>
          <ThemedText style={styles.title}>{title}</ThemedText>
          <ThemedText style={styles.subtitle}>{subtitle}</ThemedText>
        </View>
        <SymbolView name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }} size={16} tintColor="#6875FF" />
      </View>
      <View style={styles.divider} />
      <View style={styles.statusRow}>
        <ThemedText style={styles.currentStatus}>Current Status</ThemedText>
        <View style={[styles.badge, { backgroundColor: colors.badgeBackground }]}>
          <ThemedText style={[styles.badgeText, { color: colors.badgeText }]}>{status}</ThemedText>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 9,
    shadowColor: '#7FA4C9',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  pressed: { opacity: 0.82 },
  topRow: { flexDirection: 'row', alignItems: 'center', minHeight: 32 },
  iconContainer: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginRight: 9 },
  copy: { flex: 1 },
  title: { color: '#18233A', fontSize: 12, lineHeight: 16, fontWeight: '700' },
  subtitle: { color: '#75839A', fontSize: 9, lineHeight: 13 },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: '#E7EDF5', marginTop: 8, marginBottom: 8 },
  statusRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  currentStatus: { color: '#91A0B5', fontSize: 9 },
  badge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  badgeText: { fontSize: 9, lineHeight: 11, fontWeight: '700' },
});
