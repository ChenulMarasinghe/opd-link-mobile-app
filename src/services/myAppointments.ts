import {
  collection, deleteDoc, doc, onSnapshot, query, serverTimestamp, setDoc, updateDoc, where,
} from "firebase/firestore";
import { db } from "./firebase";
import type { Appointment } from "./dashboard";
import { nowMinutes, slotToMinutes, toISODate } from "../utils/datetime";

export const isPastAppointment = (a: Appointment) => {
  const today = toISODate(new Date());
  return a.date < today || (a.date === today && slotToMinutes(a.timeSlot) < nowMinutes());
};

// READ: all of this patient's appointments (live)
export function subscribeMyAppointments(
  uid: string,
  onData: (items: Appointment[]) => void,
  onError?: (e: Error) => void
) {
  const q = query(collection(db, "appointments"), where("patientId", "==", uid));
  return onSnapshot(
    q,
    (snap) => onData(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Appointment))),
    (e) => onError?.(e)
  );
}

// UPDATE: cancel an appointment
export const cancelAppointment = (id: string) =>
  updateDoc(doc(db, "appointments", id), {
    status: "cancelled",
    updatedAt: serverTimestamp(),
  });

// DELETE: remove an appointment from history
export const deleteAppointment = (id: string) => deleteDoc(doc(db, "appointments", id));

// CREATE: rating for a past visit (one per appointment)
export const submitFeedback = (a: Appointment, uid: string, rating: number, comment: string) =>
  setDoc(doc(db, "feedback", a.id), {
    appointmentId: a.id,
    patientId: uid,
    doctorId: a.doctorId ?? null,
    doctorName: a.doctorName,
    rating,
    comment: comment.trim(),
    createdAt: serverTimestamp(),
  });

// READ: which appointments this patient already rated (appointmentId -> stars)
export function subscribeMyFeedback(
  uid: string,
  onData: (ratings: Record<string, number>) => void
) {
  const q = query(collection(db, "feedback"), where("patientId", "==", uid));
  return onSnapshot(
    q,
    (snap) => {
      const map: Record<string, number> = {};
      snap.docs.forEach((d) => (map[d.id] = d.data().rating));
      onData(map);
    },
    () => onData({})
  );
}