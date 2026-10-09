import {
  collection,
  doc,
  getDoc,
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
  setDoc,
} from 'firebase/firestore';
import { db } from './firebase';
import {
  INITIAL_DOCTORS,
  getInitialQueues,
  getInitialAppointments,
  INITIAL_DELAYS,
  getTodayDateString,
} from './mockData';

// ── Types ──────────────────────────────────────────────────────────────────

export interface Doctor {
  id?: string;
  name: string;
  age?: number;
  email?: string;
  department: string;
  opdId?: string;
  hospital: string;
  room: string;
  maxTokens: number;
  consultingSlots: string[];
  consultingDays: string[];
  weeklyConsultingSessions?: Record<string, string[]>;
  consultingStartDate?: string;
  active: boolean;
  imageUrl?: string;
  specialty?: string;
  roomNumber?: string;
  slotMinutes?: number;
  unavailableDates?: string[];
}

export interface ClinicWing {
  id?: string;
  name: string;
  building: string;
  floor: string;
  section?: string;
  rooms: string;
  maxRooms?: number;
  maxDailyTokens: number;
  clinicHead?: string;
  operatingDays: string[];
  active: boolean;
  createdAt?: Timestamp;
  sessions?: string[];
  weeklySessions?: Record<string, string[]>;
  seniorConsultantId?: string;
  closedToday?: boolean;
}

export type StaffRole = 'nurse' | 'senior_consultant';
export interface StaffMember {
  id?: string;
  name: string;
  phone: string;
  email: string;
  age: number;
  role: StaffRole;
  opdId: string;
  opdName: string;
  consultingSchedule: Record<string, string[]>;
  active: boolean;
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
  checkedIn?: boolean;
  tokenNumber: number;
  bookingType: 'Online App Booking' | 'Counter Pre-booked';
  patientCode: string;
  waitingInfo?: string;
  createdAt?: Timestamp;
  timeSlot?: string;
  opdId?: string;
  opdName?: string;
  session?: string;
  roomNumber?: string;
}

export interface Queue {
  id?: string;
  doctorId: string;
  date: string;
  currentToken: number;
  nextPatientName?: string;
  nextTokenNumber?: number;
  status: 'waiting' | 'in_progress' | 'paused' | 'over' | 'active' | 'break' | 'delayed' | 'upcoming';
  session?: string;
  opdId?: string;
  opdName?: string;
  location?: string;
  nurseId?: string;
  nurseName?: string;
  maxToken?: number;
  nextToken?: number | null;
  doctorName?: string;
  avgMinutes?: number;
  delayMinutes?: number;
  updatedAt?: Timestamp;
}

const fromAppointmentDocument = (id: string, data: Record<string, unknown>): Appointment => ({
  id,
  patientId: typeof data.patientId === 'string' ? data.patientId : '',
  patientName: typeof data.patientName === 'string' ? data.patientName : 'Patient',
  patientPhone: typeof data.patientPhone === 'string' ? data.patientPhone : '',
  doctorId: typeof data.doctorId === 'string' ? data.doctorId : '',
  doctorName: typeof data.doctorName === 'string' ? data.doctorName : '',
  department: typeof data.opdName === 'string' ? data.opdName : typeof data.department === 'string' ? data.department : '',
  slotId: typeof data.timeSlot === 'string' ? data.timeSlot : typeof data.time === 'string' ? data.time : '',
  time: typeof data.timeSlot === 'string' ? data.timeSlot : typeof data.time === 'string' ? data.time : '',
  timeSlot: typeof data.timeSlot === 'string' ? data.timeSlot : typeof data.time === 'string' ? data.time : '',
  date: typeof data.date === 'string' ? data.date : '',
  endTime: typeof data.endTime === 'string' ? data.endTime : '',
  status: data.status === 'confirmed' ? 'upcoming' : data.status === 'arrived' ? 'arrived' : data.status === 'completed' ? 'completed' : 'cancelled',
  checkedIn: data.checkedIn === true,
  tokenNumber: typeof data.tokenNumber === 'number' ? data.tokenNumber : 0,
  bookingType: 'Online App Booking',
  patientCode: typeof data.patientId === 'string' ? data.patientId : '',
  opdId: typeof data.opdId === 'string' ? data.opdId : '',
  opdName: typeof data.opdName === 'string' ? data.opdName : '',
  session: typeof data.session === 'string' ? data.session : '',
  roomNumber: typeof data.roomNumber === 'string' ? data.roomNumber : '',
  createdAt: data.createdAt as Timestamp | undefined,
});

