import { initializeApp } from "firebase/app";
import { connectAuthEmulator, getAuth } from "firebase/auth";
import {
  connectFirestoreEmulator,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from "firebase/firestore";

const env = import.meta.env;

export const app = initializeApp({
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID,
});

// Default persistence = browserLocalPersistence (FR-AUTH-17).
export const auth = getAuth(app);

export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
});

if (env.VITE_USE_EMULATOR === "1") {
  connectAuthEmulator(auth, `http://127.0.0.1:${env.VITE_EMULATOR_AUTH_PORT ?? 9099}`, { disableWarnings: true });
  connectFirestoreEmulator(db, "127.0.0.1", Number(env.VITE_EMULATOR_FIRESTORE_PORT ?? 8080));
}
