import {
  collection,
  query,
  where,
  onSnapshot,
  updateDoc,
  doc,
  Timestamp,
  FieldValue,
} from 'firebase/firestore';
import { db } from './firebase';

export type NotificationType = 'reminder' | 'queue' | 'delay' | 'confirmation';

export interface PatientNotification {
  id: string;
  patientId: string;
  title: string;
  message: string;
  type: NotificationType;
  isRead: boolean;
  badgeText?: string;
  createdAt: Timestamp | FieldValue | Date | any;
}

/**
 * Helper to format Firestore timestamp into human-readable relative time string.
 */
export function formatRelativeTime(timestamp: any): string {
  if (!timestamp) return 'Just now';

  let date: Date;
  if (timestamp instanceof Date) {
    date = timestamp;
  } else if (typeof timestamp.toDate === 'function') {
    date = timestamp.toDate();
  } else if (typeof timestamp.seconds === 'number') {
    date = new Date(timestamp.seconds * 1000);
  } else {
    date = new Date(timestamp);
  }

  if (isNaN(date.getTime())) return 'Just now';

  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return 'Just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} min ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} min ago`;
  if (diffInSeconds < 172800) return 'Yesterday';

  return date.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
}

/**
 * READ Operation: Real-time listener for patient notifications in Firestore.
 */
export function subscribeNotifications(
  patientId: string = 'patient_demo', // Default fallback for dev/testing, supports Auth UID
  onUpdate: (notifications: PatientNotification[]) => void,
  onError?: (error: Error) => void
): () => void {
  const notificationsRef = collection(db, 'notifications');
  const q = query(notificationsRef, where('patientId', '==', patientId));

  const unsubscribe = onSnapshot(
    q,
    (snapshot) => {
      const list: PatientNotification[] = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...(docSnap.data() as Omit<PatientNotification, 'id'>),
      }));

      // Sort descending by createdAt
      list.sort((a, b) => {
        const timeA = a.createdAt?.seconds
          ? a.createdAt.seconds * 1000
          : new Date(a.createdAt || 0).getTime();
        const timeB = b.createdAt?.seconds
          ? b.createdAt.seconds * 1000
          : new Date(b.createdAt || 0).getTime();
        return timeB - timeA;
      });

      onUpdate(list);
    },
    (err) => {
      console.error('Error in notifications snapshot:', err);
      if (onError) onError(err);
    }
  );

  return unsubscribe;
}

/**
 * UPDATE Operation: Updates notification isRead state to true in Firestore.
 */
export async function markNotificationAsRead(notificationId: string): Promise<void> {
  try {
    const docRef = doc(db, 'notifications', notificationId);
    await updateDoc(docRef, { isRead: true });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    throw new Error('Failed to update notification status.');
  }
}