export interface Delay {
  id?: string;
  doctorId: string;
  doctorName: string;
  message: string;
  minutes: number;
  createdAt?: Timestamp;
}

// ── Local In-Memory Reactive Store (Guarantees data on all screens) ─────────

let localDoctors: Doctor[] = [];
let localClinicWings: ClinicWing[] = [];
let localAppointments: Appointment[] = [];
let demoAppointments: Appointment[] = getInitialAppointments();
let localQueues: Queue[] = [];
let demoQueues: Queue[] = getInitialQueues();
let localDelays: Delay[] = [...INITIAL_DELAYS];

const doctorNameKey = (name: string): string => name.trim().toLocaleLowerCase();

const fromDoctorDocument = (id: string, data: Record<string, unknown>): Doctor => ({
  id,
  name: typeof data.name === 'string' ? data.name : '',
  age: typeof data.age === 'number' ? data.age : undefined,
  email: typeof data.email === 'string' ? data.email : '',
  department: typeof data.department === 'string' ? data.department : '',
  opdId: typeof data.opdId === 'string' ? data.opdId : '',
  hospital: typeof data.hospital === 'string' ? data.hospital : '',
  room: typeof data.roomNumber === 'string' ? data.roomNumber : typeof data.room === 'string' ? data.room : '',
  roomNumber: typeof data.roomNumber === 'string' ? data.roomNumber : typeof data.room === 'string' ? data.room : '',
  specialty: typeof data.specialty === 'string' ? data.specialty : '',
  slotMinutes: typeof data.slotMinutes === 'number' ? data.slotMinutes : 15,
  unavailableDates: Array.isArray(data.unavailableDates) ? data.unavailableDates.filter((value): value is string => typeof value === 'string') : [],
  maxTokens: typeof data.maxTokens === 'number' ? data.maxTokens : 100,
  consultingSlots: Array.isArray(data.consultingSlots) ? data.consultingSlots.filter((value): value is string => typeof value === 'string') : [],
  consultingDays: Array.isArray(data.consultingDays) ? data.consultingDays.filter((value): value is string => typeof value === 'string') : [],
  weeklyConsultingSessions: data.weeklyConsultingSessions && typeof data.weeklyConsultingSessions === 'object'
    ? data.weeklyConsultingSessions as Record<string, string[]>
    : undefined,
  consultingStartDate: typeof data.consultingStartDate === 'string' ? data.consultingStartDate : undefined,
  active: data.active !== false,
});

