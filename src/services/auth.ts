import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
} from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
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

export async function loginUser(email: string, password: string) {
  await signInWithEmailAndPassword(auth, email.trim(), password);
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const snap = await getDoc(doc(db, "users", uid));
  return snap.exists() ? (snap.data() as UserProfile) : null;
}

export const logoutUser = () => signOut(auth);
export const resetPassword = (email: string) =>
  sendPasswordResetEmail(auth, email.trim());