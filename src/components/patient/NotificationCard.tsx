import React from 'react';
import { StyleSheet, Text, View, Pressable } from 'react-native';
import {
  PatientNotification,
  formatRelativeTime,
} from '@/services/notificationService';

interface NotificationCardProps {
  notification: PatientNotification;
  onPress: (notification: PatientNotification) => void;
  onDelete: (notification: PatientNotification) => void;
}

export function NotificationCard({
  notification,
  onPress,
  onDelete,
}: NotificationCardProps) {
  const { title, message, type, isRead, badgeText, createdAt } = notification;
  const timeDisplay = formatRelativeTime(createdAt);

  // Return icon configuration based on notification type
  const getIconConfig = () => {
    switch (type) {
      case 'reminder':
        return {
          bg: '#EEF2FF',
          color: '#635BFF',
          symbol: '🔔',
        };
      case 'queue':
        return {
          bg: '#EAF3FF',
          color: '#208AEF',
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
          bg: '#EEF2FF',
          color: '#635BFF',
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
    <View style={[styles.card, !isRead && styles.cardUnread]}>
      {/* Unread Indicator Dot */}
      {!isRead && <View style={styles.unreadDot} />}

      <Pressable
        style={styles.notificationPressable}
        onPress={() => onPress(notification)}
        accessibilityRole="button"
        accessibilityLabel={`Open notification: ${title}`}
      >
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

      <Pressable
        style={styles.deleteButton}
        onPress={() => onDelete(notification)}
        accessibilityRole="button"
        accessibilityLabel={`Delete notification: ${title}`}
        hitSlop={6}
      >
        <Text style={styles.deleteText}>Delete</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    position: 'relative',
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 1,
    borderWidth: 1,
    borderColor: '#E0E8F4',
  },
  notificationPressable: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  cardUnread: {
    borderColor: '#C9C6FF',
  },
  unreadDot: {
    position: 'absolute',
    top: 13,
    left: 11,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#635BFF',
  },
  iconContainer: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    marginLeft: 4,
  },
  iconSymbol: {
    fontSize: 18,
  },
  contentContainer: {
    flex: 1,
    minWidth: 0,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 5,
    gap: 8,
  },
  title: {
    minWidth: 0,
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    flex: 1,
  },
  timeText: {
    fontSize: 10,
    color: '#8491A4',
    fontWeight: '500',
    flexShrink: 0,
  },
  bodyRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  messageText: {
    fontSize: 13,
    color: '#52627A',
    lineHeight: 18,
    flexShrink: 1,
  },
  badgePill: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    marginLeft: 4,
    marginVertical: 2,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#5148D8',
  },
  deleteButton: {
    minHeight: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
    paddingHorizontal: 7,
    borderRadius: 8,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  deleteText: {
    color: '#B91C1C',
    fontSize: 10,
    fontWeight: '700',
  },
});
