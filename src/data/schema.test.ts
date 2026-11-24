import { describe, expect, it } from "vitest";
import { parseCartLine, parseState, parseStock } from "./schema";

describe("parseState (kontrak §8.5)", () => {
  it("dokumen kosong/undefined → default lengkap", () => {
    expect(parseState(undefined)).toEqual({
      profile: { name: "", email: "", birth: "", gender: "", photoUri: "" },
      balance: 0,
      pinHash: "",
      pinFailures: 0,
      pinLockedUntil: 0,
      voucher: null,
      cart: [],
      wishlist: [],
      history: [],
      addresses: [],
      orderSeq: 0,
      schemaVersion: 1,
    });
    expect(parseState([1, 2]).cart).toEqual([]);
  });

  it("nilai valid dipertahankan, tipe salah diabaikan", () => {
    const s = parseState({
      profile: { name: "Rina", email: 5 },
      balance: 342000.9,
      voucher: "",
      cart: [{ productId: "P001", color: "Hitam", size: "L", qty: 2 }, { productId: 1 }, "x"],
      wishlist: ["P001", 2, "P010"],
      history: "kaos",
      addresses: [{ id: "home", label: "Rumah", isPrimary: true }, null],
      orderSeq: "3",
      schemaVersion: 2,
      unknownField: true,
    });
    expect(s.profile).toMatchObject({ name: "Rina", email: "" });
    expect(s.balance).toBe(342000);
    expect(s.voucher).toBeNull();
    expect(s.cart).toEqual([{ productId: "P001", color: "Hitam", size: "L", qty: 2, selected: true, saved: false }]);
    expect(s.wishlist).toEqual(["P001", "P010"]);
    expect(s.history).toEqual([]);
    expect(s.addresses).toHaveLength(1);
    expect(s.addresses[0]).toMatchObject({ id: "home", label: "Rumah", city: "", isPrimary: true });
    expect(s.orderSeq).toBe(0);
    expect(s.schemaVersion).toBe(2);
  });

  it("baris keranjang qty < 1 dibuang", () => {
    expect(parseCartLine({ productId: "P001", qty: 0 })).toBeNull();
    expect(parseCartLine({ productId: "P001", qty: 1, selected: false, saved: true })).toMatchObject({
      selected: false,
      saved: true,
    });
  });
});

describe("parseStock", () => {
  it("map stok, nilai negatif/salah → 0, produk rusak dilewati", () => {
    expect(parseStock({ stock: { P001: { "Hitam|L": 5, "Hitam|XL": -2, "Putih|L": "x" }, P002: 3 } })).toEqual({
      P001: { "Hitam|L": 5, "Hitam|XL": 0, "Putih|L": 0 },
    });
    expect(parseStock(undefined)).toEqual({});
  });
});