const fromOpdDocument = (id: string, data: Record<string, unknown>): ClinicWing => ({
  id,
  name: typeof data.name === 'string' ? data.name : '',
  rooms: typeof data.rooms === 'string' ? data.rooms : '',
  maxDailyTokens: 100,
  operatingDays: Array.isArray(data.operatingDays) ? data.operatingDays.filter((value): value is string => typeof value === 'string') : [],
  active: true,
  closedToday: data.closedToday === true,
  sessions: Array.isArray(data.sessions) ? data.sessions.filter((value): value is string => typeof value === 'string') : [],
  weeklySessions: data.weeklySessions && typeof data.weeklySessions === 'object'
    ? data.weeklySessions as Record<string, string[]>
    : undefined,
  building: typeof data.building === 'string' ? data.building : '',
  floor: typeof data.floor === 'string' ? data.floor : '',
  section: typeof data.section === 'string' ? data.section : '',
  maxRooms: typeof data.maxRooms === 'number' ? data.maxRooms : undefined,
  clinicHead: typeof data.clinicHead === 'string' ? data.clinicHead : undefined,
  seniorConsultantId: typeof data.seniorConsultantId === 'string' ? data.seniorConsultantId : undefined,
  createdAt: data.createdAt as Timestamp | undefined,
});

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
      const docs = snap.docs.map((d) => fromDoctorDocument(d.id, d.data()));
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

  notifyDoctors();

  try {
    const ref = doc(collection(db, 'doctors'));
    await setDoc(ref, {
      ...doctor,
      doctorId: ref.id,
      specialty: doctor.specialty ?? doctor.department,
      roomNumber: doctor.roomNumber ?? doctor.room,
      slotMinutes: doctor.slotMinutes ?? 15,
      unavailableDates: doctor.unavailableDates ?? [],
    });
    newDoctor.id = ref.id;
    notifyDoctors();
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
    const q = query(collection(db, 'doctors'));
    unsubFirestore = onSnapshot(
      q,
      { includeMetadataChanges: true },
      (snap) => {
        if (!snap.metadata.fromCache || !snap.empty) {
          localDoctors = snap.docs.map((d) => fromDoctorDocument(d.id, d.data()));
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
    const snap = await getDocs(collection(db, 'opds'));
    const wings = snap.docs.map((d) => fromOpdDocument(d.id, d.data()));
    localClinicWings = wings;
    return wings;
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
      collection(db, 'opds'),
      { includeMetadataChanges: true },
      (snap) => {
        if (!snap.empty || !snap.metadata.fromCache) {
          localClinicWings = snap.docs.map((d) => fromOpdDocument(d.id, d.data()));
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
  const order = localClinicWings.length + 1;
  const newWing: ClinicWing = { id: newId, ...wing };
  localClinicWings = [...localClinicWings, newWing];
  notifyClinicWings();

  try {
    const ref = doc(collection(db, 'opds'));
    await setDoc(ref, {
      opdId: ref.id,
      name: wing.name,
      order,
      sessions: wing.sessions ?? ['08:00-12:00', '13:00-17:00'],
      ...(wing.weeklySessions ? { weeklySessions: wing.weeklySessions } : {}),
      building: wing.building,
      floor: wing.floor,
      section: wing.section ?? '',
      ...(wing.maxRooms !== undefined ? { maxRooms: wing.maxRooms } : {}),
      operatingDays: wing.operatingDays,
      ...(wing.clinicHead ? { clinicHead: wing.clinicHead } : {}),
      ...(wing.seniorConsultantId ? { seniorConsultantId: wing.seniorConsultantId } : {}),
      closedToday: wing.closedToday ?? !wing.active,
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
    const payload: Record<string, unknown> = {};
    if (data.name !== undefined) payload.name = data.name;
    if (data.sessions !== undefined) payload.sessions = data.sessions;
    if (data.weeklySessions !== undefined) payload.weeklySessions = data.weeklySessions;
    if (data.operatingDays !== undefined) payload.operatingDays = data.operatingDays;
    if (data.building !== undefined) payload.building = data.building;
    if (data.floor !== undefined) payload.floor = data.floor;
    if (data.section !== undefined) payload.section = data.section;
    if (data.maxRooms !== undefined) payload.maxRooms = data.maxRooms;
    if (data.clinicHead !== undefined) payload.clinicHead = data.clinicHead;
    if (data.seniorConsultantId !== undefined) payload.seniorConsultantId = data.seniorConsultantId;
    if (data.closedToday !== undefined || data.active !== undefined) {
      payload.closedToday = data.closedToday ?? data.active === false;
    }
    await updateDoc(doc(db, 'opds', id), payload);
  } catch (e) {
    console.warn('Firestore updateClinicWing offline, updated locally', e);
  }
};

export async function deleteClinicWing(id: string): Promise<void> {
  localClinicWings = localClinicWings.filter((wing) => wing.id !== id);
  notifyClinicWings();
  await deleteDoc(doc(db, 'opds', id));
}

export async function addStaffMember(member: Omit<StaffMember, 'id'>): Promise<string> {
  const ref = doc(collection(db, 'staff'));
  await setDoc(ref, { ...member, staffId: ref.id, createdAt: serverTimestamp() });
  return ref.id;
}

export async function updateStaffMember(id: string, data: Partial<StaffMember>): Promise<void> {
  await updateDoc(doc(db, 'staff', id), data);
}

export async function deleteStaffMember(id: string): Promise<void> {
  await deleteDoc(doc(db, 'staff', id));
}

export async function getStaffMembers(role?: StaffRole): Promise<StaffMember[]> {
  const staffQuery = role
    ? query(collection(db, 'staff'), where('role', '==', role))
    : collection(db, 'staff');
  const snapshot = await getDocs(staffQuery);
  return snapshot.docs.map((item) => ({
    id: item.id,
    ...item.data(),
  } as StaffMember)).filter((member) => member.active !== false);
}

export function subscribeStaffMembers(
  role: StaffRole,
  callback: (members: StaffMember[]) => void,
): () => void {
  const staffQuery = query(collection(db, 'staff'), where('role', '==', role));
  return onSnapshot(staffQuery, (snapshot) => {
    callback(snapshot.docs
      .map((item) => ({ id: item.id, ...item.data() } as StaffMember))
      .filter((member) => member.active !== false));
  }, (error) => {
    console.warn(`Could not subscribe to ${role} records.`, error.message);
    callback([]);
  });
}

// ── Appointments ───────────────────────────────────────────────────────────

export const getAppointments = async (): Promise<Appointment[]> => {
  try {
    const q = query(collection(db, 'appointments'), orderBy('date', 'asc'));
    const snap = await getDocs(q);
    if (!snap.empty) {
      const appts = snap.docs.map((d) => fromAppointmentDocument(d.id, d.data()));
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
    a.id === id ? {
      ...a,
      status,
      ...(status === 'arrived' ? { checkedIn: true } : {}),
      ...(status === 'completed' || status === 'cancelled' ? { checkedIn: false } : {}),
    } : a
  );
  notifyAppointments();

  try {
    await updateDoc(doc(db, 'appointments', id), {
      status: status === 'upcoming' ? 'confirmed' : status,
      ...(status === 'arrived' ? { checkedIn: true } : {}),
      ...(status === 'completed' || status === 'cancelled' ? { checkedIn: false } : {}),
      updatedAt: serverTimestamp(),
    });
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
          localAppointments = snap.docs.map((d) => fromAppointmentDocument(d.id, d.data()));
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
    return [];
  } catch (e) {
    console.warn('Firestore getTodayQueues offline, using local data', e);
  }
  return localQueues.filter((q) => q.date === date);
};

export const updateQueueStatus = async (
  doctorId: string,
  date: string,
  status: Queue['status'],
  delayMinutes?: number,
  session?: string
): Promise<void> => {
  // Update local in-memory store
  const existingIndex = localQueues.findIndex(
    (q) => q.doctorId === doctorId && q.date === date && (!session || q.session === session)
  );

  if (existingIndex >= 0) {
    const existingQueue = localQueues[existingIndex];
    const shouldStart = normalizeQueueStatus(status) === 'in_progress'
      && normalizeQueueStatus(existingQueue.status) === 'waiting'
      && existingQueue.currentToken === 0
      && (existingQueue.nextToken ?? 0) > 0;
    localQueues[existingIndex] = {
      ...localQueues[existingIndex],
      status: normalizeQueueStatus(status),
      ...(shouldStart ? {
        currentToken: Number(existingQueue.nextToken),
        nextToken: (existingQueue.nextToken ?? 0) < (existingQueue.maxToken ?? 0)
          ? (existingQueue.nextToken ?? 0) + 1
          : null,
        nextTokenNumber: (existingQueue.nextToken ?? 0) < (existingQueue.maxToken ?? 0)
          ? (existingQueue.nextToken ?? 0) + 1
          : undefined,
      } : {}),
      delayMinutes: delayMinutes !== undefined ? delayMinutes : localQueues[existingIndex].delayMinutes,
    };
  }

  notifyQueues(date);

  try {
    const q = query(
      collection(db, 'queues'),
      where('doctorId', '==', doctorId),
      where('date', '==', date),
      ...(session ? [where('session', '==', session)] : [])
    );
    const snap = await getDocs(q);
    if (!snap.empty) {
      const currentQueue = snap.docs[0].data();
      const currentToken = Number(currentQueue.currentToken) || 0;
      const maxToken = Number(currentQueue.maxToken) || 0;
      const startToken = Number(currentQueue.nextToken) || 0;
      const shouldStart = normalizeQueueStatus(status) === 'in_progress'
        && normalizeQueueStatus(currentQueue.status as Queue['status']) === 'waiting'
        && currentToken === 0
        && startToken > 0;
      const updates: Record<string, unknown> = {
        status: normalizeQueueStatus(status),
        updatedAt: serverTimestamp(),
        ...(shouldStart ? {
          currentToken: startToken,
          nextToken: startToken < maxToken ? startToken + 1 : null,
        } : {}),
      };
      if (delayMinutes !== undefined) updates.delayMinutes = delayMinutes;
      await updateDoc(snap.docs[0].ref, updates);
    } else {
      throw new Error('Queue not found. Create the queue before changing its status.');
    }
  } catch (e) {
    console.warn('Firestore updateQueueStatus offline, updated locally', e);
    throw e;
  }
};

function normalizeQueueStatus(status: Queue['status']): Queue['status'] {
  if (status === 'active') return 'in_progress';
  if (status === 'upcoming') return 'waiting';
  if (status === 'break' || status === 'delayed') return 'paused';
  return status;
}

export async function deleteQueue(queueId: string): Promise<void> {
  if (!queueId) throw new Error('Queue id is required.');
  const queue = localQueues.find((item) => item.id === queueId);
  localQueues = localQueues.filter((item) => item.id !== queueId);
  if (queue) notifyQueues(queue.date);
  await deleteDoc(doc(db, 'queues', queueId));
}

export async function updateQueue(queueId: string, data: Partial<Queue>): Promise<void> {
  const existing = localQueues.find((item) => item.id === queueId);
  localQueues = localQueues.map((item) => item.id === queueId ? { ...item, ...data } : item);
  if (existing) notifyQueues(existing.date);
  await updateDoc(doc(db, 'queues', queueId), { ...data, updatedAt: serverTimestamp() });
}

export type CreateQueueInput = {
  doctorId: string;
  doctorName: string;
  opdId: string;
  opdName: string;
  date: string;
  session: string;
  location: string;
  nurseId?: string;
  nurseName?: string;
  maxToken?: number;
  avgMinutes?: number;
};

export async function createQueue(input: CreateQueueInput): Promise<string> {
  const existing = await getDocs(query(
    collection(db, 'queues'),
    where('doctorId', '==', input.doctorId),
    where('date', '==', input.date),
    where('session', '==', input.session),
  ));
  if (!existing.empty) throw new Error('A queue already exists for this doctor and session.');

  const appointments = await getDocs(query(
    collection(db, 'appointments'),
    where('doctorId', '==', input.doctorId),
    where('date', '==', input.date),
    where('session', '==', input.session),
  ));
  const appointmentData = appointments.docs.map((item) => item.data());
  const bookedMaximum = appointmentData.reduce((maximum, data) =>
    data.status === 'cancelled' ? maximum : Math.max(maximum, Number(data.tokenNumber) || 0), 0);
  const pendingTokens = appointmentData
    .filter((data) => data.status === 'confirmed' || data.status === 'arrived')
    .map((data) => Number(data.tokenNumber) || 0)
    .filter((token) => token > 0)
    .sort((first, second) => first - second);
  const completedMaximum = appointmentData.reduce((maximum, data) =>
    data.status === 'completed' ? Math.max(maximum, Number(data.tokenNumber) || 0) : maximum, 0);
  const currentToken = pendingTokens.length > 0
    ? Math.max(completedMaximum, pendingTokens[0] - 1)
    : bookedMaximum;
  const nextToken = pendingTokens.find((token) => token > currentToken) ?? null;
  const ref = await addDoc(collection(db, 'queues'), {
    ...input,
    currentToken,
    nextToken,
    maxToken: Math.max(input.maxToken ?? 0, bookedMaximum),
    status: nextToken ? 'waiting' : bookedMaximum > 0 ? 'over' : 'waiting',
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function syncQueueMaxToken(queue: Queue, maximum: number): Promise<void> {
  if (!queue.id || maximum === (queue.maxToken ?? 0)) return;
  const currentToken = queue.currentToken ?? 0;
  const nextToken = currentToken < maximum ? currentToken + 1 : null;
  const reopened = queue.status === 'over' && maximum > currentToken;
  await updateDoc(doc(db, 'queues', queue.id), {
    maxToken: maximum,
    nextToken,
    ...(reopened ? { status: 'waiting' } : {}),
    updatedAt: serverTimestamp(),
  });
}

export async function advanceQueue(queueId: string, completedToken?: number): Promise<void> {
  const ref = doc(db, 'queues', queueId);
  const snapshot = await getDoc(ref);
  if (!snapshot.exists()) throw new Error('Queue not found.');
  const queue = snapshot.data();
  const currentToken = Number(queue.currentToken) || 0;
  let maxToken = Number(queue.maxToken) || 0;
  const threshold = Math.max(currentToken, Number(completedToken) || 0);
  const appointmentSnapshot = await getDocs(query(
    collection(db, 'appointments'),
    where('doctorId', '==', queue.doctorId),
    where('date', '==', queue.date),
  ));
  const normalizeSession = (value: unknown) => typeof value === 'string'
    ? value.replace(/\s+/g, '').toLowerCase()
    : '';
  const sessionAppointments = appointmentSnapshot.docs.filter((appointment) => {
    const appointmentSession = normalizeSession(appointment.data().session);
    const queueSession = normalizeSession(queue.session);
    return queueSession ? appointmentSession === queueSession : !appointmentSession;
  });
  maxToken = sessionAppointments.reduce((maximum, appointment) =>
    Math.max(maximum, Number(appointment.data().tokenNumber) || 0), maxToken);
  const pendingTokens = sessionAppointments
    .map((appointment) => appointment.data())
    .filter((appointment) => ['confirmed', 'arrived'].includes(appointment.status))
    .map((appointment) => Number(appointment.tokenNumber) || 0)
    .filter((token) => token > threshold)
    .sort((first, second) => first - second);
  const nextCurrent = pendingTokens[0] ?? Math.max(maxToken, threshold);
  const nextToken = pendingTokens[1] ?? null;
  await updateDoc(ref, {
    maxToken,
    currentToken: nextCurrent,
    nextToken,
    status: pendingTokens.length ? 'in_progress' : maxToken > 0 ? 'over' : 'waiting',
    updatedAt: serverTimestamp(),
  });
}

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
        const ref = doc(collection(db, 'doctors'));
        await setDoc(ref, {
          ...docItem,
          doctorId: ref.id,
          specialty: docItem.specialty ?? docItem.department,
          roomNumber: docItem.roomNumber ?? docItem.room,
          slotMinutes: docItem.slotMinutes ?? 15,
          unavailableDates: docItem.unavailableDates ?? [],
        });
      }
    }

    const wingsSnap = await getDocs(collection(db, 'opds'));
    if (wingsSnap.empty) {
      const departments = [...new Set(INITIAL_DOCTORS.map((doctor) => doctor.department))];
      for (const [index, name] of departments.entries()) {
        const departmentDoctors = INITIAL_DOCTORS.filter((doctor) => doctor.department === name);
        const ref = doc(collection(db, 'opds'));
        await setDoc(ref, {
          opdId: ref.id,
          name,
          order: index + 1,
          sessions: [...new Set(departmentDoctors.flatMap((doctor) => doctor.consultingSlots))],
          closedToday: false,
          createdAt: serverTimestamp(),
        });
      }
    }
    return { success: true, message: 'Doctor and OPD setup data seeded successfully.' };
  } catch (error: any) {
    console.error('Failed to seed Firestore:', error);
    return { success: false, message: error?.message || 'Seeding failed' };
  }
};
