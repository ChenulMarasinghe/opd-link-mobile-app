import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "./firebase";
import { nowMinutes, slotToMinutes, toISODate, toMinutes } from "../utils/datetime";

export type Appointment = {
  id: string;
  patientId: string;
  patientName?: string;
  doctorId?: string;
  doctorName: string;
  specialty: string;
  roomNumber?: string;
  date: string; // "YYYY-MM-DD"
  timeSlot: string; // "08:30 AM"
  tokenNumber?: number;
  status: "confirmed" | "completed" | "cancelled";
};

export type Opd = {
  id: string;
  name: string;
  order: number;
  closedToday?: boolean;
  sessions: string[]; // ["08:00-12:00", "18:00-20:30"]
};

// Live list of the patient's next appointments (soonest first)
export function subscribeUpcomingAppointments(
  uid: string,
  max: number,
  onData: (items: Appointment[]) => void,
  onError?: (e: Error) => void
) {
  const q = query(collection(db, "appointments"), where("patientId", "==", uid));
  return onSnapshot(
    q,
    (snap) => {
      const today = toISODate(new Date());
      const nowMin = nowMinutes();
      const items = snap.docs
        .map((d) => ({ id: d.id, ...d.data() } as Appointment))
        .filter(
          (a) =>
            a.status === "confirmed" &&
            (a.date > today ||
              (a.date === today && slotToMinutes(a.timeSlot) >= nowMin))
        )
        .sort(
          (a, b) =>
            a.date.localeCompare(b.date) ||
            slotToMinutes(a.timeSlot) - slotToMinutes(b.timeSlot)
        )
        .slice(0, max);
      onData(items);
    },
    (e) => onError?.(e)
  );
}

// Live list of OPD clinics and their sessions
export function subscribeOpds(
  onData: (items: Opd[]) => void,
  onError?: (e: Error) => void
) {
  return onSnapshot(
    collection(db, "opds"),
    (snap) => {
      const items = snap.docs
        .map((d) => ({ id: d.id, ...d.data() } as Opd))
        .sort((a, b) => (a.order ?? 99) - (b.order ?? 99));
      onData(items);
    },
    (e) => onError?.(e)
  );
}