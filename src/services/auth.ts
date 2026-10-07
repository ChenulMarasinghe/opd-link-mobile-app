import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
} from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { auth, db } from "./firebase";

export type Role = "patient" | "admin" | "it";

export type UserProfile = {
  uid: string;
  name: string;
  email: string;
  phone: string;
  role: Role;
  language: "en" | "si";
  emailVerified?: boolean;
};

export type DemoAuthUser = {
  uid: string;
  email: string;
};

export type LoginResult = {
  user: DemoAuthUser;
  profile: UserProfile;
} | null;

const DEMO_EMAIL = "admin@gmail.com";
const DEMO_PASSWORD = "admin123";
const DEMO_SESSION_KEY = "@opd-link/demo-session";

const demoUser: DemoAuthUser = {
  uid: "demo-it-admin",
  email: DEMO_EMAIL,
};

const demoProfile: UserProfile = {
  uid: demoUser.uid,
  name: "Admin Support",
  email: DEMO_EMAIL,
  phone: "",
  role: "it",
  language: "en",
  emailVerified: true,
};

// Registration always creates a patient. Admin and IT accounts are created in the Firebase console.
export async function registerUser(
  name: string,
  email: string,
  phone: string,
  password: string
) {
  const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
  const profile: UserProfile = {
    uid: cred.user.uid,
    name: name.trim(),
    email: email.trim(),
    phone: phone.trim(),
    role: "patient",
    language: "en",
    emailVerified: false,
  };
  await setDoc(doc(db, "users", cred.user.uid), {
    ...profile,
    createdAt: serverTimestamp(),
  });
  return profile;
}

export async function loginUser(email: string, password: string): Promise<LoginResult> {
  if (email.trim().toLowerCase() === DEMO_EMAIL && password === DEMO_PASSWORD) {
    await signOut(auth);
    await AsyncStorage.setItem(
      DEMO_SESSION_KEY,
      JSON.stringify({ user: demoUser, profile: demoProfile })
    );
    return { user: demoUser, profile: demoProfile };
  }

  await signInWithEmailAndPassword(auth, email.trim(), password);
  return null;
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const snap = await getDoc(doc(db, "users", uid));
  return snap.exists() ? (snap.data() as UserProfile) : null;
}

export async function getDemoSession(): Promise<LoginResult> {
  const storedSession = await AsyncStorage.getItem(DEMO_SESSION_KEY);
  if (!storedSession) return null;

  try {
    return JSON.parse(storedSession) as LoginResult;
  } catch {
    await AsyncStorage.removeItem(DEMO_SESSION_KEY);
    return null;
  }
}

export async function logoutUser() {
  await AsyncStorage.removeItem(DEMO_SESSION_KEY);
  await signOut(auth);
}

export const resetPassword = (email: string) =>
  sendPasswordResetEmail(auth, email.trim());