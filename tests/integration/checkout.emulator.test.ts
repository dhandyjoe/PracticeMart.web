import { deleteApp } from "firebase/app";
import { doc, getDoc, waitForPendingWrites } from "firebase/firestore";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { login, logout, register, updateDisplayName } from "../../src/data/authRepository";
import { app, auth, db } from "../../src/data/firebase";
import { getOrder, placeOrder } from "../../src/data/orderRepository";
import { getState, updateStateField } from "../../src/data/stateRepository";
import { getStock, refreshStock } from "../../src/data/stockRepository";

// Checkout × Emulator dengan rules asli (npm run test:integration).
const email = `checkout.${Date.now()}@test.dev`;
const fail = (e: unknown) => {
  throw e;
};
let uid = "";

beforeAll(async () => {
  await register("Rina Wulandari", email, "abcd1234");
  await login(email, "abcd1234");
  uid = auth.currentUser!.uid;
  await getStock();
});

afterAll(async () => {
  await logout();
  await deleteApp(app);
});

const line = { productId: "P001", color: "Navy", size: "M", qty: 2 };

describe("placeOrder", () => {
  it("kartu: order PAID, orderSeq, stok berkurang, keranjang & voucher dibersihkan", async () => {
    await updateStateField(uid, "cart", () => [{ ...line, selected: true, saved: false }, { productId: "P010", color: "Hitam", size: "", qty: 1, selected: false, saved: false }], fail);
    await updateStateField(uid, "voucher", () => "HEMAT10", fail);
    await waitForPendingWrites(db);
    const before = (await refreshStock()).P001["Navy|M"];

    const order = await placeOrder({ uid, lines: [line], method: "card", status: "PAID", total: 158_000, deterministic: true });
    expect(order.id).toBe("PM-20260115-0001");
    expect(await getOrder(uid, order.id)).toMatchObject({ status: "PAID", total: 158_000, lines: [line] });

    const state = await getState(uid);
    expect(state).toMatchObject({ orderSeq: 1, voucher: null, balance: 500_000 });
    expect(state.cart.map((l) => l.productId)).toEqual(["P010"]);
    expect((await refreshStock()).P001["Navy|M"]).toBe(before - 2);
  });

  it("PracticePay: saldo berkurang + dokumen transaksi", async () => {
    const order = await placeOrder({ uid, lines: [line], method: "wallet", status: "PAID", total: 86_000, deterministic: true });
    expect(order.id).toBe("PM-20260115-0002");
    expect((await getState(uid)).balance).toBe(414_000);
    expect((await getDoc(doc(db, "states", uid, "transactions", `pay-${order.id}`))).data()).toMatchObject({
      title: "Belanja PracticeMart",
      amount: -86_000,
    });
  });

  it("stok tidak cukup / saldo kurang → ditolak tanpa menulis", async () => {
    await expect(
      placeOrder({ uid, lines: [{ ...line, size: "XL", color: "Hitam" }], method: "cod", status: "PAID", total: 1, deterministic: true }),
    ).rejects.toThrow("Stok tidak cukup untuk Kaos Polos Basic");
    await expect(
      placeOrder({ uid, lines: [line], method: "wallet", status: "PAID", total: 10_000_000, deterministic: true }),
    ).rejects.toThrow("Saldo tidak cukup");
    expect((await getState(uid)).orderSeq).toBe(2);
  });

  it("VA: WAITING dengan vaDeadline", async () => {
    const t0 = Date.now();
    const order = await placeOrder({ uid, lines: [line], method: "va", status: "WAITING", total: 1, vaTimeoutMs: 30_000, deterministic: false });
    expect(order.id).toMatch(/^PM-\d{8}-0003$/);
    expect(order.vaDeadline - t0).toBeGreaterThanOrEqual(30_000);
  });
});

describe("profil & alamat", () => {
  it("nama tampilan, profil, alamat, PIN tersimpan sesuai rules", async () => {
    await updateDisplayName(uid, "Rina W");
    await updateStateField(uid, "profile", (p) => ({ ...p, name: "Rina W", gender: "female" }), fail);
    await updateStateField(uid, "addresses", (list) => list.map((a, i) => ({ ...a, isPrimary: i === 1 })), fail);
    await updateStateField(uid, "pinFailures", () => 2, fail);
    await waitForPendingWrites(db);
    expect((await getDoc(doc(db, "users", uid))).data()).toMatchObject({ displayName: "Rina W", email });
    const state = await getState(uid);
    expect(state.profile).toMatchObject({ name: "Rina W", gender: "female" });
    expect(state.addresses.map((a) => a.isPrimary)).toEqual([false, true]);
    expect(state.pinFailures).toBe(2);
  });
});
