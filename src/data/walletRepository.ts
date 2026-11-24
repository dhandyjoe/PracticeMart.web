import { collection, doc, getDocs, limit, orderBy, query, runTransaction } from "firebase/firestore";
import { topUpError } from "../domain/payRules";
import { CheckoutError, INSUFFICIENT_BALANCE } from "./orderRepository";
import { db } from "./firebase";
import { parseState, type TransactionDoc } from "./schema";

const TX_LIMIT = 100;

// shortcut: satu halaman 100 transaksi terbaru, tanpa infinite scroll; tambah startAfter bila riwayat lebih panjang.
export async function listTransactions(uid: string): Promise<TransactionDoc[]> {
  const snap = await getDocs(query(collection(db, "states", uid, "transactions"), orderBy("at", "desc"), limit(TX_LIMIT)));
  return snap.docs.map((d) => {
    const t = d.data();
    return { id: String(t.id ?? d.id), title: String(t.title ?? ""), amount: Number(t.amount) || 0, at: Number(t.at) || 0 };
  });
}

// Kontrak §8.3 "Transfer, Bayar QR": satu transaksi — gagal bila saldo < nominal, kurangi saldo, buat dokumen transaksi.
export async function spendBalance(uid: string, title: string, amount: number, now = Date.now()): Promise<number> {
  if (!Number.isInteger(amount) || amount < 1) throw new CheckoutError("Nominal tidak valid");
  const stateRef = doc(db, "states", uid);
  return runTransaction(db, async (tx) => {
    const state = parseState((await tx.get(stateRef)).data());
    if (state.balance < amount) throw new CheckoutError(INSUFFICIENT_BALANCE);
    const t: TransactionDoc = { id: `tx-${crypto.randomUUID()}`, title, amount: -amount, at: now };
    tx.update(stateRef, { balance: state.balance - amount });
    tx.set(doc(db, "states", uid, "transactions", t.id), t);
    return state.balance - amount;
  });
}

// Kontrak 1.2 §8.3 "Top Up": transaksi — balance + n dan dokumen transaksi. Validasi ulang di sini, bukan hanya di form.
export async function topUpBalance(uid: string, amount: number, now = Date.now()): Promise<void> {
  if (!Number.isInteger(amount) || topUpError(amount)) throw new CheckoutError("Nominal tidak valid");
  const t: TransactionDoc = { id: `tx-${crypto.randomUUID()}`, title: "Top Up Saldo", amount, at: now };
  const stateRef = doc(db, "states", uid);
  await runTransaction(db, async (tx) => {
    const state = parseState((await tx.get(stateRef)).data());
    tx.update(stateRef, { balance: state.balance + amount });
    tx.set(doc(db, "states", uid, "transactions", t.id), t);
  });
}
