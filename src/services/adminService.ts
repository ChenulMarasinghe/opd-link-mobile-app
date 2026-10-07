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
  consultingStartDate?: string;
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
  status: 'upcoming' | 'arrived' | 'completed' | 'cancelled';
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
let demoAppointments: Appointment[] = getInitialAppointments();
let localQueues: Queue[] = getInitialQueues();
let demoQueues: Queue[] = getInitialQueues();
let localDelays: Delay[] = [...INITIAL_DELAYS];

const doctorNameKey = (name: string): string => name.trim().toLocaleLowerCase();

const mergeDoctorsWithRoster = (persistedDoctors: Doctor[]): Doctor[] => {
  const persistedByName = new Map(
    persistedDoctors.map((doctor) => [doctorNameKey(doctor.name), doctor])
  );
  const rosterNames = new Set(INITIAL_DOCTORS.map((doctor) => doctorNameKey(doctor.name)));
  const roster = INITIAL_DOCTORS.map(
    (doctor) => persistedByName.get(doctorNameKey(doctor.name)) ?? doctor
  );
  const additional = persistedDoctors.filter(
    (doctor) => !rosterNames.has(doctorNameKey(doctor.name))
  );
  return [...roster, ...additional];
};

const getDoctorIdByName = (name: string): string | undefined =>
  localDoctors.find((doctor) => doctorNameKey(doctor.name) === doctorNameKey(name))?.id;

const mergeAppointmentsWithRoster = (persistedAppointments: Appointment[]): Appointment[] => {
  const merged = getInitialAppointments().map((appointment) => ({
    ...appointment,
    doctorId: getDoctorIdByName(appointment.doctorName) ?? appointment.doctorId,
  }));
  const appointmentIndex = new Map(
    merged.map((appointment, index) => [
      `${doctorNameKey(appointment.doctorName)}|${appointment.date}|${appointment.tokenNumber}`,
      index,
    ])
  );

  persistedAppointments.forEach((appointment) => {
    const key = `${doctorNameKey(appointment.doctorName)}|${appointment.date}|${appointment.tokenNumber}`;
    const index = appointmentIndex.get(key);
    const linkedAppointment = {
      ...appointment,
      doctorId: getDoctorIdByName(appointment.doctorName) ?? appointment.doctorId,
    };
    if (index === undefined) {
      appointmentIndex.set(key, merged.length);
      merged.push(linkedAppointment);
    } else {
      merged[index] = linkedAppointment;
    }
  });

  return merged;
};

const mergeQueuesWithRoster = (date: string, persistedQueues: Queue[]): Queue[] => {
  const merged = getInitialQueues().filter((queue) => queue.date === date).map((queue) => {
    const doctor = INITIAL_DOCTORS.find((item) => item.id === queue.doctorId);
    return {
      ...queue,
      doctorId: doctor ? getDoctorIdByName(doctor.name) ?? queue.doctorId : queue.doctorId,
    };
  });
  const doctorById = new Map(localDoctors.map((doctor) => [doctor.id, doctor]));

  persistedQueues.forEach((queue) => {
    const doctorName = doctorById.get(queue.doctorId)?.name;
    const index = doctorName
      ? merged.findIndex((item) =>
          INITIAL_DOCTORS.some(
            (doctor) => doctorNameKey(doctor.name) === doctorNameKey(doctorName) &&
              item.doctorId === (getDoctorIdByName(doctor.name) ?? doctor.id)
          )
        )
      : merged.findIndex((item) => item.doctorId === queue.doctorId);
    const linkedQueue = { ...queue, date };
    if (index === -1) merged.push(linkedQueue);
    else merged[index] = linkedQueue;
  });

  return merged;
};

const doctorsListeners = new Set<(doctors: Doctor[]) => void>();
const clinicWingListeners = new Set<(wings: ClinicWing[]) => void>();
const appointmentsListeners = new Set<(appointments: Appointment[]) => void>();
const demoAppointmentListeners = new Set<(appointments: Appointment[]) => void>();
const demoQueueListeners = new Set<(queues: Queue[]) => void>();
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

function notifyClinicWings() {
  const copy = [...localClinicWings];
  clinicWingListeners.forEach((cb) => cb(copy));
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

function notifyDemoAppointments() {
  const copy = [...demoAppointments];
  demoAppointmentListeners.forEach((cb) => cb(copy));
}

function notifyDemoQueues() {
  const copy = [...demoQueues];
  demoQueueListeners.forEach((cb) => cb(copy));
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
      const docs = mergeDoctorsWithRoster(
        snap.docs.map((d) => ({ id: d.id, ...d.data() } as Doctor))
      );
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
    const queueIndex = localQueues.findIndex((queue) => queue.id === newQueue.id);
    if (queueIndex >= 0) {
      newQueue.doctorId = ref.id;
      localQueues[queueIndex] = newQueue;
    }
    notifyDoctors();
    notifyQueues(today);

    try {
      const queueRef = await addDoc(collection(db, 'queues'), {
        doctorId: ref.id,
        date: today,
        currentToken: 0,
        nextTokenNumber: 1,
        nextPatientName: '',
        status: 'upcoming',
        delayMinutes: 0,
        updatedAt: serverTimestamp(),
      });
      newQueue.id = queueRef.id;
      notifyQueues(today);
    } catch (queueError) {
      console.warn('Firestore addDoctor queue creation failed, queue is available locally', queueError);
    }
    return ref.id;
  } catch (e) {
    console.warn('Firestore addDoctor offline, saved to local store', e);
    return newId;
  }
};

