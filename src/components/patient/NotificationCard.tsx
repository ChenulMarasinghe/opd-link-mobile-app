import React from 'react';
import { StyleSheet, Text, View, Pressable } from 'react-native';
import {
  PatientNotification,
  formatRelativeTime,
} from '@/services/notificationService';

interface NotificationCardProps {
  notification: PatientNotification;
  onPress: (notification: PatientNotification) => void;
}

export function NotificationCard({
  notification,
  onPress,
}: NotificationCardProps) {
  const { title, message, type, isRead, badgeText, createdAt } = notification;
  const timeDisplay = formatRelativeTime(createdAt);

  // Return icon configuration based on notification type
  const getIconConfig = () => {
    switch (type) {
      case 'reminder':
        return {
          bg: '#EEF2FF',
          color: '#6366F1',
          symbol: '🔔',
        };
      case 'queue':
        return {
          bg: '#ECFDF5',
          color: '#10B981',
          symbol: '⏱',
        };
      case 'delay':
        return {
          bg: '#FEF3C7',
          color: '#F59E0B',
          symbol: '⚠️',
        };
      case 'confirmation':
        return {
          bg: '#E0F2FE',
          color: '#0284C7',
          symbol: '🗓',
        };
      default:
        return {
          bg: '#F1F5F9',
          color: '#64748B',
          symbol: 'ℹ️',
        };
    }
  };

  const iconConfig = getIconConfig();

  return (
    <Pressable
      style={[styles.card, !isRead && styles.cardUnread]}
      onPress={() => onPress(notification)}
    >
      {/* Unread Indicator Dot */}
      {!isRead && <View style={styles.unreadDot} />}

      {/* Icon Circle */}
      <View style={[styles.iconContainer, { backgroundColor: iconConfig.bg }]}>
        <Text style={[styles.iconSymbol, { color: iconConfig.color }]}>
          {iconConfig.symbol}
        </Text>
      </View>

      {/* Content Section */}
      <View style={styles.contentContainer}>
        {/* Header Row: Title + Time */}
        <View style={styles.headerRow}>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          <Text style={styles.timeText}>{timeDisplay}</Text>
        </View>

        {/* Message / Body with optional Badge Tag */}
        <View style={styles.bodyRow}>
          <Text style={styles.messageText}>
            {message}
            {badgeText ? ' ' : ''}
          </Text>
          {badgeText ? (
            <View style={styles.badgePill}>
              <Text style={styles.badgeText}>{badgeText}</Text>
            </View>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  cardUnread: {
    borderColor: '#E0E7FF',
    backgroundColor: '#FAFAFF',
  },
  unreadDot: {
    position: 'absolute',
    top: 14,
    left: 12,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#6366F1',
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
    marginLeft: 4,
  },
  iconSymbol: {
    fontSize: 18,
  },
  contentContainer: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    flex: 1,
    marginRight: 8,
  },
  timeText: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '500',
  },
  bodyRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  messageText: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 18,
  },
  badgePill: {
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    marginLeft: 4,
    marginVertical: 2,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#065F46',
  },
});
