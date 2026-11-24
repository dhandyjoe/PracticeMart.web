import { describe, expect, it } from "vitest";
import { hashPin, verifyPin } from "./pinHash";

describe("hashPin", () => {
  it("lulus test vector kontrak §8.6", async () => {
    const salt = Uint8Array.from({ length: 16 }, (_, i) => i);
    expect(await hashPin("123456", salt)).toBe(
      "pbkdf2$10000$000102030405060708090a0b0c0d0e0f$6f4f2d621842bcdf52c44ef73d28d6017045e5d543b5547d56ddda1524d03ce1",
    );
  });

  it("salt acak 16 byte per panggilan", async () => {
    const a = await hashPin("123456");
    const b = await hashPin("123456");
    expect(a).toMatch(/^pbkdf2\$10000\$[0-9a-f]{32}\$[0-9a-f]{64}$/);
    expect(a).not.toBe(b);
  });
});

describe("verifyPin", () => {
  const vector =
    "pbkdf2$10000$000102030405060708090a0b0c0d0e0f$6f4f2d621842bcdf52c44ef73d28d6017045e5d543b5547d56ddda1524d03ce1";

  it("cocok dengan test vector & iterasi dibaca dari string", async () => {
    expect(await verifyPin("123456", vector)).toBe(true);
    expect(await verifyPin("654321", vector)).toBe(false);
    expect(await verifyPin("123456", await hashPin("123456", undefined, 1000))).toBe(true);
  });

  it.each(["", "sha1$1$00$ab", "pbkdf2$x$00$ab", "pbkdf2$10$zz$ab", "pbkdf2$10$00$"])("format rusak %s → false", async (s) => {
    expect(await verifyPin("123456", s)).toBe(false);
  });
});
