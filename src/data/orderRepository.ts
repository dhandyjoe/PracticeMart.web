import { collection, doc, FieldPath, getCountFromServer, getDoc, getDocs, increment, orderBy, query, runTransaction, where } from "firebase/firestore";
import { sameLine } from "../domain/cartRules";
import { CANNOT_CANCEL_SHIPPED, canCancel, cashback, nextStatus } from "../domain/orderRules";
import { appDate, METHODS, orderId, type Method, type VaBank } from "../domain/payment";
import { productById, stockOf, variantKey } from "./catalog";
import { db } from "./firebase";
import { parseOrder, parseState, parseStock, type OrderDoc, type OrderLine, type OrderStatus, type TransactionDoc } from "./schema";

// Error bisnis yang teksnya ditampilkan apa adanya (kontrak §6).
export class CheckoutError extends Error {}
export const INSUFFICIENT_BALANCE = "Saldo tidak cukup";

export type PlaceOrderInput = {
  uid: string;
  lines: OrderLine[];
  method: Method;
  status: "PAID" | "WAITING";
  total: number;
  // VA: batas bayar = waktu order + durasi ini (Developer Options "Batas waktu VA").
  vaTimeoutMs?: number;
  vaBank?: VaBank;
  // Beli Sekarang (FR-SHOP-11): baris tidak berasal dari keranjang, jadi keranjang tidak disentuh.
  keepCart?: boolean;
  deterministic: boolean;
  now?: number;
};

// Kontrak §8.3 "Pesanan baru": satu transaksi — cek stok & saldo, orderSeq + 1, tulis order,
// kurangi stok per varian, (PracticePay) kurangi saldo + transaksi, hapus baris yang dibayar & lepas voucher.
export async function placeOrder(input: PlaceOrderInput): Promise<OrderDoc> {
  const { uid, lines, method, status, total, deterministic } = input;
  const now = input.now ?? Date.now();
  const stateRef = doc(db, "states", uid);
  const stockRef = doc(db, "catalog", "stock");

  return runTransaction(db, async (tx) => {
    const stateSnap = await tx.get(stateRef);
    const stockSnap = await tx.get(stockRef);
    const state = parseState(stateSnap.data());
    const stock = parseStock(stockSnap.data());

    const decrements = lines.map((l) => {
      const key = variantKey(l.color, l.size);
      const left = stockOf(stock, l.productId, key);
      if (left < l.qty) throw new CheckoutError(`Stok tidak cukup untuk ${productById(l.productId)?.name ?? l.productId}`);
      return { path: new FieldPath("stock", l.productId, key), value: left - l.qty };
    });
    if (method === "wallet" && state.balance < total) throw new CheckoutError(INSUFFICIENT_BALANCE);

    const seq = state.orderSeq + 1;
    const id = orderId(appDate(now, deterministic), seq);
    // Waktu di cloud selalu jam asli (kontrak §5).
    const order: OrderDoc = {
      id,
      total,
      method,
      methodLabel: method === "va" && input.vaBank ? `${METHODS.va} ${input.vaBank}` : METHODS[method],
      status,
      statusAt: now,
      stamps: { [status]: now },
      cancelReason: "",
      vaDeadline: input.vaTimeoutMs ? now + input.vaTimeoutMs : 0,
      lines: lines.map(({ productId, color, size, qty }) => ({ productId, color, size, qty })),
      createdAt: now,
    };
    tx.set(doc(db, "states", uid, "orders", id), order);

    tx.update(stateRef, {
      orderSeq: seq,
      ...(input.keepCart ? {} : { cart: state.cart.filter((c) => !lines.some((l) => sameLine(l, c))) }),
      voucher: null,
      ...(method === "wallet" ? { balance: state.balance - total } : {}),
    });
    if (method === "wallet") {
      const t: TransactionDoc = { id: `pay-${id}`, title: "Belanja PracticeMart", amount: -total, at: now };
      tx.set(doc(db, "states", uid, "transactions", t.id), t);
    }

    const [first, ...rest] = decrements;
    tx.update(stockRef, first.path, first.value, ...rest.flatMap((d) => [d.path, d.value]));
    return order;
  });
}

