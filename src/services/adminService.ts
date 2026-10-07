import {
  collection,
  doc,
  getDocs,
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
import {
  INITIAL_DOCTORS,
  INITIAL_CLINIC_WINGS,
  getInitialQueues,
  getInitialAppointments,
  INITIAL_DELAYS,
  getTodayDateString,
} from './mockData';

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

// ── Local In-Memory Reactive Store (Guarantees data on all screens) ─────────

let localDoctors: Doctor[] = [...INITIAL_DOCTORS];
let localClinicWings: ClinicWing[] = [...INITIAL_CLINIC_WINGS];
let localAppointments: Appointment[] = getInitialAppointments();
let localQueues: Queue[] = getInitialQueues();
let localDelays: Delay[] = [...INITIAL_DELAYS];

const doctorsListeners = new Set<(doctors: Doctor[]) => void>();
const appointmentsListeners = new Set<(appointments: Appointment[]) => void>();
const queuesListeners = new Map<string, Set<(queues: Queue[]) => void>>();

function notifyDoctors() {
  const copy = [...localDoctors];
  doctorsListeners.forEach((cb) => {
    try {
      cb(copy);
    } catch (e) {
      console.warn('Doctors listener error:', e);
    }
  });
}

function notifyAppointments() {
  const copy = [...localAppointments];
  appointmentsListeners.forEach((cb) => {
    try {
      cb(copy);
    } catch (e) {
      console.warn('Appointments listener error:', e);
    }
  });
}

function notifyQueues(date: string) {
  const listeners = queuesListeners.get(date);
  if (listeners) {
    const list = localQueues.filter((q) => q.date === date);
    listeners.forEach((cb) => {
      try {
        cb(list);
      } catch (e) {
        console.warn('Queues listener error:', e);
      }
    });
  }
}

// ── Doctors ────────────────────────────────────────────────────────────────

export const getDoctors = async (): Promise<Doctor[]> => {
  try {
    const snap = await getDocs(collection(db, 'doctors'));
    if (!snap.empty) {
      const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Doctor));
      localDoctors = docs;
      return docs;
    }
  } catch (e) {
    console.warn('Firestore getDoctors offline or failed, using local data', e);
  }
  return [...localDoctors];
};

export const addDoctor = async (doctor: Omit<Doctor, 'id'>): Promise<string> => {
  const newId = `doc-${Date.now()}`;
  const newDoctor: Doctor = { id: newId, ...doctor };
  localDoctors = [newDoctor, ...localDoctors];

  // Also create a default queue for today for this new doctor
  const today = getTodayDateString();
  const newQueue: Queue = {
    id: `queue-${Date.now()}`,
    doctorId: newId,
    date: today,
    currentToken: 0,
    nextTokenNumber: 1,
    status: 'upcoming',
    delayMinutes: 0,
  };
  localQueues = [...localQueues, newQueue];

  notifyDoctors();
  notifyQueues(today);

  try {
    const ref = await addDoc(collection(db, 'doctors'), doctor);
    newDoctor.id = ref.id;
    return ref.id;
  } catch (e) {
    console.warn('Firestore addDoctor offline, saved to local store', e);
    return newId;
  }
};

export const updateDoctor = async (id: string, data: Partial<Doctor>): Promise<void> => {
  localDoctors = localDoctors.map((d) => (d.id === id ? { ...d, ...data } : d));
  notifyDoctors();

  try {
    await updateDoc(doc(db, 'doctors', id), data);
  } catch (e) {
    console.warn('Firestore updateDoctor offline, updated in local store', e);
  }
};

export const deleteDoctor = async (id: string): Promise<void> => {
  localDoctors = localDoctors.filter((d) => d.id !== id);
  notifyDoctors();

  try {
    await deleteDoc(doc(db, 'doctors', id));
  } catch (e) {
    console.warn('Firestore deleteDoctor offline, deleted from local store', e);
  }
};

export const subscribeDoctors = (
  callback: (doctors: Doctor[]) => void
): (() => void) => {
  // Immediately provide current data so screen renders with zero blank delay
  callback([...localDoctors]);
  doctorsListeners.add(callback);

  let unsubFirestore: (() => void) | undefined;
  try {
    const q = query(collection(db, 'doctors'), where('active', '==', true));
    unsubFirestore = onSnapshot(
      q,
      (snap) => {
        if (!snap.empty) {
          localDoctors = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Doctor));
          callback([...localDoctors]);
        }
      },
      (err) => {
        console.warn('Firestore subscribeDoctors error, using local data', err.message);
      }
    );
  } catch (err) {
    console.warn('Firestore subscribeDoctors init error', err);
  }

  return () => {
    doctorsListeners.delete(callback);
    if (unsubFirestore) unsubFirestore();
  };
};

