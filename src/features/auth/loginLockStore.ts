import { UNLOCKED, type LoginLock } from "../../domain/authValidation";

// Kontrak §2: kunci login per client di memori; bertahan saat pindah halaman, hilang saat reload.
export const loginLockStore: { current: LoginLock } = { current: UNLOCKED };
