import { describe, expect, it } from "vitest";
import {
  vaBankOf,
  vaNumber,
  appDate,
  cardErrors,
  cardOutcome,
  courierAvailable,
  expiryError,
  formatCardNumber,
  formatExpiry,
  isDeliveryTimeValid,
  luhn,
  orderId,
  priceSummary,
} from "./payment";

describe("priceSummary (kontrak §2)", () => {
  it("contoh kontrak: 2 × Rp75.000, HEMAT10, Express, asuransi → Rp158.000", () => {
    expect(priceSummary(150_000, "HEMAT10", "express", true)).toEqual({
      subtotal: 150_000,
      discount: 15_000,
      shipping: 20_000,
      shippingDiscount: 0,
      insurance: 2_000,
      serviceFee: 1_000,
      total: 158_000,
    });
  });

  it("ONGKIR: Same Day tetap bayar Rp15.000; Reguler gratis", () => {
    expect(priceSummary(100_000, "ONGKIR", "sameday", false)).toMatchObject({ shippingDiscount: 20_000, total: 116_000 });
    expect(priceSummary(100_000, "ONGKIR", "reguler", false)).toMatchObject({ shippingDiscount: 10_000, total: 101_000 });
  });

  it("voucher tidak memenuhi syarat diabaikan", () => {
    expect(priceSummary(75_000, "MIN100K", "reguler", false)).toMatchObject({ discount: 0, total: 86_000 });
    expect(priceSummary(75_000, null, "reguler", false).total).toBe(86_000);
  });
});

describe("kurir", () => {
  it("Same Day hanya DKI Jakarta", () => {
    expect(courierAvailable("sameday", "DKI Jakarta")).toBe(true);
    expect(courierAvailable("sameday", "Jawa Barat")).toBe(false);
    expect(courierAvailable("express", "Jawa Barat")).toBe(true);
  });

  it.each([
    ["09:00", true],
    ["17:00", true],
    ["12:30", true],
    ["08:59", false],
    ["17:01", false],
    ["", false],
  ])("jam kirim %s → %s", (t, ok) => expect(isDeliveryTimeValid(t)).toBe(ok));
});

describe("kartu", () => {
  it("format nomor per 4 digit, maks 16", () => {
    expect(formatCardNumber("4111-1111 11111111999")).toBe("4111 1111 1111 1111");
    expect(formatCardNumber("41111")).toBe("4111 1");
  });

  it("format MM/YY", () => {
    expect(formatExpiry("1230")).toBe("12/30");
    expect(formatExpiry("1")).toBe("1");
    expect(formatExpiry("12/3")).toBe("12/3");
  });

  it.each([
    ["4111 1111 1111 1111", true],
    ["4000 0000 0000 0002", true],
    ["4000 0000 0000 0119", true],
    ["4111 1111 1111 1112", false],
    ["4111", false],
  ])("Luhn %s → %s", (n, ok) => expect(luhn(n)).toBe(ok));

  it("kedaluwarsa dihitung sampai akhir bulan", () => {
    const now = new Date(2026, 10, 20);
    expect(expiryError("11/26", now)).toBe("");
    expect(expiryError("10/26", now)).toBe("Kartu sudah kedaluwarsa");
    expect(expiryError("13/30", now)).toBe("Format MM/YY tidak valid");
    expect(expiryError("1230", now)).toBe("Format MM/YY tidak valid");
  });

  it("cardErrors", () => {
    const now = new Date(2026, 10, 20);
    expect(cardErrors({ number: "4111111111111111", expiry: "12/30", cvv: "123" }, now)).toEqual({});
    expect(cardErrors({ number: "4111111111111112", expiry: "01/20", cvv: "12" }, now)).toEqual({
      number: "Nomor kartu tidak valid",
      expiry: "Kartu sudah kedaluwarsa",
      cvv: "CVV harus 3 digit",
    });
  });

  it("kartu uji kontrak §4.3", () => {
    expect(cardOutcome("4111 1111 1111 1111")).toBe("success");
    expect(cardOutcome("4000 0000 0000 0002")).toBe("declined");
    expect(cardOutcome("4000000000000119")).toBe("pending");
  });
});

describe("Order ID", () => {
  it("PM-YYYYMMDD-XXXX", () => {
    expect(orderId("20260115", 1)).toBe("PM-20260115-0001");
    expect(orderId("20260115", 1234)).toBe("PM-20260115-1234");
  });

  it("tanggal app: deterministik 20260115, selain itu Asia/Jakarta", () => {
    const lateUtc = Date.parse("2026-11-19T20:00:00Z"); // 03:00 WIB tanggal 20
    expect(appDate(lateUtc, true)).toBe("20260115");
    expect(appDate(lateUtc, false)).toBe("20261120");
  });
});

describe("Virtual Account", () => {
  it("BCA deterministik = nomor kontrak §4.3; bank lain/acak = prefix + digit Order ID", () => {
    expect(vaNumber("PM-20260115-0003", "BCA")).toBe("8077 0000 1234 5678");
    expect(vaNumber("PM-20261120-0003", "BCA")).toBe("8077 2026 1120 0003");
    expect(vaNumber("PM-20260115-0003", "BNI")).toBe("8808 2026 0115 0003");
    expect(vaNumber("PM-20261120-0012", "Mandiri")).toBe("8900 2026 1120 0012");
  });
  it("bank dari methodLabel; label lama tanpa bank → BCA", () => {
    expect(vaBankOf("Virtual Account Mandiri")).toBe("Mandiri");
    expect(vaBankOf("Virtual Account")).toBe("BCA");
  });
});
