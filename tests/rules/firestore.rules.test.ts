import { readFileSync } from "node:fs";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { afterAll, beforeAll, beforeEach, describe, it } from "vitest";

let env: RulesTestEnvironment;

const stock = { P001: { "Hitam|42": 5, "Putih|42": 3 }, P010: { "|": 10 } };

const alice = () => env.authenticatedContext("alice", { email: "alice@test.dev" }).firestore();
const bob = () => env.authenticatedContext("bob", { email: "bob@test.dev" }).firestore();
const guest = () => env.unauthenticatedContext().firestore();

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: "demo-practicemart",
    firestore: { rules: readFileSync("firebase/firestore.rules", "utf8") },
  });
});

afterAll(() => env.cleanup());

beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), "catalog/stock"), { stock, schemaVersion: 1 });
  });
});

describe("users/{uid}", () => {
  it("pemilik bisa tulis & baca dengan email sendiri", async () => {
    await assertSucceeds(setDoc(doc(alice(), "users/alice"), { email: "alice@test.dev", displayName: "A" }));
    await assertSucceeds(getDoc(doc(alice(), "users/alice")));
  });

  it("email beda dengan token ditolak", async () => {
    await assertFails(setDoc(doc(alice(), "users/alice"), { email: "fake@test.dev" }));
  });

  it("akun lain & guest ditolak", async () => {
    await assertFails(getDoc(doc(bob(), "users/alice")));
    await assertFails(setDoc(doc(bob(), "users/alice"), { email: "bob@test.dev" }));
    await assertFails(getDoc(doc(guest(), "users/alice")));
  });
});

describe("states/{uid}", () => {
  it("pemilik bisa baca/tulis dokumen & subkoleksi", async () => {
    await assertSucceeds(setDoc(doc(alice(), "states/alice"), { balance: 500000 }));
    await assertSucceeds(setDoc(doc(alice(), "states/alice/transactions/1"), { amount: 1 }));
    await assertSucceeds(getDoc(doc(alice(), "states/alice/orders/PM-1")));
  });

  it("akun lain ditolak", async () => {
    await assertFails(getDoc(doc(bob(), "states/alice")));
    await assertFails(setDoc(doc(bob(), "states/alice/orders/PM-1"), { total: 1 }));
  });

  it("update per field dengan tipe benar diterima", async () => {
    await assertSucceeds(setDoc(doc(alice(), "states/alice"), { balance: 500000, cart: [], voucher: null }));
    await assertSucceeds(
      updateDoc(doc(alice(), "states/alice"), {
        cart: [{ productId: "P001", color: "Hitam", size: "L", qty: 2, selected: true, saved: false }],
      }),
    );
    await assertSucceeds(updateDoc(doc(alice(), "states/alice"), { voucher: "HEMAT10", wishlist: ["P001"] }));
  });

  it("tipe salah atau terlalu besar ditolak", async () => {
    await assertSucceeds(setDoc(doc(alice(), "states/alice"), { balance: 500000 }));
    await assertFails(updateDoc(doc(alice(), "states/alice"), { cart: "P001" }));
    await assertFails(updateDoc(doc(alice(), "states/alice"), { balance: "banyak" }));
    await assertFails(updateDoc(doc(alice(), "states/alice"), { balance: 1.5 }));
    await assertFails(updateDoc(doc(alice(), "states/alice"), { history: ["a", "b", "c", "d", "e", "f"] }));
    await assertFails(updateDoc(doc(alice(), "states/alice"), { voucher: 10 }));
    await assertFails(updateDoc(doc(alice(), "states/alice"), { profile: "Rina" }));
    await assertFails(updateDoc(doc(alice(), "states/alice"), { addresses: {} }));
    await assertFails(updateDoc(doc(alice(), "states/alice"), { pinFailures: "1" }));
    await assertSucceeds(updateDoc(doc(alice(), "states/alice"), { profile: { name: "Rina" }, addresses: [], pinFailures: 1, pinLockedUntil: 0 }));
  });
});

describe("catalog/stock", () => {
  it("user login bisa baca & kurangi stok", async () => {
    await assertSucceeds(getDoc(doc(alice(), "catalog/stock")));
    await assertSucceeds(updateDoc(doc(alice(), "catalog/stock"), { "stock.P001.Hitam|42": 4 }));
  });

  it("guest ditolak", async () => {
    await assertFails(getDoc(doc(guest(), "catalog/stock")));
  });

  it("tambah/hapus produk ditolak", async () => {
    await assertFails(updateDoc(doc(alice(), "catalog/stock"), { "stock.P999": { "|": 1 } }));
    await assertFails(updateDoc(doc(alice(), "catalog/stock"), { stock: { P001: stock.P001 } }));
  });

  it("field selain stock tidak boleh berubah", async () => {
    await assertFails(updateDoc(doc(alice(), "catalog/stock"), { schemaVersion: 2 }));
  });

  it("create hanya bila belum ada", async () => {
    await assertFails(setDoc(doc(alice(), "catalog/stock"), { stock }));
    await env.clearFirestore();
    await assertSucceeds(setDoc(doc(alice(), "catalog/stock"), { stock, schemaVersion: 1 }));
  });
});

it("path lain ditolak", async () => {
  await assertFails(getDoc(doc(alice(), "products/P001")));
  await assertFails(setDoc(doc(alice(), "templates/account"), { x: 1 }));
});