// ── Clinic Wings ───────────────────────────────────────────────────────────

export const getClinicWings = async (): Promise<ClinicWing[]> => {
  try {
    const snap = await getDocs(collection(db, 'clinicWings'));
    if (!snap.empty) {
      const wings = snap.docs.map((d) => ({ id: d.id, ...d.data() } as ClinicWing));
      localClinicWings = wings;
      return wings;
    }
  } catch (e) {
    console.warn('Firestore getClinicWings offline, using local data', e);
  }
  return [...localClinicWings];
};

export const addClinicWing = async (wing: Omit<ClinicWing, 'id'>): Promise<string> => {
  const newId = `wing-${Date.now()}`;
  const newWing: ClinicWing = { id: newId, ...wing };
  localClinicWings = [...localClinicWings, newWing];

  try {
    const ref = await addDoc(collection(db, 'clinicWings'), {
      ...wing,
      createdAt: serverTimestamp(),
    });
    newWing.id = ref.id;
    return ref.id;
  } catch (e) {
    console.warn('Firestore addClinicWing offline, saved locally', e);
    return newId;
  }
};

export const updateClinicWing = async (id: string, data: Partial<ClinicWing>): Promise<void> => {
  localClinicWings = localClinicWings.map((w) => (w.id === id ? { ...w, ...data } : w));
  try {
    await updateDoc(doc(db, 'clinicWings', id), data);
  } catch (e) {
    console.warn('Firestore updateClinicWing offline, updated locally', e);
  }
};

// ── Appointments ───────────────────────────────────────────────────────────

export const getAppointments = async (): Promise<Appointment[]> => {
  try {
    const q = query(collection(db, 'appointments'), orderBy('date', 'asc'));
    const snap = await getDocs(q);
    if (!snap.empty) {
      const appts = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Appointment));
      localAppointments = appts;
      return appts;
    }
  } catch (e) {
    console.warn('Firestore getAppointments offline, using local data', e);
  }
  return [...localAppointments];
};

export const updateAppointmentStatus = async (
  id: string,
  status: Appointment['status']
): Promise<void> => {
  localAppointments = localAppointments.map((a) =>
    a.id === id ? { ...a, status } : a
  );
  notifyAppointments();

  try {
    await updateDoc(doc(db, 'appointments', id), { status });
  } catch (e) {
    console.warn('Firestore updateAppointmentStatus offline, updated locally', e);
  }
};

export const subscribeAppointments = (
  callback: (appointments: Appointment[]) => void
): (() => void) => {
  // Immediately provide current data so screen renders with zero blank delay
  callback([...localAppointments]);
  appointmentsListeners.add(callback);

  let unsubFirestore: (() => void) | undefined;
  try {
    const q = query(collection(db, 'appointments'), orderBy('date', 'asc'));
    unsubFirestore = onSnapshot(
      q,
      (snap) => {
        if (!snap.empty) {
          localAppointments = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Appointment));
          callback([...localAppointments]);
        }
      },
      (err) => {
        console.warn('Firestore subscribeAppointments error, using local data', err.message);
      }
    );
  } catch (err) {
    console.warn('Firestore subscribeAppointments init error', err);
  }

  return () => {
    appointmentsListeners.delete(callback);
    if (unsubFirestore) unsubFirestore();
  };
};

// ── Queues ─────────────────────────────────────────────────────────────────

export const getTodayQueues = async (date: string): Promise<Queue[]> => {
  try {
    const q = query(collection(db, 'queues'), where('date', '==', date));
    const snap = await getDocs(q);
    if (!snap.empty) {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Queue));
      return list;
    }
  } catch (e) {
    console.warn('Firestore getTodayQueues offline, using local data', e);
  }
  return localQueues.filter((q) => q.date === date);
};

