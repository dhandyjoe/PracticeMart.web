import { FirebaseError } from "firebase/app";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { getDoc, runTransaction, setDoc } from "firebase/firestore";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthError, getDisplayName, login, logout, register, toAuthError } from "./authRepository";
import { INITIAL_TRANSACTIONS } from "./initialAccount";

vi.mock("./firebase", () => ({ auth: "AUTH", db: "DB" }));
vi.mock("firebase/auth", () => ({
  signInWithEmailAndPassword: vi.fn(),
  createUserWithEmailAndPassword: vi.fn(),
  signOut: vi.fn(),
}));
vi.mock("firebase/firestore", () => ({
  doc: vi.fn((_db: unknown, ...path: string[]) => path.join("/")),
  getDoc: vi.fn(),
  setDoc: vi.fn(),
  runTransaction: vi.fn(),
}));

const snap = (data?: object) => ({ exists: () => !!data, data: () => data }) as never;
const credential = (uid: string, email: string | null) => ({ user: { uid, email } }) as never;
const fbError = (code: string) => new FirebaseError(code, code);

const tx = { get: vi.fn(), set: vi.fn() };

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(runTransaction).mockImplementation(async (_db, fn) => fn(tx as never));
  vi.mocked(signOut).mockResolvedValue();
});

describe("toAuthError", () => {
  it.each([
    ["auth/invalid-credential", "Email atau password salah"],
    ["auth/invalid-login-credentials", "Email atau password salah"],
    ["auth/user-not-found", "Email atau password salah"],
    ["auth/wrong-password", "Email atau password salah"],
    ["auth/invalid-email", "Email atau password salah"],
    ["auth/email-already-in-use", "Email sudah terdaftar"],
    ["auth/too-many-requests", "Terlalu banyak percobaan. Coba lagi nanti."],
    ["auth/network-request-failed", "Tidak ada koneksi. Periksa internet lalu coba lagi."],
    ["permission-denied", "Gagal memuat, coba lagi"],
  ])("%s → %s", (code, text) => {
    expect(toAuthError(fbError(code)).message).toBe(text);
  });

  it("error non-Firebase → failed; AuthError diteruskan apa adanya", () => {
    expect(toAuthError(new Error("x")).kind).toBe("failed");
    const e = new AuthError("tooMany");
    expect(toAuthError(e)).toBe(e);
  });
});

