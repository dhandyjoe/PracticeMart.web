/// <reference types="vite/client" />

interface ImportMetaEnv {
  // Origin site bank 3DS (architecture §10.1). Default dev: http://localhost:5174 (npm run dev:bank).
  readonly VITE_BANK_ORIGIN?: string;
  readonly VITE_FIREBASE_PROJECT_ID?: string;
  // Port emulator bila 9099/8080 dipakai proses lain.
  readonly VITE_EMULATOR_AUTH_PORT?: string;
  readonly VITE_EMULATOR_FIRESTORE_PORT?: string;
}

declare const __APP_VERSION__: string;
declare const __COMMIT_SHA__: string;
declare const __BUILD_DATE__: string;
