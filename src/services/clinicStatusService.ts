import {
  collection,
  onSnapshot,
  updateDoc,
  doc,
} from 'firebase/firestore';
import { db } from './firebase';

export type ClinicStatusType = 'on_time' | 'delayed' | 'not_started';

export interface DoctorClinicStatus {
  id: string;
  name: string;
  specialty: string;
  roomNumber: string;
  status: ClinicStatusType;
  delayMinutes?: number;
  availableDays?: string[];
  availableTimeSlots?: string[];
}

/**
 * READ Operation: Real-time listener for doctor clinic statuses from Firestore "doctors" collection.
 */
export function subscribeClinicStatus(
  onUpdate: (doctors: DoctorClinicStatus[]) => void,
  onError?: (error: Error) => void
): () => void {
  const doctorsRef = collection(db, 'doctors');

  const unsubscribe = onSnapshot(
    doctorsRef,
    (snapshot) => {
      const list: DoctorClinicStatus[] = snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          name: data.name || 'Doctor',
          specialty: data.specialty || 'General',
          roomNumber: data.roomNumber || '01',
          status: (data.status as ClinicStatusType) || 'on_time',
          delayMinutes: data.delayMinutes,
          availableDays: data.availableDays,
          availableTimeSlots: data.availableTimeSlots,
        };
      });

      onUpdate(list);
    },
    (err) => {
      console.error('Error listening to clinic status snapshot:', err);
      if (onError) onError(err);
    }
  );

  return unsubscribe;
}

/**
 * UPDATE Operation: Updates doctor status and optional delayMinutes in Firestore.
 */
export async function updateDoctorStatus(
  doctorId: string,
  status: ClinicStatusType,
  delayMinutes?: number
): Promise<void> {
  try {
    const docRef = doc(db, 'doctors', doctorId);
    const updatePayload: { status: ClinicStatusType; delayMinutes?: number } = {
      status,
    };

    if (delayMinutes !== undefined) {
      updatePayload.delayMinutes = delayMinutes;
    }

    await updateDoc(docRef, updatePayload);
  } catch (error) {
    console.error('Error updating doctor clinic status:', error);
    throw new Error('Failed to update doctor status.');
  }
}
