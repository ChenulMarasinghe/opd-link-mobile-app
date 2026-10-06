import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';

// ── Types ──────────────────────────────────────────────────────────────────

export interface Doctor {
  id?: string;
  name: string;
  department: string;
  hospital: string;
  room: string;
  maxTokens: number;
  consultingSlots: string[];
  consultingDays: string[];
  active: boolean;
  imageUrl?: string;
}

export interface ClinicWing {
  id?: string;
  name: string;
  building: string;
  floor: string;
  rooms: string;
  maxDailyTokens: number;
  clinicHead?: string;
  operatingDays: string[];
  active: boolean;
  createdAt?: Timestamp;
}

export interface Appointment {
  id?: string;
  patientId: string;
  patientName: string;
  patientPhone: string;
  doctorId: string;
  doctorName: string;
  department: string;
  slotId: string;
  date: string;
  time: string;
  endTime: string;
  status: 'upcoming' | 'completed' | 'cancelled';
  tokenNumber: number;
  bookingType: 'Online App Booking' | 'Counter Pre-booked';
  patientCode: string;
  waitingInfo?: string;
  createdAt?: Timestamp;
}

export interface Queue {
  id?: string;
  doctorId: string;
  date: string;
  currentToken: number;
  nextPatientName?: string;
  nextTokenNumber?: number;
  status: 'active' | 'break' | 'delayed' | 'upcoming';
  delayMinutes?: number;
  updatedAt?: Timestamp;
}

export interface Delay {
  id?: string;
  doctorId: string;
  doctorName: string;
  message: string;
  minutes: number;
  createdAt?: Timestamp;
}

// ── Doctors ────────────────────────────────────────────────────────────────

export const getDoctors = async (): Promise<Doctor[]> => {
  const snap = await getDocs(collection(db, 'doctors'));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Doctor));
};

export const addDoctor = async (doctor: Omit<Doctor, 'id'>): Promise<string> => {
  const ref = await addDoc(collection(db, 'doctors'), doctor);
  return ref.id;
};

export const updateDoctor = async (id: string, data: Partial<Doctor>): Promise<void> => {
  await updateDoc(doc(db, 'doctors', id), data);
};

export const deleteDoctor = async (id: string): Promise<void> => {
  await deleteDoc(doc(db, 'doctors', id));
};

export const subscribeDoctors = (
  callback: (doctors: Doctor[]) => void
): (() => void) => {
  const q = query(collection(db, 'doctors'), where('active', '==', true));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Doctor)));
  });
};

// ── Clinic Wings ───────────────────────────────────────────────────────────

export const getClinicWings = async (): Promise<ClinicWing[]> => {
  const snap = await getDocs(collection(db, 'clinicWings'));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as ClinicWing));
};

export const addClinicWing = async (wing: Omit<ClinicWing, 'id'>): Promise<string> => {
  const ref = await addDoc(collection(db, 'clinicWings'), {
    ...wing,
    createdAt: serverTimestamp(),
  });
  return ref.id;
};

export const updateClinicWing = async (id: string, data: Partial<ClinicWing>): Promise<void> => {
  await updateDoc(doc(db, 'clinicWings', id), data);
};

// ── Appointments ───────────────────────────────────────────────────────────

export const getAppointments = async (): Promise<Appointment[]> => {
  const q = query(collection(db, 'appointments'), orderBy('date', 'asc'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Appointment));
};

export const updateAppointmentStatus = async (
  id: string,
  status: Appointment['status']
): Promise<void> => {
  await updateDoc(doc(db, 'appointments', id), { status });
};

export const subscribeAppointments = (
  callback: (appointments: Appointment[]) => void
): (() => void) => {
  const q = query(collection(db, 'appointments'), orderBy('date', 'asc'));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Appointment)));
  });
};

// ── Queues ─────────────────────────────────────────────────────────────────

export const getTodayQueues = async (date: string): Promise<Queue[]> => {
  const q = query(collection(db, 'queues'), where('date', '==', date));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Queue));
};

export const updateQueueStatus = async (
  doctorId: string,
  date: string,
  status: Queue['status'],
  delayMinutes?: number
): Promise<void> => {
  const q = query(
    collection(db, 'queues'),
    where('doctorId', '==', doctorId),
    where('date', '==', date)
  );
  const snap = await getDocs(q);
  if (!snap.empty) {
    const updates: Partial<Queue> = { status, updatedAt: serverTimestamp() as Timestamp };
    if (delayMinutes !== undefined) updates.delayMinutes = delayMinutes;
    await updateDoc(snap.docs[0].ref, updates);
  } else {
    await addDoc(collection(db, 'queues'), {
      doctorId,
      date,
      currentToken: 0,
      status,
      delayMinutes: delayMinutes ?? 0,
      updatedAt: serverTimestamp(),
    });
  }
};

export const subscribeQueues = (
  date: string,
  callback: (queues: Queue[]) => void
): (() => void) => {
  const q = query(collection(db, 'queues'), where('date', '==', date));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Queue)));
  });
};

// ── Delays / Broadcast ─────────────────────────────────────────────────────

export const broadcastDelay = async (delay: Omit<Delay, 'id'>): Promise<string> => {
  const ref = await addDoc(collection(db, 'delays'), {
    ...delay,
    createdAt: serverTimestamp(),
  });
  return ref.id;
};

export const getDelays = async (doctorId?: string): Promise<Delay[]> => {
  let q;
  if (doctorId) {
    q = query(
      collection(db, 'delays'),
      where('doctorId', '==', doctorId),
      orderBy('createdAt', 'desc')
    );
  } else {
    q = query(collection(db, 'delays'), orderBy('createdAt', 'desc'));
  }
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Delay));
};
