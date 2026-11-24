import { describe, expect, it } from "vitest";
import { INITIAL_TRANSACTIONS, initialState } from "./initialAccount";

describe("data awal akun (kontrak §4.5)", () => {
  it("8 transaksi, ID 8→1, waktu Asia/Jakarta", () => {
    expect(INITIAL_TRANSACTIONS.map((t) => t.id)).toEqual(["8", "7", "6", "5", "4", "3", "2", "1"]);
    expect(new Date(INITIAL_TRANSACTIONS[0].at).toISOString()).toBe("2026-01-15T02:12:00.000Z");
    expect(new Date(INITIAL_TRANSACTIONS[7].at).toISOString()).toBe("2026-01-12T11:40:00.000Z");
    // Terbaru di atas.
    const times = INITIAL_TRANSACTIONS.map((t) => t.at);
    expect([...times].sort((a, b) => b - a)).toEqual(times);
  });

  it("state awal sesuai kontrak", () => {
    const s = initialState("Rina", "rina@mail.com", "pbkdf2$x");
    expect(s).toMatchObject({
      profile: { name: "Rina", email: "rina@mail.com" },
      balance: 500_000,
      pinHash: "pbkdf2$x",
      cart: [],
      voucher: null,
      wishlist: ["P001", "P010", "P002", "P020"],
      history: ["sepatu lari", "headphone", "buku catatan", "smartwatch"],
      orderSeq: 0,
      schemaVersion: 1,
    });
    expect(s.addresses.map((a) => [a.label, a.recipient, a.isPrimary])).toEqual([
      ["Rumah", "Rina", true],
      ["Kantor", "Rina", false],
    ]);
  });
});
