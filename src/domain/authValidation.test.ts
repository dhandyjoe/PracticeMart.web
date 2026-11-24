import { describe, expect, it } from "vitest";
import {
  isEmail,
  isRegisterValid,
  lockSecondsLeft,
  loginErrors,
  passwordStrength,
  recordLoginFailure,
  STRENGTH_LABEL,
  UNLOCKED,
} from "./authValidation";

describe("isEmail", () => {
  it.each(["a@b.co", "  rina@mail.com  ", "x.y+z@sub.domain.id"])("valid: %s", (v) => {
    expect(isEmail(v)).toBe(true);
  });
  it.each(["", "rina", "rina@", "rina@mail", "@mail.com", "ri na@mail.com"])("tidak valid: %s", (v) => {
    expect(isEmail(v)).toBe(false);
  });
});

describe("passwordStrength", () => {
  it.each([
    ["", 0],
    ["abc", 1],
    ["abcdefgh", 1],
    ["12345678", 1],
    ["abc1234", 1],
    ["abcd1234", 2],
    ["abcdefgh1234", 2],
    ["abcdefgh123!", 3],
  ] as const)("%s → %i", (pw, level) => {
    expect(passwordStrength(pw)).toBe(level);
  });

  it("label sesuai FR-AUTH-12", () => {
    expect(STRENGTH_LABEL).toEqual(["", "Lemah", "Sedang", "Kuat"]);
  });
});

describe("loginErrors", () => {
  it("field kosong (kontrak §6)", () => {
    expect(loginErrors("  ", "")).toEqual({ email: "Email wajib diisi", password: "Password wajib diisi" });
  });
  it("format email salah", () => {
    expect(loginErrors("rina", "x")).toEqual({ email: "Format email tidak valid" });
  });
  it("valid", () => {
    expect(loginErrors("rina@mail.com", "x")).toEqual({});
  });
});

describe("isRegisterValid", () => {
  const ok = { name: "Rina", email: "rina@mail.com", password: "abcd1234", confirm: "abcd1234", agree: true };

  it("semua valid", () => {
    expect(isRegisterValid(ok)).toBe(true);
  });
  it.each([
    ["nama kosong", { name: " " }],
    ["email salah", { email: "rina" }],
    ["password lemah", { password: "abc", confirm: "abc" }],
    ["konfirmasi beda", { confirm: "abcd12345" }],
    ["S&K belum dicentang", { agree: false }],
  ])("%s", (_, patch) => {
    expect(isRegisterValid({ ...ok, ...patch })).toBe(false);
  });
});

describe("login lock", () => {
  it("terkunci 30 dtk setelah 3× gagal, hitungan direset", () => {
    let lock = recordLoginFailure(UNLOCKED, 0);
    expect(lock).toEqual({ fails: 1, lockedUntil: 0 });
    lock = recordLoginFailure(lock, 0);
    expect(lock).toEqual({ fails: 2, lockedUntil: 0 });
    lock = recordLoginFailure(lock, 1_000);
    expect(lock).toEqual({ fails: 0, lockedUntil: 31_000 });
  });

  it("sisa detik dibulatkan ke atas, minimal 0", () => {
    const lock = { fails: 0, lockedUntil: 31_000 };
    expect(lockSecondsLeft(lock, 1_000)).toBe(30);
    expect(lockSecondsLeft(lock, 1_500)).toBe(30);
    expect(lockSecondsLeft(lock, 30_001)).toBe(1);
    expect(lockSecondsLeft(lock, 31_000)).toBe(0);
    expect(lockSecondsLeft(UNLOCKED, 5_000)).toBe(0);
  });
});
