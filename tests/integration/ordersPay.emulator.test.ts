import { deleteApp } from "firebase/app";
import { doc, getDoc, updateDoc, waitForPendingWrites } from "firebase/firestore";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { login, logout, register } from "../../src/data/authRepository";
import { app, auth, db } from "../../src/data/firebase";
import { advanceOrder, cancelOrder, countActiveOrders, getOrder, listOrders, placeOrder } from "../../src/data/orderRepository";
import { getState } from "../../src/data/stateRepository";
import { getStock, refreshStock } from "../../src/data/stockRepository";
import { listTransactions, spendBalance, topUpBalance } from "../../src/data/walletRepository";

// Pesanan & PracticePay × Emulator dengan rules asli (npm run test:integration).
const email = `orders.${Date.now()}@test.dev`;
let uid = "";
// Stok global dipakai bersama file lain (shop.emulator.test.ts menegaskan stok awal): kembalikan di akhir.
let stockBefore = 0;

beforeAll(async () => {
  await register("Rina Wulandari", email, "abcd1234");
  await login(email, "abcd1234");
  uid = auth.currentUser!.uid;
  stockBefore = (await getStock()).P001["Putih|M"];
});

afterAll(async () => {
  await updateDoc(doc(db, "catalog", "stock"), { "stock.P001.Putih|M": stockBefore });
  await waitForPendingWrites(db);
  await logout();
  await deleteApp(app);
});

const line = { productId: "P001", color: "Putih", size: "M", qty: 1 };
const place = (method: "card" | "wallet" | "va", total: number, status: "PAID" | "WAITING" = "PAID") =>
  placeOrder({ uid, lines: [line], method, status, total, deterministic: true });

describe("status pesanan", () => {
  it("PracticePay: maju sampai DONE → cashback 5% masuk saldo + transaksi, tepat sekali", async () => {
    const order = await place("wallet", 86_000);
    const balance = (await getState(uid)).balance;
    for (const s of ["PAID", "PACKED"] as const) await advanceOrder(uid, order.id, s);
    // Client lain terlambat dengan status lama: tidak boleh melompat/menggandakan.
    expect((await advanceOrder(uid, order.id, "PAID")).status).toBe("SHIPPED");
    const done = await advanceOrder(uid, order.id, "SHIPPED");
    expect(done).toMatchObject({ status: "DONE" });
    expect(done.stamps).toMatchObject({ PAID: expect.any(Number), DONE: expect.any(Number) });
    expect(await advanceOrder(uid, order.id, "SHIPPED")).toMatchObject({ status: "DONE" });

    expect((await getState(uid)).balance).toBe(balance + 4_300);
    expect((await getDoc(doc(db, "states", uid, "transactions", `cashback-${order.id}`))).data()).toMatchObject({ title: "Cashback belanja", amount: 4_300 });
    expect(await getOrder(uid, order.id)).toMatchObject({ status: "DONE" });
  });

  it("kartu: DONE tanpa cashback", async () => {
    const order = await place("card", 86_000);
    const balance = (await getState(uid)).balance;
    for (const s of ["PAID", "PACKED", "SHIPPED"] as const) await advanceOrder(uid, order.id, s);
    expect((await getOrder(uid, order.id))!.status).toBe("DONE");
    expect((await getState(uid)).balance).toBe(balance);
  });
});

describe("batal", () => {
  it("stok kembali & status CANCELLED; batal kedua tidak menggandakan stok", async () => {
    const before = (await refreshStock()).P001["Putih|M"];
    const order = await place("card", 86_000);
    expect((await refreshStock()).P001["Putih|M"]).toBe(before - 1);

    expect(await cancelOrder(uid, order.id, "Menemukan harga lebih murah")).toMatchObject({ status: "CANCELLED", cancelReason: "Menemukan harga lebih murah" });
    expect((await refreshStock()).P001["Putih|M"]).toBe(before);
    await cancelOrder(uid, order.id, "lagi");
    expect((await refreshStock()).P001["Putih|M"]).toBe(before);
    expect(await advanceOrder(uid, order.id, "CANCELLED")).toMatchObject({ status: "CANCELLED" });
  });

  it("status Dikirim tidak bisa dibatalkan; VA WAITING bisa", async () => {
    const shipped = await place("card", 1);
    for (const s of ["PAID", "PACKED"] as const) await advanceOrder(uid, shipped.id, s);
    expect((await getOrder(uid, shipped.id))!.status).toBe("SHIPPED");
    await expect(cancelOrder(uid, shipped.id, "x")).rejects.toThrow("sudah dikirim");

    const va = await place("va", 1, "WAITING");
    expect(await cancelOrder(uid, va.id, "Waktu pembayaran habis")).toMatchObject({ status: "CANCELLED" });
  });

  it("countActiveOrders: sama dengan jumlah pesanan belum Selesai/Dibatalkan (rules mengizinkan agregasi)", async () => {
    const active = (await listOrders(uid)).filter((o) => !["DONE", "CANCELLED"].includes(o.status)).length;
    expect(await countActiveOrders(uid)).toBe(active);
  });

  it("listOrders: terbaru dulu", async () => {
    const list = await listOrders(uid);
    expect(list.length).toBeGreaterThanOrEqual(4);
    expect(list.map((o) => o.createdAt)).toEqual([...list.map((o) => o.createdAt)].sort((a, b) => b - a));
  });
});

describe("PracticePay", () => {
  it("transfer: saldo berkurang + transaksi tampil di riwayat terbaru dulu", async () => {
    const balance = (await getState(uid)).balance;
    expect(await spendBalance(uid, "Transfer ke Budi Santoso", 150_000)).toBe(balance - 150_000);
    await waitForPendingWrites(db);
    expect((await getState(uid)).balance).toBe(balance - 150_000);
    const txs = await listTransactions(uid);
    expect(txs[0]).toMatchObject({ title: "Transfer ke Budi Santoso", amount: -150_000 });
    expect(txs.map((t) => t.at)).toEqual([...txs.map((t) => t.at)].sort((a, b) => b - a));
  });

  it("top up: saldo bertambah + transaksi 'Top Up Saldo' (rules menerima increment)", async () => {
    const balance = (await getState(uid)).balance;
    await topUpBalance(uid, 250_000);
    expect((await getState(uid)).balance).toBe(balance + 250_000);
    expect((await listTransactions(uid))[0]).toMatchObject({ title: "Top Up Saldo", amount: 250_000 });
  });

  it("saldo kurang ditolak tanpa mengubah saldo", async () => {
    const balance = (await getState(uid)).balance;
    await expect(spendBalance(uid, "x", balance + 1)).rejects.toThrow("Saldo tidak cukup");
    expect((await getState(uid)).balance).toBe(balance);
  });
});
