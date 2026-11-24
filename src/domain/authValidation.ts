// Aturan form Login & Register (PRD FR-AUTH-05, FR-AUTH-07, FR-AUTH-12; kontrak §2, §6).

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export const isEmail = (value: string) => EMAIL_RE.test(value.trim());

export type Strength = 0 | 1 | 2 | 3;
export const STRENGTH_LABEL = ["", "Lemah", "Sedang", "Kuat"] as const;

export function passwordStrength(pw: string): Strength {
  if (!pw) return 0;
  const letterAndDigit = /[A-Za-z]/.test(pw) && /\d/.test(pw);
  if (pw.length >= 12 && letterAndDigit && /[^A-Za-z0-9]/.test(pw)) return 3;
  if (pw.length >= 8 && letterAndDigit) return 2;
  return 1;
}

export type FieldErrors = { email?: string; password?: string };

export function loginErrors(email: string, password: string): FieldErrors {
  const errors: FieldErrors = {};
  if (!email.trim()) errors.email = "Email wajib diisi";
  else if (!isEmail(email)) errors.email = "Format email tidak valid";
  if (!password) errors.password = "Password wajib diisi";
  return errors;
}

export type RegisterForm = {
  name: string;
  email: string;
  password: string;
  confirm: string;
  agree: boolean;
};

export const isRegisterValid = (f: RegisterForm) =>
  !!f.name.trim() &&
  isEmail(f.email) &&
  passwordStrength(f.password) >= 2 &&
  f.confirm === f.password &&
  f.agree;

// Kontrak §2: 3× gagal berturut-turut → terkunci 30 dtk, dihitung per client di memori.
export const MAX_LOGIN_FAILS = 3;
export const LOGIN_LOCK_MS = 30_000;

export type LoginLock = { fails: number; lockedUntil: number };
export const UNLOCKED: LoginLock = { fails: 0, lockedUntil: 0 };

export const recordLoginFailure = (lock: LoginLock, now: number): LoginLock =>
  lock.fails + 1 >= MAX_LOGIN_FAILS
    ? { fails: 0, lockedUntil: now + LOGIN_LOCK_MS }
    : { fails: lock.fails + 1, lockedUntil: 0 };

export const lockSecondsLeft = (lock: LoginLock, now: number) =>
  Math.max(0, Math.ceil((lock.lockedUntil - now) / 1000));
