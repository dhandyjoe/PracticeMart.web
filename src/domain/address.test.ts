import { describe, expect, it } from "vitest";
import { addressErrors, formatAddress, locate, type AddressForm } from "./address";

const ok: AddressForm = {
  label: "Kantor",
  recipient: "Rina",
  phone: "0812-3456-7890",
  province: "DKI Jakarta",
  city: "Jakarta Pusat",
  street: "Jl. Sudirman No. 1",
  postal: "10220",
  isPrimary: false,
};

describe("addressErrors (FR-ACC-03)", () => {
  it("valid", () => expect(addressErrors(ok)).toEqual({}));

  it("semua error", () => {
    expect(
      addressErrors({ ...ok, recipient: " ", phone: "123", province: "Bali", street: "", postal: "1022" }),
    ).toEqual({
      recipient: "Wajib diisi",
      phone: "Nomor HP harus 10–13 digit",
      province: "Wajib diisi",
      street: "Wajib diisi",
      postal: "Kode pos harus 5 digit",
    });
    expect(addressErrors({ ...ok, city: "Bandung" })).toEqual({ city: "Pilih kota dari daftar" });
  });
});

describe("lokasi uji (kontrak §4.3)", () => {
  it("-6.2088, 106.8228 → DKI Jakarta, Jakarta Pusat", () => {
    expect(locate(-6.2088, 106.8228)).toEqual({ province: "DKI Jakarta", city: "Jakarta Pusat" });
    expect(locate(-6.9, 107.6)).toBeNull();
  });
});

it("formatAddress", () => {
  expect(formatAddress({ id: "a", ...ok, phone: "" })).toBe("Rina · Jl. Sudirman No. 1, Jakarta Pusat, DKI Jakarta 10220");
});
