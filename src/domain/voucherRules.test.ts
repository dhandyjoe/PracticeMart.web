import { describe, expect, it } from "vitest";
import { formatRupiah } from "./money";
import { normalizeCode, shippingDiscount, voucherDiscount, voucherError } from "./voucherRules";

describe("formatRupiah (kontrak §2)", () => {
  it.each([
    [0, "Rp0"],
    [15_000, "Rp15.000"],
    [158_000, "Rp158.000"],
    [1_250_000, "Rp1.250.000"],
  ])("%i → %s", (n, s) => expect(formatRupiah(n)).toBe(s));
});

describe("voucherError", () => {
  it.each([
    ["hemat10", 10_000, ""],
    [" ONGKIR ", 0, ""],
    ["MIN100K", 100_000, ""],
    ["MIN100K", 99_999, "Minimal belanja Rp100.000"],
    ["EXPIRED", 500_000, "Voucher sudah kedaluwarsa"],
    ["DISKON", 500_000, "Voucher tidak ditemukan"],
    ["", 500_000, "Voucher tidak ditemukan"],
  ])("%s @ %i → '%s'", (code, sub, err) => expect(voucherError(code, sub)).toBe(err));

  it("normalizeCode", () => expect(normalizeCode(" hemat10 ")).toBe("HEMAT10"));
});

describe("voucherDiscount", () => {
  it("HEMAT10: 10% dibulatkan ke bawah, maks Rp50.000 (contoh kontrak: Rp150.000 → Rp15.000)", () => {
    expect(voucherDiscount("HEMAT10", 150_000)).toBe(15_000);
    expect(voucherDiscount("HEMAT10", 75_005)).toBe(7_500);
    expect(voucherDiscount("HEMAT10", 900_000)).toBe(50_000);
  });

  it("MIN100K Rp15.000 bila subtotal ≥ Rp100.000", () => {
    expect(voucherDiscount("MIN100K", 100_000)).toBe(15_000);
    expect(voucherDiscount("MIN100K", 99_000)).toBe(0);
  });

  it("ONGKIR & tanpa voucher tidak memotong subtotal", () => {
    expect(voucherDiscount("ONGKIR", 150_000)).toBe(0);
    expect(voucherDiscount(null, 150_000)).toBe(0);
  });

  it("ONGKIR memotong ongkir maks Rp20.000", () => {
    expect(shippingDiscount("ONGKIR", 10_000)).toBe(10_000);
    expect(shippingDiscount("ONGKIR", 35_000)).toBe(20_000);
    expect(shippingDiscount("HEMAT10", 20_000)).toBe(0);
  });
});
