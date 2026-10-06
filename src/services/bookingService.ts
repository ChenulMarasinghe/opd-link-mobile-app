import {
  collection,
  getDocs,
  query,
  where,
  addDoc,
  updateDoc,
  doc,
  serverTimestamp,
  FieldValue,
  Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { createNotification } from './notificationService';


export interface Doctor {
  id: string;
  name: string;
  specialty: string;
  roomNumber: string;
  availableDays?: string[];
  availableTimeSlots?: string[];
}

export interface Appointment {
  id?: string;
  patientId: string;
  patientName: string;
  patientPhone: string;
  doctorId: string;
  doctorName: string;
  specialty: string;
  roomNumber: string;
  date: string; // "YYYY-MM-DD"
  timeSlot: string; // "09:00 AM"
  status: 'confirmed' | 'cancelled';
  createdAt?: FieldValue | Timestamp;
  updatedAt?: FieldValue | Timestamp;
}

export interface CreateAppointmentInput {
  patientId?: string; // Supports Auth UID when available, with fallback for dev/testing
  patientName: string;
  patientPhone: string;
  doctorId: string;
  doctorName: string;
  specialty: string;
  roomNumber: string;
  date: string;
  timeSlot: string;
}

/**
 * READ Operation: Fetches all doctors from the Firestore "doctors" collection.
 */
export async function fetchDoctors(): Promise<Doctor[]> {
  try {
    const doctorsRef = collection(db, 'doctors');
    const snapshot = await getDocs(doctorsRef);

    const doctors: Doctor[] = snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...(docSnap.data() as Omit<Doctor, 'id'>),
    }));

    return doctors;
  } catch (error) {
    console.error('Error fetching doctors:', error);
    throw new Error('Failed to load doctors list.');
  }
}

/**
 * READ Operation: Fetches already booked & confirmed time slots for a doctor on a specific date.
 */
export async function fetchBookedSlots(
  doctorId: string,
  date: string
): Promise<string[]> {
  try {
    const appointmentsRef = collection(db, 'appointments');
    const q = query(
      appointmentsRef,
      where('doctorId', '==', doctorId),
      where('date', '==', date),
      where('status', '==', 'confirmed')
    );

    const snapshot = await getDocs(q);
    const bookedSlots: string[] = snapshot.docs.map(
      (docSnap) => docSnap.data().timeSlot
    );

    return bookedSlots;
  } catch (error) {
    console.error('Error fetching booked slots:', error);
    throw new Error('Failed to fetch slot availability.');
  }
}

/**
 * CREATE Operation: Checks slot availability and creates a new appointment document.
 */
export async function createAppointment(
  input: CreateAppointmentInput
): Promise<string> {
  try {
    // 1. Double-booking check: query if slot is already confirmed
    const appointmentsRef = collection(db, 'appointments');
    const checkQuery = query(
      appointmentsRef,
      where('doctorId', '==', input.doctorId),
      where('date', '==', input.date),
      where('timeSlot', '==', input.timeSlot),
      where('status', '==', 'confirmed')
    );

    const checkSnapshot = await getDocs(checkQuery);
    if (!checkSnapshot.empty) {
      throw new Error(
        'This time slot has already been booked. Please select another slot.'
      );
    }

    // 2. Create the appointment document in Firestore
    const newAppointment: Omit<Appointment, 'id'> = {
      patientId: input.patientId || 'patient_demo', // Default fallback for dev/testing, supports Auth UID
      patientName: input.patientName,
      patientPhone: input.patientPhone,
      doctorId: input.doctorId,
      doctorName: input.doctorName,
      specialty: input.specialty,
      roomNumber: input.roomNumber,
      date: input.date,
      timeSlot: input.timeSlot,
      status: 'confirmed',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    const docRef = await addDoc(appointmentsRef, newAppointment);

    // 3. Automatically create "Appointment Confirmed" notification for patient
    try {
      await createNotification({
        patientId: newAppointment.patientId,
        title: 'Appointment Confirmed',
        message: `Your appointment with ${input.doctorName} is scheduled for ${input.date} at ${input.timeSlot} in OPD Room ${input.roomNumber}.`,
        type: 'confirmation',
        appointmentId: docRef.id,
      });
    } catch (notifError) {
      console.error('Failed to create confirmation notification:', notifError);
    }

    return docRef.id;
  } catch (error: any) {
    console.error('Error creating appointment:', error);
    throw error;
  }
}

/**
 * UPDATE Operation: Updates an appointment's status to "cancelled".
 */
export async function cancelAppointment(appointmentId: string): Promise<void> {
  try {
    const appointmentRef = doc(db, 'appointments', appointmentId);
    await updateDoc(appointmentRef, {
      status: 'cancelled',
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error cancelling appointment:', error);
    throw new Error('Failed to cancel appointment.');
  }
}
