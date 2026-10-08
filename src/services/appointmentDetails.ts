import { doc, onSnapshot, serverTimestamp, updateDoc } from "firebase/firestore";
import { db } from "./firebase";
import type { Appointment } from "./dashboard";

export type AppointmentDetail = Appointment & {
  patientPhone?: string;
  patientNote?: string;
  createdAt?: { toDate: () => Date };
};

// READ: one appointment, live
export function subscribeAppointment(
  id: string,
  onData: (a: AppointmentDetail | null) => void,
  onError?: (e: Error) => void
) {
  return onSnapshot(
    doc(db, "appointments", id),
    (snap) =>
      onData(snap.exists() ? ({ id: snap.id, ...snap.data() } as AppointmentDetail) : null),
    (e) => onError?.(e)
  );
}

// UPDATE: the patient's note / reason for the visit
export const updateAppointmentNote = (id: string, note: string) =>
  updateDoc(doc(db, "appointments", id), {
    patientNote: note.trim(),
    updatedAt: serverTimestamp(),
  });
  