import AsyncStorage from '@react-native-async-storage/async-storage';
import type { User } from 'firebase/auth';
import { auth } from './firebase';

const DEVELOPMENT_GUEST_ID_KEY = '@opd-link/development-guest-patient-id';

export type PatientIdentityType = 'firebase_auth' | 'dev_guest';

export interface PatientIdentity {
  patientId: string;
  patientIdentityType: PatientIdentityType;
}

let developmentGuestIdentityPromise: Promise<PatientIdentity> | null = null;

function createDevelopmentGuestId(): string {
  const uniquePart = Array.from({ length: 4 }, () =>
    Math.random().toString(36).slice(2, 10)
  ).join('');
  return `dev_guest_${Date.now().toString(36)}_${uniquePart}`;
}

async function getDevelopmentGuestIdentity(): Promise<PatientIdentity> {
  if (!developmentGuestIdentityPromise) {
    const guestIdentityPromise = (async (): Promise<PatientIdentity> => {
      const storedId = await AsyncStorage.getItem(DEVELOPMENT_GUEST_ID_KEY);
      if (storedId?.startsWith('dev_guest_')) {
        return { patientId: storedId, patientIdentityType: 'dev_guest' };
      }

      const patientId = createDevelopmentGuestId();
      await AsyncStorage.setItem(DEVELOPMENT_GUEST_ID_KEY, patientId);
      return { patientId, patientIdentityType: 'dev_guest' };
    })();
    developmentGuestIdentityPromise = guestIdentityPromise.catch((error) => {
      developmentGuestIdentityPromise = null;
      throw error;
    });
  }

  const identityPromise = developmentGuestIdentityPromise;
  if (!identityPromise) {
    throw new Error('Development guest identity could not be initialized.');
  }
  return identityPromise;
}

export async function resolvePatientIdentity(
  observedUser: User | null
): Promise<PatientIdentity | null> {
  const currentUser = auth.currentUser;
  const user = currentUser && !currentUser.isAnonymous
    ? currentUser
    : observedUser && !observedUser.isAnonymous
      ? observedUser
      : null;

  if (user) {
    return { patientId: user.uid, patientIdentityType: 'firebase_auth' };
  }

  if (__DEV__) {
    return getDevelopmentGuestIdentity();
  }

  return null;
}

export async function isPatientIdentityValid(identity: PatientIdentity): Promise<boolean> {
  if (identity.patientIdentityType === 'firebase_auth') {
    const currentUser = auth.currentUser;
    return !!currentUser
      && !currentUser.isAnonymous
      && currentUser.uid === identity.patientId;
  }

  if (!__DEV__ || identity.patientIdentityType !== 'dev_guest') return false;
  const storedGuestId = await AsyncStorage.getItem(DEVELOPMENT_GUEST_ID_KEY);
  return storedGuestId === identity.patientId
    && identity.patientId.startsWith('dev_guest_');
}