describe("login", () => {
  it("login pertama: lengkapi users/{uid} dan tulis data awal + 8 transaksi", async () => {
    vi.mocked(signInWithEmailAndPassword).mockResolvedValue(credential("u1", "rina@mail.com"));
    vi.mocked(getDoc).mockResolvedValue(snap());
    tx.get.mockResolvedValue(snap());

    await login("  rina@mail.com ", "Rahasia123");

    expect(signInWithEmailAndPassword).toHaveBeenCalledWith("AUTH", "rina@mail.com", "Rahasia123");
    expect(setDoc).toHaveBeenCalledWith(
      "users/u1",
      expect.objectContaining({ email: "rina@mail.com", displayName: "rina", schemaVersion: 1 }),
    );
    expect(tx.get).toHaveBeenCalledWith("states/u1");
    const [stateRef, state] = tx.set.mock.calls[0];
    expect(stateRef).toBe("states/u1");
    expect(state).toMatchObject({ profile: { name: "rina", email: "rina@mail.com" }, balance: 500_000 });
    expect(state.pinHash).toMatch(/^pbkdf2\$10000\$/);
    expect(tx.set.mock.calls.slice(1).map(([ref]) => ref)).toEqual(
      INITIAL_TRANSACTIONS.map((t) => `states/u1/transactions/${t.id}`),
    );
    expect(signOut).not.toHaveBeenCalled();
  });

  it("akun lama: tidak menulis apa pun (idempoten)", async () => {
    vi.mocked(signInWithEmailAndPassword).mockResolvedValue(credential("u1", "rina@mail.com"));
    vi.mocked(getDoc).mockResolvedValue(snap({ displayName: "Rina W" }));
    tx.get.mockResolvedValue(snap({ balance: 1 }));

    await login("rina@mail.com", "x");

    expect(setDoc).not.toHaveBeenCalled();
    expect(tx.set).not.toHaveBeenCalled();
  });

  it("users/{uid} ada: nama dipakai untuk data awal", async () => {
    vi.mocked(signInWithEmailAndPassword).mockResolvedValue(credential("u1", "rina@mail.com"));
    vi.mocked(getDoc).mockResolvedValue(snap({ displayName: "Rina W" }));
    tx.get.mockResolvedValue(snap());

    await login("rina@mail.com", "x");

    expect(setDoc).not.toHaveBeenCalled();
    expect(tx.set.mock.calls[0][1].profile.name).toBe("Rina W");
  });

  it("kredensial salah → AuthError invalid, tanpa baca Firestore", async () => {
    vi.mocked(signInWithEmailAndPassword).mockRejectedValue(fbError("auth/invalid-credential"));

    await expect(login("rina@mail.com", "salah")).rejects.toMatchObject({ kind: "invalid" });
    expect(getDoc).not.toHaveBeenCalled();
  });

  it("gagal menyiapkan data akun → signOut lalu error failed", async () => {
    vi.mocked(signInWithEmailAndPassword).mockResolvedValue(credential("u1", null));
    vi.mocked(getDoc).mockRejectedValue(fbError("unavailable"));

    await expect(login("rina@mail.com", "x")).rejects.toMatchObject({ kind: "failed" });
    expect(signOut).toHaveBeenCalledWith("AUTH");
  });
});

describe("register", () => {
  it("buat akun, tulis users/{uid} dengan email dari Auth, lalu signOut", async () => {
    vi.mocked(createUserWithEmailAndPassword).mockResolvedValue(credential("u2", "rina@mail.com"));

    await register(" Rina Wulandari ", " Rina@Mail.com ", "abcd1234");

    expect(createUserWithEmailAndPassword).toHaveBeenCalledWith("AUTH", "Rina@Mail.com", "abcd1234");
    expect(setDoc).toHaveBeenCalledWith(
      "users/u2",
      expect.objectContaining({ email: "rina@mail.com", displayName: "Rina Wulandari", schemaVersion: 1 }),
    );
    expect(vi.mocked(setDoc).mock.calls[0][1]).toHaveProperty("createdAt", expect.any(Number));
    expect(signOut).toHaveBeenCalledWith("AUTH");
  });

  it("email Auth kosong → pakai email input", async () => {
    vi.mocked(createUserWithEmailAndPassword).mockResolvedValue(credential("u2", null));

    await register("Rina", "rina@mail.com", "abcd1234");

    expect(setDoc).toHaveBeenCalledWith("users/u2", expect.objectContaining({ email: "rina@mail.com" }));
  });

  it("email sudah dipakai → AuthError emailInUse, tetap signOut", async () => {
    vi.mocked(createUserWithEmailAndPassword).mockRejectedValue(fbError("auth/email-already-in-use"));

    await expect(register("Rina", "rina@mail.com", "abcd1234")).rejects.toMatchObject({
      kind: "emailInUse",
      message: "Email sudah terdaftar",
    });
    expect(setDoc).not.toHaveBeenCalled();
    expect(signOut).toHaveBeenCalled();
  });
});

describe("sesi & profil", () => {
  it("logout memanggil signOut", async () => {
    await logout();
    expect(signOut).toHaveBeenCalledWith("AUTH");
  });

  it("getDisplayName membaca users/{uid}", async () => {
    vi.mocked(getDoc).mockResolvedValueOnce(snap({ displayName: "Rina" })).mockResolvedValueOnce(snap());
    expect(await getDisplayName("u1")).toBe("Rina");
    expect(await getDisplayName("u1")).toBe("");
  });
});
