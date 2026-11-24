import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "./firebase";
import { parseState, type StateDoc } from "./schema";

// Field yang boleh diubah dengan update() per field (kontrak §8.3). Saldo, orderSeq, dan pesanan
// hanya lewat transaksi (Checkout/PracticePay), jadi sengaja tidak ada di sini.
export type EditableField =
  | "cart"
  | "wishlist"
  | "history"
  | "voucher"
  | "profile"
  | "addresses"
  | "pinFailures"
  | "pinLockedUntil";

export async function getState(uid: string): Promise<StateDoc> {
  return parseState((await getDoc(doc(db, "states", uid))).data());
}

// Baca ulang dokumen terbaru sebelum menulis supaya perubahan dari Android tidak tertimpa
// (architecture K9). Tabrakan di field yang sama tetap last-write-wins (diterima kontrak).
export async function updateStateField<K extends EditableField>(
  uid: string,
  field: K,
  change: (current: StateDoc[K]) => StateDoc[K],
  onWriteError: (e: unknown) => void,
): Promise<StateDoc> {
  const ref = doc(db, "states", uid);
  const state = parseState((await getDoc(ref)).data());
  const next = change(state[field]);
  // Tidak menunggu ack server: update() per field boleh offline dan diantre SDK (kontrak §8.3).
  // Cache lokal sudah memuat perubahan ini, jadi baca berikutnya konsisten.
  updateDoc(ref, { [field]: next }).catch(onWriteError);
  return { ...state, [field]: next };
}
