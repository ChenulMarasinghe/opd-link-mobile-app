import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  PatientNotification,
  subscribeNotifications,
  markNotificationAsRead,
  deleteNotification,
} from '@/services/notificationService';
import { NotificationCard } from '@/components/patient/NotificationCard';

interface NotificationsScreenProps {
  patientId?: string;
  onBack?: () => void;
}

export default function NotificationsScreen({
  patientId = 'patient_demo', // Default fallback for dev/testing, supports Auth UID
  onBack,
}: NotificationsScreenProps) {
  const [notifications, setNotifications] = useState<PatientNotification[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  // Real-time Firestore Subscription
  useEffect(() => {
    setLoading(true);
    const unsubscribe = subscribeNotifications(
      patientId,
      (updatedList) => {
        setNotifications(updatedList);
        setLoading(false);
      },
      (err) => {
        console.error('Subscription error:', err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [patientId]);

  // Handle Mark as Read
  const handleCardPress = async (item: PatientNotification) => {
    if (!item.isRead) {
      try {
        await markNotificationAsRead(item.id);
      } catch (err) {
        console.error('Failed to mark notification as read:', err);
      }
    }
  };

  const handleDeleteNotification = (item: PatientNotification) => {
    Alert.alert(
      'Delete Notification',
      'Are you sure you want to delete this notification?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            deleteNotification(item.id).catch((error) => {
              console.error('Failed to delete notification:', error);
              Alert.alert('Unable to delete notification', 'Please try again.');
            });
          },
        },
      ]
    );
  };

  // Filtered Notifications List
  const filteredNotifications = notifications.filter((n) => {
    if (filter === 'unread') return !n.isRead;
    return true;
  });

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Header */}
      <View style={styles.header}>
        {onBack ? (
          <Pressable style={styles.backButton} onPress={onBack}>
            <Text style={styles.backIcon}>‹</Text>
          </Pressable>
        ) : (
          <View style={styles.backButtonPlaceholder} />
        )}

        <View style={styles.titleContainer}>
          <Text style={styles.headerTitle}>Notifications</Text>
          <Text style={styles.headerSubtitle}>LIVE UPDATES</Text>
        </View>

        <View style={styles.langPill}>
          <Text style={styles.langText}>
            EN | <Text style={styles.langSinhala}>සි</Text>
          </Text>
        </View>
      </View>

      {/* Filter Bar */}
      <View style={styles.filterBar}>
        <Pressable
          style={[styles.filterPill, filter === 'all' && styles.filterPillActive]}
          onPress={() => setFilter('all')}
        >
          <Text
            style={[
              styles.filterText,
              filter === 'all' && styles.filterTextActive,
            ]}
          >
            All
          </Text>
        </Pressable>

        <Pressable
          style={[
            styles.filterPill,
            filter === 'unread' && styles.filterPillActive,
          ]}
          onPress={() => setFilter('unread')}
        >
          <Text
            style={[
              styles.filterText,
              filter === 'unread' && styles.filterTextActive,
            ]}
          >
            Unread
          </Text>
          {unreadCount > 0 && (
            <View
              style={[
                styles.filterDot,
                filter === 'unread' && styles.filterDotActive,
              ]}
            />
          )}
        </Pressable>
      </View>

      {/* Notifications List */}
      <ScrollView style={styles.notificationList} contentContainerStyle={styles.scrollContent}>
        {loading ? (
          <ActivityIndicator size="large" color="#6366F1" style={styles.loader} />
        ) : filteredNotifications.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>🔔</Text>
            <Text style={styles.emptyTitle}>
              {filter === 'unread'
                ? 'No unread notifications'
                : 'No notifications yet'}
            </Text>
            <Text style={styles.emptySubtitle}>
              You are all caught up! Updates will appear here in real-time.
            </Text>
          </View>
        ) : (
          filteredNotifications.map((item) => (
            <NotificationCard
              key={item.id}
              notification={item}
              onPress={handleCardPress}
              onDelete={handleDeleteNotification}
            />
          ))
        )}
      </ScrollView>

      {/* Real-time Note Banner */}
      <View style={styles.bannerContainer}>
        <View style={styles.bannerPill}>
          <Text style={styles.bannerIcon}>ⓘ</Text>
          <Text style={styles.bannerText}>
            Notifications are updated in real-time
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#EDF4FF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  backButtonPlaceholder: {
    width: 38,
  },
  backIcon: {
    fontSize: 24,
    color: '#1E293B',
    lineHeight: 26,
  },
  titleContainer: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  headerSubtitle: {
    fontSize: 10,
    fontWeight: '800',
    color: '#635BFF',
    letterSpacing: 1,
    marginTop: 1,
  },
  langPill: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#DCE8F8',
  },
  langText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E293B',
  },
  langSinhala: {
    fontSize: 12,
    fontWeight: '400',
  },
  filterBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginTop: 8,
    marginBottom: 12,
    gap: 10,
  },
  filterPill: {
    minHeight: 36,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DCE4F0',
  },
  filterPillActive: {
    backgroundColor: '#635BFF',
    borderColor: '#635BFF',
  },
  filterText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#52627A',
  },
  filterTextActive: {
    color: '#FFFFFF',
  },
  filterDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#635BFF',
    marginLeft: 6,
  },
  filterDotActive: {
    backgroundColor: '#FFFFFF',
  },
  notificationList: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 2,
    paddingBottom: 14,
  },
  loader: {
    marginTop: 40,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 20,
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#17243A',
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#66758C',
    textAlign: 'center',
    lineHeight: 18,
  },
  bannerContainer: {
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 10,
    backgroundColor: '#EDF4FF',
  },
  bannerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#DCE8F8',
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  bannerIcon: {
    fontSize: 12,
    color: '#66758C',
    marginRight: 6,
  },
  bannerText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#66758C',
    textAlign: 'center',
  },
});
