import {
  collection, doc, getDoc, getDocs, onSnapshot, query, serverTimestamp, setDoc, updateDoc, where,
} from "firebase/firestore";
import { db } from "./firebase";
import type { Appointment } from "./dashboard";
import { toISODate } from "../utils/datetime";

export type QueueDoc = {
  doctorId: string;
  doctorName?: string;
  date: string;
  currentToken: number;
  nextToken?: number | null;
  lastToken?: number;
  maxToken?: number;
  session?: string;
  location?: string;
  opdName?: string;
  avgMinutes?: number;
  status?: "waiting" | "in_progress" | "paused" | "over" | "closed";
};

export type DelayDoc = {
  id: string;
  doctorId: string;
  message: string;
  minutes?: number;
  createdAt?: { toDate: () => Date };
};

export type QueueAppointment = Appointment & {
  tokenNumber?: number;
  checkedIn?: boolean;
  session?: string;
};

export const queueDocId = (doctorId: string, date: string) => `${doctorId}_${date}`;

const normalizeSession = (value: unknown) => typeof value === 'string'
  ? value.replace(/\s+/g, '').toLowerCase()
  : '';

const queueQuery = (doctorId: string, date: string) => query(
  collection(db, "queues"),
  where("doctorId", "==", doctorId),
  where("date", "==", date),
);

const findMatchingQueue = (docs: { data: () => Record<string, unknown> }[], session?: string) => {
  const matching = docs.filter((item) => !session || normalizeSession(item.data().session) === normalizeSession(session));
  return matching[0] ?? (docs.length === 1 ? docs[0] : undefined);
};
  
// READ: live queue for a doctor on a date
export function subscribeQueue(
  doctorId: string,
  date: string,
  session: string | undefined,
  onData: (q: QueueDoc | null) => void,
  onError?: (e: Error) => void
) {
  return onSnapshot(
    queueQuery(doctorId, date),
    (snap) => {
      const match = findMatchingQueue(snap.docs, session);
      onData(match ? (match.data() as QueueDoc) : null);
    },
    (e) => onError?.(e)
  );
}

// READ: one-off fetch used by the Refresh button
export async function fetchQueueOnce(doctorId: string, date: string, session?: string) {
  const snap = await getDocs(queueQuery(doctorId, date));
  const match = findMatchingQueue(snap.docs, session);
  return match ? (match.data() as QueueDoc) : null;
}

// READ: today's newest delay announcement for the doctor (FR06)
export function subscribeDelay(
  doctorId: string,
  onData: (d: DelayDoc | null) => void
) {
  const q = query(collection(db, "delays"), where("doctorId", "==", doctorId));
  return onSnapshot(
    q,
    (snap) => {
      const today = toISODate(new Date());
      const items = snap.docs
        .map((d) => ({ id: d.id, ...d.data() } as DelayDoc))
        .filter((d) => !d.createdAt?.toDate || toISODate(d.createdAt.toDate()) === today)
        .sort(
          (a, b) =>
            (b.createdAt?.toDate?.().getTime() ?? Date.now()) -
            (a.createdAt?.toDate?.().getTime() ?? Date.now())
        );
      onData(items[0] ?? null);
    },
    () => onData(null)
  );
}

// UPDATE: patient confirms they have arrived
export const checkInAppointment = (id: string) =>
  updateDoc(doc(db, "appointments", id), {
    checkedIn: true,
    checkedInAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

// CREATE: "your turn is approaching" notification (saved once per appointment)
export async function notifyTurnApproaching(
  uid: string,
  a: QueueAppointment,
  ahead: number
) {
  const ref = doc(db, "notifications", `${a.id}_approaching`);
  const existing = await getDoc(ref);
  if (existing.exists()) return;
  await setDoc(ref, {
    userId: uid,
    appointmentId: a.id,
    type: "queue",
    title: "Your turn is approaching",
    message:
      ahead === 0
        ? `You are next to see ${a.doctorName}. Please be ready near Room ${a.roomNumber ?? "-"}.`
        : `${ahead} patient${ahead > 1 ? "s" : ""} ahead of you for ${a.doctorName}. Please be ready near Room ${a.roomNumber ?? "-"}.`,
    read: false,
    createdAt: serverTimestamp(),
  });
}
