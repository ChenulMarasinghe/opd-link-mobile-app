import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { db } from "./firebase";

const EXPIRY_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 5;

export async function sendVerificationCode(uid: string, email: string, name: string) {
  const code = String(Math.floor(100000 + Math.random() * 900000));
  await setDoc(doc(db, "emailCodes", uid), {
    code,
    expiresAt: Date.now() + EXPIRY_MS,
    attempts: 0,
  });

  const res = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      service_id: process.env.EXPO_PUBLIC_EMAILJS_SERVICE_ID,
      template_id: process.env.EXPO_PUBLIC_EMAILJS_TEMPLATE_ID,
      user_id: process.env.EXPO_PUBLIC_EMAILJS_PUBLIC_KEY,
      accessToken: process.env.EXPO_PUBLIC_EMAILJS_PRIVATE_KEY,
      template_params: { to_email: email, to_name: name, code },
    }),
  });
  if (!res.ok) throw new Error("Could not send the code");
}

export type VerifyResult = "ok" | "wrong" | "expired" | "locked" | "missing";

export async function verifyCode(uid: string, input: string): Promise<VerifyResult> {
  const ref = doc(db, "emailCodes", uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) return "missing";
  const d = snap.data();
  if (Date.now() > d.expiresAt) return "expired";
  if (d.attempts >= MAX_ATTEMPTS) return "locked";
  if (d.code !== input) {
    await updateDoc(ref, { attempts: d.attempts + 1 });
    return "wrong";
  }
  await updateDoc(doc(db, "users", uid), { emailVerified: true });
  return "ok";
}