export async function getOrder(uid: string, id: string): Promise<OrderDoc | null> {
  const snap = await getDoc(doc(db, "states", uid, "orders", id));
  return snap.exists() ? parseOrder(snap.data()) : null;
}

export async function listOrders(uid: string): Promise<OrderDoc[]> {
  const snap = await getDocs(query(collection(db, "states", uid, "orders"), orderBy("createdAt", "desc")));
  return snap.docs.map((d) => parseOrder(d.data()));
}

// FR-ACC-01: badge pesanan aktif (belum Selesai/Dibatalkan). Agregasi count = 1 baca, bukan semua dokumen.
export async function countActiveOrders(uid: string): Promise<number> {
  const active = query(collection(db, "states", uid, "orders"), where("status", "in", ["WAITING", "PAID", "PACKED", "SHIPPED"]));
  return (await getCountFromServer(active)).data().count;
}

export const ORDER_GONE = "Pesanan tidak ditemukan";

// Kontrak §8.3 "Status pesanan": maju hanya bila status saat ini == yang diharapkan (dua client tidak melompati
// status). Transisi ke DONE pesanan PracticePay sekaligus menambah cashback + transaksi "Cashback belanja".
export async function advanceOrder(uid: string, id: string, expected: OrderStatus, now = Date.now()): Promise<OrderDoc> {
  const orderRef = doc(db, "states", uid, "orders", id);
  return runTransaction(db, async (tx) => {
    const order = parseOrder((await tx.get(orderRef)).data());
    if (!order.id) throw new CheckoutError(ORDER_GONE);
    const next = nextStatus(order.status);
    if (order.status !== expected || !next) return order;

    const bonus = next === "DONE" ? cashback(order) : 0;
    if (bonus) {
      const stateRef = doc(db, "states", uid);
      const state = parseState((await tx.get(stateRef)).data());
      tx.update(stateRef, { balance: state.balance + bonus });
      const t: TransactionDoc = { id: `cashback-${id}`, title: "Cashback belanja", amount: bonus, at: now };
      tx.set(doc(db, "states", uid, "transactions", t.id), t);
    }
    const updated: OrderDoc = { ...order, status: next, statusAt: now, stamps: { ...order.stamps, [next]: now } };
    tx.update(orderRef, { status: updated.status, statusAt: now, stamps: updated.stamps });
    return updated;
  });
}

// Kontrak §8.3 "Batal / VA kedaluwarsa": hanya bila belum CANCELLED dan status ≤ PACKED; stok kembali di transaksi yang sama.
// shortcut: kontrak tidak mengatur refund saldo untuk pesanan PracticePay yang dibatalkan; saldo tidak dikembalikan (samakan dengan Android).
export async function cancelOrder(uid: string, id: string, reason: string, now = Date.now()): Promise<OrderDoc> {
  const orderRef = doc(db, "states", uid, "orders", id);
  return runTransaction(db, async (tx) => {
    const order = parseOrder((await tx.get(orderRef)).data());
    if (!order.id) throw new CheckoutError(ORDER_GONE);
    if (order.status === "CANCELLED") return order;
    if (!canCancel(order.status)) throw new CheckoutError(CANNOT_CANCEL_SHIPPED);

    const [first, ...rest] = order.lines.map((l) => [new FieldPath("stock", l.productId, variantKey(l.color, l.size)), increment(l.qty)] as const);
    if (first) tx.update(doc(db, "catalog", "stock"), first[0], first[1], ...rest.flat());
    const updated: OrderDoc = { ...order, status: "CANCELLED", statusAt: now, stamps: { ...order.stamps, CANCELLED: now }, cancelReason: reason };
    tx.update(orderRef, { status: updated.status, statusAt: now, stamps: updated.stamps, cancelReason: reason });
    return updated;
  });
}
