import { FirebaseError } from "firebase/app";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from "firebase/auth";
import { doc, getDoc, runTransaction, setDoc, updateDoc } from "firebase/firestore";
import { hashPin } from "../domain/pinHash";
import { auth, db } from "./firebase";
import { INITIAL_PIN, INITIAL_TRANSACTIONS, initialState } from "./initialAccount";
import { SCHEMA_VERSION, type UserDoc } from "./schema";

// Teks kontrak §6.
export const AUTH_TEXT = {
  invalid: "Email atau password salah",
  emailInUse: "Email sudah terdaftar",
  tooMany: "Terlalu banyak percobaan. Coba lagi nanti.",
  network: "Tidak ada koneksi. Periksa internet lalu coba lagi.",
  failed: "Gagal memuat, coba lagi",
} as const;

export type AuthErrorKind = keyof typeof AUTH_TEXT;

export class AuthError extends Error {
  readonly kind: AuthErrorKind;
  constructor(kind: AuthErrorKind) {
    super(AUTH_TEXT[kind]);
    this.kind = kind;
  }
}

const KIND_BY_CODE: Record<string, AuthErrorKind> = {
  "auth/invalid-credential": "invalid",
  "auth/invalid-login-credentials": "invalid",
  "auth/user-not-found": "invalid",
  "auth/wrong-password": "invalid",
  "auth/invalid-email": "invalid",
  "auth/email-already-in-use": "emailInUse",
  "auth/too-many-requests": "tooMany",
  "auth/network-request-failed": "network",
};

export function toAuthError(e: unknown): AuthError {
  if (e instanceof AuthError) return e;
  return new AuthError((e instanceof FirebaseError && KIND_BY_CODE[e.code]) || "failed");
}

const newUserDoc = (email: string, displayName: string): UserDoc => ({
  email,
  displayName,
  createdAt: Date.now(),
  schemaVersion: SCHEMA_VERSION,
});

// Kontrak §8.1 & §8.3: login pertama melengkapi users/{uid} dan menulis data awal states/{uid} sekali saja.
async function ensureAccount(user: User) {
  // Email dari Auth (sudah dinormalisasi), karena rules membandingkannya dengan token.
  const email = user.email ?? "";
  const userRef = doc(db, "users", user.uid);
  const snap = await getDoc(userRef);
  let name = (snap.data() as UserDoc | undefined)?.displayName;
  if (!name) {
    name = email.split("@")[0];
    await setDoc(userRef, newUserDoc(email, name));
  }

  await runTransaction(db, async (tx) => {
    const stateRef = doc(db, "states", user.uid);
    if ((await tx.get(stateRef)).exists()) return;
    tx.set(stateRef, initialState(name, email, await hashPin(INITIAL_PIN)));
    for (const t of INITIAL_TRANSACTIONS) tx.set(doc(db, "states", user.uid, "transactions", t.id), t);
  });
}

export async function login(email: string, password: string): Promise<void> {
  let user: User;
  try {
    ({ user } = await signInWithEmailAndPassword(auth, email.trim(), password));
  } catch (e) {
    throw toAuthError(e);
  }
  try {
    await ensureAccount(user);
  } catch (e) {
    // Tanpa data akun, sesi tidak berguna: keluar agar user bisa mencoba lagi.
    await signOut(auth);
    throw toAuthError(e);
  }
}

export async function register(name: string, email: string, password: string): Promise<void> {
  try {
    const { user } = await createUserWithEmailAndPassword(auth, email.trim(), password);
    await setDoc(doc(db, "users", user.uid), newUserDoc(user.email ?? email.trim(), name.trim()));
  } catch (e) {
    throw toAuthError(e);
  } finally {
    // Kontrak §8.1: Register selalu berakhir di layar Masuk tanpa sesi.
    await signOut(auth);
  }
}

export const logout = () => signOut(auth);

export async function getDisplayName(uid: string): Promise<string> {
  const snap = await getDoc(doc(db, "users", uid));
  return (snap.data() as UserDoc | undefined)?.displayName ?? "";
}

// Nama tampilan dipakai sapaan di web & Android (kontrak §8.2 users/{uid}).
export const updateDisplayName = (uid: string, displayName: string) =>
  updateDoc(doc(db, "users", uid), { displayName });