export const updateQueueStatus = async (
  doctorId: string,
  date: string,
  status: Queue['status'],
  delayMinutes?: number
): Promise<void> => {
  // Update local in-memory store
  const existingIndex = localQueues.findIndex(
    (q) => q.doctorId === doctorId && q.date === date
  );

  if (existingIndex >= 0) {
    localQueues[existingIndex] = {
      ...localQueues[existingIndex],
      status,
      delayMinutes: delayMinutes !== undefined ? delayMinutes : localQueues[existingIndex].delayMinutes,
    };
  } else {
    localQueues.push({
      id: `queue-${Date.now()}`,
      doctorId,
      date,
      currentToken: 0,
      nextTokenNumber: 1,
      status,
      delayMinutes: delayMinutes ?? 0,
    });
  }

  notifyQueues(date);

  try {
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
  } catch (e) {
    console.warn('Firestore updateQueueStatus offline, updated locally', e);
  }
};

export const subscribeQueues = (
  date: string,
  callback: (queues: Queue[]) => void
): (() => void) => {
  // Immediately provide current data so screen renders with zero blank delay
  const initialData = localQueues.filter((q) => q.date === date);
  callback(initialData);

  if (!queuesListeners.has(date)) {
    queuesListeners.set(date, new Set());
  }
  queuesListeners.get(date)!.add(callback);

  let unsubFirestore: (() => void) | undefined;
  try {
    const q = query(collection(db, 'queues'), where('date', '==', date));
    unsubFirestore = onSnapshot(
      q,
      (snap) => {
        if (!snap.empty) {
          const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Queue));
          // merge with local
          const otherDates = localQueues.filter((q) => q.date !== date);
          localQueues = [...otherDates, ...list];
          callback(list);
        }
      },
      (err) => {
        console.warn('Firestore subscribeQueues error, using local data', err.message);
      }
    );
  } catch (err) {
    console.warn('Firestore subscribeQueues init error', err);
  }

  return () => {
    queuesListeners.get(date)?.delete(callback);
    if (unsubFirestore) unsubFirestore();
  };
};

// ── Delays / Broadcast ─────────────────────────────────────────────────────

export const broadcastDelay = async (delay: Omit<Delay, 'id'>): Promise<string> => {
  const newId = `delay-${Date.now()}`;
  const newDelay: Delay = { id: newId, ...delay };
  localDelays = [newDelay, ...localDelays];

  try {
    const ref = await addDoc(collection(db, 'delays'), {
      ...delay,
      createdAt: serverTimestamp(),
    });
    newDelay.id = ref.id;
    return ref.id;
  } catch (e) {
    console.warn('Firestore broadcastDelay offline, saved locally', e);
    return newId;
  }
};

export const getDelays = async (doctorId?: string): Promise<Delay[]> => {
  try {
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
    if (!snap.empty) {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Delay));
      localDelays = list;
      return list;
    }
  } catch (e) {
    console.warn('Firestore getDelays offline, using local data', e);
  }

  if (doctorId) {
    return localDelays.filter((d) => d.doctorId === doctorId);
  }
  return [...localDelays];
};

// ── Firestore Seeder Helper ────────────────────────────────────────────────

export const seedFirestoreWithInitialData = async (): Promise<{ success: boolean; message: string }> => {
  try {
    const doctorsSnap = await getDocs(collection(db, 'doctors'));
    if (doctorsSnap.empty) {
      for (const docItem of INITIAL_DOCTORS) {
        const { id, ...data } = docItem;
        await addDoc(collection(db, 'doctors'), data);
      }
    }

    const wingsSnap = await getDocs(collection(db, 'clinicWings'));
    if (wingsSnap.empty) {
      for (const wing of INITIAL_CLINIC_WINGS) {
        const { id, ...data } = wing;
        await addDoc(collection(db, 'clinicWings'), { ...data, createdAt: serverTimestamp() });
      }
    }

    const apptsSnap = await getDocs(collection(db, 'appointments'));
    if (apptsSnap.empty) {
      for (const appt of getInitialAppointments()) {
        const { id, ...data } = appt;
        await addDoc(collection(db, 'appointments'), { ...data, createdAt: serverTimestamp() });
      }
    }

    const queuesSnap = await getDocs(collection(db, 'queues'));
    if (queuesSnap.empty) {
      for (const q of getInitialQueues()) {
        const { id, ...data } = q;
        await addDoc(collection(db, 'queues'), { ...data, updatedAt: serverTimestamp() });
      }
    }

    return { success: true, message: 'All collections seeded successfully!' };
  } catch (error: any) {
    console.error('Failed to seed Firestore:', error);
    return { success: false, message: error?.message || 'Seeding failed' };
  }
};
