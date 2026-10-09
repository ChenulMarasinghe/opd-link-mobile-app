import {
    doc,
    getDoc,
    serverTimestamp,
    setDoc,
    updateDoc,
} from 'firebase/firestore';
import { db } from './firebase';

export type PatientLanguage = 'en' | 'si';

export interface PatientProfile {
  patientId: string;
  fullName: string;
  phone: string;
  email: string;
  nicNumber: string;
  language: PatientLanguage;
  notificationsEnabled: boolean;
  smsTokenUpdatesEnabled: boolean;
}

export type PatientProfileUpdates = Partial<
  Pick<
    PatientProfile,
    | 'fullName'
    | 'phone'
    | 'email'
    | 'nicNumber'
    | 'language'
    | 'notificationsEnabled'
    | 'smsTokenUpdatesEnabled'
  >
>;

function patientDocument(patientId: string) {
  return doc(db, 'patients', patientId);
}

export async function getPatientProfile(
  patientId: string
): Promise<PatientProfile | null> {
  try {
    const snapshot = await getDoc(patientDocument(patientId));
    if (!snapshot.exists()) return null;

    const data = snapshot.data();
    return {
      patientId,
      fullName: typeof data.fullName === 'string' ? data.fullName : '',
      phone: typeof data.phone === 'string' ? data.phone : '',
      email: typeof data.email === 'string' ? data.email : '',
      nicNumber: typeof data.nicNumber === 'string' ? data.nicNumber : '',
      language: data.language === 'si' ? 'si' : 'en',
      notificationsEnabled: data.notificationsEnabled !== false,
      smsTokenUpdatesEnabled: data.smsTokenUpdatesEnabled !== false,
    };
  } catch (error) {
    console.error('Error loading patient profile:', error);
    throw new Error('Failed to load patient profile.');
  }
}

export async function createPatientProfile(
  patientId: string
): Promise<PatientProfile> {
  const profile: PatientProfile = {
    patientId,
    fullName: '',
    phone: '',
    email: '',
    nicNumber: '',
    language: 'en',
    notificationsEnabled: true,
    smsTokenUpdatesEnabled: true,
  };

  try {
    await setDoc(patientDocument(patientId), {
      fullName: profile.fullName,
      phone: profile.phone,
      email: profile.email,
      nicNumber: profile.nicNumber,
      language: profile.language,
      notificationsEnabled: profile.notificationsEnabled,
      smsTokenUpdatesEnabled: profile.smsTokenUpdatesEnabled,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return profile;
  } catch (error) {
    console.error('Error creating patient profile:', error);
    throw new Error('Failed to create patient profile.');
  }
}

export async function updatePatientProfile(
  patientId: string,
  updates: PatientProfileUpdates
): Promise<void> {
  try {
    await updateDoc(patientDocument(patientId), {
      ...updates,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error updating patient profile:', error);
    throw new Error('Failed to update patient profile.');
  }
}