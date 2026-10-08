import {
  collection,
  getDoc,
  getDocs,
  query,
  where,
  runTransaction,
  doc,
  serverTimestamp,
  FieldValue,
  Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { createNotification } from './notificationService';
import { isPatientIdentityValid } from './patientIdentityService';
import type { PatientIdentityType } from './patientIdentityService';
import {
  formatTimeSlot,
  generateAppointmentSlots,
  getNextAvailableAppointmentTime,
  getSessionOverlap,
  getSriLankaDateTime,
  isAppointmentDateAllowed,
  parseTimeSlot,
} from './appointmentSchedule';
import { toOpdDepartment } from './opdService';


export interface Doctor {
  id: string;
  name: string;
  specialty: string;
  roomNumber: string;
  department?: string;
  active?: boolean;
  availableDays?: string[];
  consultingDays?: string[];
  consultingStartDate?: string;
  consultingSlots?: string[];
  availableTimeSlots?: string[];
}

export interface Appointment {
  id?: string;
  patientId: string;
  patientIdentityType: PatientIdentityType;
  patientName: string;
  patientPhone: string;
  doctorId: string;
  doctorName: string;
  specialty: string;
  department: string;
  roomNumber: string;
  date: string; // "YYYY-MM-DD"
  timeSlot: string;
  endTime: string;
  tokenNumber: number;
  opdId: string;
  opdName: string;
  session: string;
  status: 'confirmed' | 'completed' | 'cancelled';
  createdAt?: FieldValue | Timestamp;
  updatedAt?: FieldValue | Timestamp;
}

export interface CreateAppointmentInput {
  patientId: string;
  patientIdentityType: PatientIdentityType;
  patientName: string;
  patientPhone: string;
  doctorId: string;
  doctorName: string;
  specialty: string;
  roomNumber: string;
  date: string;
  opdId: string;
  session: string;
}

export interface CreatedAppointment {
  id: string;
  timeSlot: string;
  endTime: string;
  tokenNumber: number;
  date: string;
  doctorName: string;
  opdName: string;
  roomNumber: string;
  session: string;
  patientName: string;
  patientPhone: string;
}

export interface BookedAppointmentTime {
  timeSlot: string;
  endTime: string;
}

interface BookingSlotReservation extends BookedAppointmentTime {
  appointmentId: string;
}

function toDoctor(id: string, data: Record<string, unknown>): Doctor {
  const department = typeof data.department === 'string' ? data.department : undefined;
  const toStringArray = (value: unknown): string[] | undefined =>
    Array.isArray(value) && value.every((item) => typeof item === 'string')
      ? value
      : undefined;

  return {
    id,
    name: typeof data.name === 'string' ? data.name : 'Doctor',
    specialty: typeof data.specialty === 'string'
      ? data.specialty
      : department || '',
    roomNumber: typeof data.roomNumber === 'string'
      ? data.roomNumber
      : typeof data.room === 'string'
        ? data.room
        : '',
    ...(department ? { department } : {}),
    active: typeof data.active === 'boolean' ? data.active : undefined,
    availableDays: toStringArray(data.availableDays),
    consultingDays: toStringArray(data.consultingDays),
    consultingStartDate: typeof data.consultingStartDate === 'string'
      ? data.consultingStartDate
      : undefined,
    consultingSlots: toStringArray(data.consultingSlots),
    availableTimeSlots: toStringArray(data.availableTimeSlots),
  };
}

/**
 * READ Operation: Fetches all doctors from the Firestore "doctors" collection.
 */
export async function fetchDoctors(): Promise<Doctor[]> {
  try {
    const doctorsRef = collection(db, 'doctors');
    const snapshot = await getDocs(doctorsRef);

    const doctors: Doctor[] = snapshot.docs.map((docSnap) =>
      toDoctor(docSnap.id, docSnap.data())
    );

    return doctors;
  } catch (error) {
    console.error('Error fetching doctors:', error);
    throw new Error('Failed to load doctors list.');
  }
}

export async function fetchDoctor(doctorId: string): Promise<Doctor | null> {
  try {
    const snapshot = await getDoc(doc(db, 'doctors', doctorId));
    return snapshot.exists() ? toDoctor(snapshot.id, snapshot.data()) : null;
  } catch (error) {
    console.error('Error fetching doctor:', error);
    throw new Error('Failed to load doctor.');
  }
}

/**
 * READ Operation: Fetches already booked & confirmed time slots for a doctor on a specific date.
 */
export async function fetchBookedSlots(
  doctorId: string,
  date: string
): Promise<BookedAppointmentTime[]> {
  try {
    const appointmentsRef = collection(db, 'appointments');
    const q = query(
      appointmentsRef,
      where('doctorId', '==', doctorId),
      where('date', '==', date),
      where('status', '==', 'confirmed')
    );

    const [snapshot, counterSnapshot] = await Promise.all([
      getDocs(q),
      getDoc(doc(db, 'bookingCounters', `${doctorId}_${date}`)),
    ]);
    const confirmedAppointments = snapshot.docs.map((docSnap) => {
      const data = docSnap.data();
      const start = parseTimeSlot(data.timeSlot);
      const end = parseTimeSlot(data.endTime);
      if (
        typeof data.timeSlot !== 'string'
        || typeof data.endTime !== 'string'
        || start === null
        || end === null
        || end <= start
      ) {
        throw new Error(
          'An existing confirmed appointment has no reliable end time. Contact the clinic before booking this doctor.'
        );
      }
      return { timeSlot: data.timeSlot, endTime: data.endTime };
    });
    const rawReservations = counterSnapshot.exists()
      ? counterSnapshot.data().reservedSlots ?? []
      : [];
    if (!Array.isArray(rawReservations)) {
      throw new Error('Booking reservations are unavailable.');
    }
    const reservations: BookedAppointmentTime[] = rawReservations.map((reservation) => {
      if (
        !reservation
        || typeof reservation.timeSlot !== 'string'
        || typeof reservation.endTime !== 'string'
      ) {
        throw new Error('A booking reservation has invalid time data.');
      }
      const start = parseTimeSlot(reservation.timeSlot);
      const end = parseTimeSlot(reservation.endTime);
      if (start === null || end === null || end <= start) {
        throw new Error('A booking reservation has invalid time data.');
      }
      return { timeSlot: reservation.timeSlot, endTime: reservation.endTime };
    });
    return [...confirmedAppointments, ...reservations];
  } catch (error) {
    console.error('Error fetching booked slots:', error);
    throw error;
  }
}

/**
 * Atomically allocates the next available appointment time and token.
 */
export async function createAppointment(
  input: CreateAppointmentInput
): Promise<CreatedAppointment> {
  try {
    if (!input.patientId.trim()) {
      throw new Error('A patient identity is required before confirming an appointment.');
    }
    if (
      input.patientIdentityType !== 'firebase_auth'
      && input.patientIdentityType !== 'dev_guest'
    ) {
      throw new Error('The patient identity is invalid.');
    }
    if (input.patientIdentityType === 'dev_guest' && !__DEV__) {
      throw new Error('Development guest bookings are unavailable in production.');
    }
    if (!(await isPatientIdentityValid(input))) {
      throw new Error('Your booking identity is no longer valid. Please try again.');
    }

    const appointmentsRef = collection(db, 'appointments');
    const appointmentRef = doc(appointmentsRef);
    const doctorRef = doc(db, 'doctors', input.doctorId);
    const opdRef = doc(db, 'opds', input.opdId);
    const counterRef = doc(db, 'bookingCounters', `${input.doctorId}_${input.date}`);
    const doctorDateQuery = query(
      appointmentsRef,
      where('doctorId', '==', input.doctorId),
      where('date', '==', input.date)
    );

    const allocated = await runTransaction(db, async (transaction) => {
      const [doctorSnapshot, opdSnapshot, counterSnapshot] = await Promise.all([
        transaction.get(doctorRef),
        transaction.get(opdRef),
        transaction.get(counterRef),
      ]);
      // The shared counter makes all bookings for a doctor/date contend on one
      // transaction document; a retry reruns this query after the prior commit.
      const appointmentsSnapshot = await getDocs(doctorDateQuery);
      const doctor = doctorSnapshot.exists()
        ? toDoctor(doctorSnapshot.id, doctorSnapshot.data())
        : null;
      const opd = opdSnapshot.exists()
        ? toOpdDepartment(opdSnapshot.id, opdSnapshot.data())
        : null;

      if (!doctor || !opd || doctor.department !== opd.name) {
        throw new Error('The selected doctor or OPD is no longer available.');
      }
      if (doctor.active === false) {
        throw new Error('This doctor is no longer accepting appointments.');
      }
      if (!opd.sessions.includes(input.session)) {
        throw new Error('The selected OPD session is no longer available.');
      }

      const sriLankaToday = getSriLankaDateTime().date;
      if (input.date === sriLankaToday && opd.closedToday !== false) {
        throw new Error('This OPD is closed or its status is unavailable today.');
      }
      if (!isAppointmentDateAllowed(doctor, input.date)) {
        throw new Error('The selected date is no longer within the doctor schedule.');
      }

      const allAppointmentData = appointmentsSnapshot.docs.map((snapshot) => snapshot.data());
      const confirmedAppointmentData = allAppointmentData.filter(
        (appointment) => appointment.status === 'confirmed'
      );
      const bookedAppointments: BookedAppointmentTime[] = confirmedAppointmentData.map(
        (appointment) => {
          const start = parseTimeSlot(appointment.timeSlot);
          const end = parseTimeSlot(appointment.endTime);
          if (
            start === null
            || end === null
            || end <= start
          ) {
            throw new Error(
              'An existing confirmed appointment has no reliable end time. Contact the clinic before booking this doctor.'
            );
          }
          return {
            timeSlot: appointment.timeSlot,
            endTime: appointment.endTime,
          };
        }
      );

      const tokenNumbers: number[] = [];
      allAppointmentData.forEach((appointment) => {
        const token = appointment.tokenNumber;
        if (typeof token !== 'number' || !Number.isSafeInteger(token) || token < 1) {
          throw new Error(
            'The existing appointment token history cannot be verified. Contact the clinic before booking this doctor.'
          );
        }
        tokenNumbers.push(token);
      });
      const counterData = counterSnapshot.exists() ? counterSnapshot.data() : undefined;
      const lastToken = counterData?.lastToken;
      if (
        counterSnapshot.exists()
        && (typeof lastToken !== 'number' || !Number.isSafeInteger(lastToken) || lastToken < 0)
      ) {
        throw new Error('The booking counter is invalid. Contact the clinic before booking.');
      }
      const rawReservations = counterData?.reservedSlots ?? [];
      if (!Array.isArray(rawReservations)) {
        throw new Error('The booking slot reservations are invalid. Contact the clinic before booking.');
      }
      const reservations: BookingSlotReservation[] = rawReservations.map((reservation) => {
        if (
          !reservation
          || typeof reservation.appointmentId !== 'string'
          || typeof reservation.timeSlot !== 'string'
          || typeof reservation.endTime !== 'string'
        ) {
          throw new Error('A booking slot reservation is invalid. Contact the clinic before booking.');
        }
        const start = parseTimeSlot(reservation.timeSlot);
        const end = parseTimeSlot(reservation.endTime);
        if (start === null || end === null || end <= start) {
          throw new Error('A booking slot reservation is invalid. Contact the clinic before booking.');
        }
        return {
          appointmentId: reservation.appointmentId,
          timeSlot: reservation.timeSlot,
          endTime: reservation.endTime,
        };
      });

      const nextTimeSlot = getNextAvailableAppointmentTime(
        generateAppointmentSlots(getSessionOverlap(input.session, doctor), input.date),
        [...bookedAppointments, ...reservations]
      );
      if (!nextTimeSlot) {
        throw new Error('No appointments available for this session.');
      }

      const nextToken = Math.max(
        typeof lastToken === 'number' ? lastToken : 0,
        ...tokenNumbers
      ) + 1;
      const startMinute = parseTimeSlot(nextTimeSlot);
      if (startMinute === null) {
        throw new Error('The next available appointment time is invalid.');
      }
      const endTime = formatTimeSlot(startMinute + 15);
      const nextReservation: BookingSlotReservation = {
        appointmentId: appointmentRef.id,
        timeSlot: nextTimeSlot,
        endTime,
      };
      const newAppointment: Omit<Appointment, 'id'> = {
        patientId: input.patientId,
        patientIdentityType: input.patientIdentityType,
        patientName: input.patientName,
        patientPhone: input.patientPhone,
        doctorId: input.doctorId,
        doctorName: doctor.name,
        specialty: doctor.specialty,
        department: opd.name,
        roomNumber: doctor.roomNumber,
        date: input.date,
        timeSlot: nextTimeSlot,
        endTime,
        tokenNumber: nextToken,
        opdId: opd.id,
        opdName: opd.name,
        session: input.session,
        status: 'confirmed',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      transaction.set(counterRef, {
        doctorId: input.doctorId,
        date: input.date,
        lastToken: nextToken,
        reservedSlots: [...reservations, nextReservation],
        updatedAt: serverTimestamp(),
      });
      transaction.set(appointmentRef, newAppointment);
      return {
        id: appointmentRef.id,
        timeSlot: nextTimeSlot,
        endTime,
        tokenNumber: nextToken,
        doctorName: doctor.name,
        opdName: opd.name,
        roomNumber: doctor.roomNumber,
        session: input.session,
        date: input.date,
        patientName: input.patientName,
        patientPhone: input.patientPhone,
        patientId: input.patientId,
      };
    });

    // Notifications are side effects and only run after the atomic booking commits.
    try {
      await createNotification({
        patientId: allocated.patientId,
        title: 'Appointment Confirmed',
        message: `Your appointment with ${allocated.doctorName} is scheduled for ${allocated.date} at ${allocated.timeSlot} in OPD Room ${allocated.roomNumber}. Token ${allocated.tokenNumber}.`,
        type: 'confirmation',
        appointmentId: allocated.id,
      });
    } catch (notifError) {
      console.error('Failed to create confirmation notification:', notifError);
    }

    return {
      id: allocated.id,
      timeSlot: allocated.timeSlot,
      endTime: allocated.endTime,
      tokenNumber: allocated.tokenNumber,
      date: allocated.date,
      doctorName: allocated.doctorName,
      opdName: allocated.opdName,
      roomNumber: allocated.roomNumber,
      session: allocated.session,
      patientName: allocated.patientName,
      patientPhone: allocated.patientPhone,
    };
  } catch (error) {
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
    await runTransaction(db, async (transaction) => {
      const appointmentSnapshot = await transaction.get(appointmentRef);
      if (!appointmentSnapshot.exists()) {
        throw new Error('Appointment not found.');
      }
      const appointment = appointmentSnapshot.data();
      const doctorId = appointment.doctorId;
      const date = appointment.date;
      if (typeof doctorId !== 'string' || typeof date !== 'string') {
        throw new Error('Appointment details are invalid; cancellation was not completed.');
      }
      const counterRef = doc(db, 'bookingCounters', `${doctorId}_${date}`);
      const counterSnapshot = await transaction.get(counterRef);

      transaction.update(appointmentRef, {
        status: 'cancelled',
        updatedAt: serverTimestamp(),
      });

      if (counterSnapshot.exists()) {
        const counterData = counterSnapshot.data();
        const reservations = counterData.reservedSlots ?? [];
        if (!Array.isArray(reservations)) {
          throw new Error('Booking slot reservations are invalid; cancellation was not completed.');
        }
        transaction.update(counterRef, {
          reservedSlots: reservations.filter(
            (reservation) => reservation?.appointmentId !== appointmentId
          ),
          updatedAt: serverTimestamp(),
        });
      }
    });
  } catch (error) {
    console.error('Error cancelling appointment:', error);
    throw error;
  }
}