export const updateDoctor = async (id: string, data: Partial<Doctor>): Promise<void> => {
  const previousDoctor = localDoctors.find((doctor) => doctor.id === id);
  localDoctors = localDoctors.map((d) => (d.id === id ? { ...d, ...data } : d));
  const updatedName = data.name ?? previousDoctor?.name;
  const updatedDepartment = data.department ?? previousDoctor?.department;
  const isLinkedAppointment = (appointment: Appointment) =>
    appointment.doctorId === id ||
    (!!previousDoctor &&
      doctorNameKey(appointment.doctorName) === doctorNameKey(previousDoctor.name));
  localAppointments = localAppointments.map((appointment) =>
    isLinkedAppointment(appointment)
      ? {
          ...appointment,
          ...(updatedName ? { doctorName: updatedName } : {}),
          ...(updatedDepartment ? { department: updatedDepartment } : {}),
        }
      : appointment
  );
  demoAppointments = demoAppointments.map((appointment) =>
    isLinkedAppointment(appointment)
      ? {
          ...appointment,
          ...(updatedName ? { doctorName: updatedName } : {}),
          ...(updatedDepartment ? { department: updatedDepartment } : {}),
        }
      : appointment
  );
  notifyDoctors();
  notifyAppointments();
  notifyDemoAppointments();

  try {
    await updateDoc(doc(db, 'doctors', id), data);
  } catch (e) {
    console.warn('Firestore updateDoctor offline, updated in local store', e);
  }

  if (updatedName || updatedDepartment) {
    try {
      const appointmentSnapshot = await getDocs(
        query(collection(db, 'appointments'), where('doctorId', '==', id))
      );
      await Promise.all(appointmentSnapshot.docs.map((appointmentDoc) => updateDoc(
        appointmentDoc.ref,
        {
          ...(updatedName ? { doctorName: updatedName } : {}),
          ...(updatedDepartment ? { department: updatedDepartment } : {}),
        }
      )));
    } catch (e) {
      console.warn('Firestore linked appointment sync failed, updated locally', e);
    }
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
      { includeMetadataChanges: true },
      (snap) => {
        if (!snap.empty || !snap.metadata.fromCache) {
          localDoctors = mergeDoctorsWithRoster(
            snap.docs.map((d) => ({ id: d.id, ...d.data() } as Doctor))
          );
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

export const subscribeClinicWings = (
  callback: (wings: ClinicWing[]) => void
): (() => void) => {
  callback([...localClinicWings]);
  clinicWingListeners.add(callback);

  let unsubFirestore: (() => void) | undefined;
  try {
    unsubFirestore = onSnapshot(
      collection(db, 'clinicWings'),
      { includeMetadataChanges: true },
      (snap) => {
        if (!snap.empty) {
          localClinicWings = snap.docs.map((d) => ({ id: d.id, ...d.data() } as ClinicWing));
          callback([...localClinicWings]);
        } else if (!snap.metadata.fromCache && localClinicWings.length === 0) {
          callback([]);
        }
      },
      (err) => {
        console.warn('Firestore subscribeClinicWings error, using local data', err.message);
      }
    );
  } catch (err) {
    console.warn('Firestore subscribeClinicWings init error', err);
  }

  return () => {
    clinicWingListeners.delete(callback);
    if (unsubFirestore) unsubFirestore();
  };
};

export const addClinicWing = async (wing: Omit<ClinicWing, 'id'>): Promise<string> => {
  const newId = `wing-${Date.now()}`;
  const newWing: ClinicWing = { id: newId, ...wing };
  localClinicWings = [...localClinicWings, newWing];
  notifyClinicWings();

  try {
    const ref = await addDoc(collection(db, 'clinicWings'), {
      ...wing,
      createdAt: serverTimestamp(),
    });
    newWing.id = ref.id;
    notifyClinicWings();
    return ref.id;
  } catch (e) {
    console.warn('Firestore addClinicWing offline, saved locally', e);
    return newId;
  }
};

export const updateClinicWing = async (id: string, data: Partial<ClinicWing>): Promise<void> => {
  localClinicWings = localClinicWings.map((w) => (w.id === id ? { ...w, ...data } : w));
  notifyClinicWings();
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
      const appts = mergeAppointmentsWithRoster(
        snap.docs.map((d) => ({ id: d.id, ...d.data() } as Appointment))
      );
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
  const appointment = localAppointments.find((item) => item.id === id);
  localAppointments = localAppointments.map((a) =>
    a.id === id ? { ...a, status } : a
  );
  notifyAppointments();

  try {
    await updateDoc(doc(db, 'appointments', id), { status });
    if (status === 'completed' && appointment?.date === getTodayDateString()) {
      const queueIndex = localQueues.findIndex(
        (queue) =>
          queue.doctorId === appointment.doctorId &&
          queue.date === appointment.date
      );
      const localQueue = queueIndex >= 0 ? localQueues[queueIndex] : undefined;
      const currentToken = Math.max(
        localQueue?.currentToken ?? 0,
        appointment.tokenNumber
      );
      const nextTokenNumber = currentToken + 1;
      const nextAppointment = localAppointments.find(
        (item) =>
          item.doctorId === appointment.doctorId &&
          item.date === appointment.date &&
          item.tokenNumber === nextTokenNumber &&
          (item.status === 'upcoming' || item.status === 'arrived')
      );
      if (localQueue && queueIndex >= 0) {
        localQueues[queueIndex] = {
          ...localQueue,
          currentToken,
          nextTokenNumber,
          nextPatientName: nextAppointment?.patientName ?? '',
        };
        notifyQueues(appointment.date);
      }

      const queueQuery = query(
        collection(db, 'queues'),
        where('doctorId', '==', appointment.doctorId),
        where('date', '==', appointment.date)
      );
      const queueSnapshot = await getDocs(queueQuery);
      if (!queueSnapshot.empty) {
        const persistedCurrentToken = Math.max(
          Number(queueSnapshot.docs[0].data().currentToken ?? 0),
          currentToken
        );
        await updateDoc(queueSnapshot.docs[0].ref, {
          currentToken: persistedCurrentToken,
          nextTokenNumber: persistedCurrentToken + 1,
          nextPatientName: nextAppointment?.patientName ?? '',
          updatedAt: serverTimestamp(),
        });
      } else {
        const queueData: Omit<Queue, 'id'> = {
          doctorId: appointment.doctorId,
          date: appointment.date,
          currentToken,
          nextTokenNumber: currentToken + 1,
          nextPatientName: nextAppointment?.patientName ?? '',
          status: 'active',
        };
        const createdQueue = await addDoc(collection(db, 'queues'), {
          ...queueData,
          updatedAt: serverTimestamp(),
        });
        localQueues = [...localQueues, { id: createdQueue.id, ...queueData }];
        notifyQueues(appointment.date);
      }
    }
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
      { includeMetadataChanges: true },
      (snap) => {
        if (!snap.empty || !snap.metadata.fromCache) {
          localAppointments = mergeAppointmentsWithRoster(
            snap.docs.map((d) => ({ id: d.id, ...d.data() } as Appointment))
          );
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

export const subscribeDemoAppointments = (
  callback: (appointments: Appointment[]) => void
): (() => void) => {
  callback([...demoAppointments]);
  demoAppointmentListeners.add(callback);
  return () => demoAppointmentListeners.delete(callback);
};

export const updateDemoAppointmentStatus = (
  id: string,
  status: Appointment['status']
): void => {
  const appointment = demoAppointments.find((item) => item.id === id);
  if (!appointment) {
    console.warn(`Demo appointment not found: ${id}`);
    return;
  }

  demoAppointments = demoAppointments.map((item) =>
    item.id === id ? { ...item, status } : item
  );

  if (appointment.date === getTodayDateString()) {
    const queueIndex = demoQueues.findIndex(
      (queue) => queue.doctorId === appointment.doctorId && queue.date === appointment.date
    );
    if (queueIndex >= 0) {
      const currentQueue = demoQueues[queueIndex];
      const currentToken =
        status === 'completed'
          ? Math.max(currentQueue.currentToken, appointment.tokenNumber)
          : currentQueue.currentToken;
      const nextTokenNumber = currentToken + 1;
      const nextAppointment = demoAppointments.find(
        (item) =>
          item.doctorId === appointment.doctorId &&
          item.date === appointment.date &&
          item.tokenNumber === nextTokenNumber &&
          (item.status === 'upcoming' || item.status === 'arrived')
      );
      demoQueues[queueIndex] = {
        ...currentQueue,
        currentToken,
        nextTokenNumber,
        nextPatientName: nextAppointment?.patientName ?? '',
      };
      notifyDemoQueues();
    }
  }

  notifyDemoAppointments();
};

export const subscribeDemoQueues = (callback: (queues: Queue[]) => void): (() => void) => {
  callback([...demoQueues]);
  demoQueueListeners.add(callback);
  return () => demoQueueListeners.delete(callback);
};

export const updateDemoQueue = (
  doctorId: string,
  data: Partial<Queue>
): void => {
  demoQueues = demoQueues.map((queue) =>
    queue.doctorId === doctorId ? { ...queue, ...data } : queue
  );
  notifyDemoQueues();
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
      { includeMetadataChanges: true },
      (snap) => {
        if (!snap.empty || !snap.metadata.fromCache) {
          const list = mergeQueuesWithRoster(
            date,
            snap.docs.map((d) => ({ id: d.id, ...d.data() } as Queue))
          );
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
