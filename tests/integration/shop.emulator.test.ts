import { deleteApp } from "firebase/app";
import { doc, getDoc, updateDoc, waitForPendingWrites } from "firebase/firestore";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { login, logout, register } from "../../src/data/authRepository";
import { initialStock } from "../../src/data/catalog";
import { app, auth, db } from "../../src/data/firebase";
import { getState, updateStateField } from "../../src/data/stateRepository";
import { getStock, refreshStock } from "../../src/data/stockRepository";
import { addLine } from "../../src/domain/cartRules";

// Repository Belanja × Emulator dengan rules asli (npm run test:integration).
const email = `shop.${Date.now()}@test.dev`;
const password = "abcd1234";
const fail = (e: unknown) => {
  throw e;
};

beforeAll(async () => {
  await register("Rina Wulandari", email, password);
  await login(email, password);
});

afterAll(async () => {
  await logout();
  await deleteApp(app);
});

describe("catalog/stock", () => {
  it("client pertama membuat stok awal; baca berikutnya memakai dokumen yang sama", async () => {
    expect(await getStock()).toEqual(initialStock());
    const snap = await getDoc(doc(db, "catalog", "stock"));
    expect(snap.data()).toMatchObject({ schemaVersion: 1, stock: { P001: { "Hitam|XL": 0, "Hitam|L": 10 } } });

    await updateDoc(doc(db, "catalog", "stock"), { "stock.P001.Hitam|L": 9 });
    expect((await refreshStock()).P001["Hitam|L"]).toBe(9);
  });
});

describe("states/{uid} per field", () => {
  it("keranjang, wishlist, voucher bertahan setelah logout/login", async () => {
    const uid = auth.currentUser!.uid;
    await updateStateField(uid, "cart", (c) => addLine(c, { productId: "P001", color: "Hitam", size: "L", qty: 2 }, 9).cart, fail);
    await updateStateField(uid, "wishlist", (w) => w.filter((id) => id !== "P001"), fail);
    await updateStateField(uid, "voucher", () => "HEMAT10", fail);
    await waitForPendingWrites(db);

    await logout();
    await login(email, password);
    const state = await getState(uid);
    expect(state.cart).toEqual([{ productId: "P001", color: "Hitam", size: "L", qty: 2, selected: true, saved: false }]);
    expect(state.wishlist).toEqual(["P010", "P002", "P020"]);
    expect(state.voucher).toBe("HEMAT10");
    // Data awal tidak ditulis ulang saat login kedua.
    expect(state.balance).toBe(500_000);
  });

  it("rules menolak bentuk yang salah", async () => {
    const ref = doc(db, "states", auth.currentUser!.uid);
    await expect(updateDoc(ref, { cart: "P001" })).rejects.toMatchObject({ code: "permission-denied" });
  });
});
