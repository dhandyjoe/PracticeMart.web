import { deleteApp } from "firebase/app";
import { collection, doc, getDoc, getDocs, updateDoc } from "firebase/firestore";
import { afterAll, describe, expect, it } from "vitest";
import { getDisplayName, login, logout, register } from "../../src/data/authRepository";
import { app, auth, db } from "../../src/data/firebase";

// Architecture §14: repository diuji terhadap Emulator Suite dengan rules asli (npm run test:integration).
const email = `rina.${Date.now()}@test.dev`;
const password = "abcd1234";

afterAll(() => deleteApp(app));

describe("auth repository × Emulator", () => {
  it("register menulis users/{uid} lalu keluar", async () => {
    await register("Rina Wulandari", email, password);
    expect(auth.currentUser).toBeNull();
  });

  it("email yang sama ditolak", async () => {
    await expect(register("Rina", email, password)).rejects.toMatchObject({ message: "Email sudah terdaftar" });
  });

  it("password salah", async () => {
    await expect(login(email, "salah123")).rejects.toMatchObject({ message: "Email atau password salah" });
  });

  it("login pertama menulis data awal sekali saja", async () => {
    await login(email, password);
    const uid = auth.currentUser!.uid;
    expect(await getDisplayName(uid)).toBe("Rina Wulandari");

    const state = (await getDoc(doc(db, "states", uid))).data()!;
    expect(state).toMatchObject({ balance: 500_000, orderSeq: 0, profile: { name: "Rina Wulandari", email } });
    expect((await getDocs(collection(db, "states", uid, "transactions"))).size).toBe(8);

    await updateDoc(doc(db, "states", uid), { wishlist: [] });
    await logout();
    await login(email, password);
    expect((await getDoc(doc(db, "states", uid))).data()!.wishlist).toEqual([]);
    await logout();
  });
});
