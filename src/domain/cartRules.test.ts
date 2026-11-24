import { describe, expect, it } from "vitest";
import type { CartLine } from "../data/schema";
import { addLine, cartCount, maxQty, selectAllState, selectedSubtotal } from "./cartRules";

const line = (patch: Partial<CartLine> = {}): CartLine => ({
  productId: "P001",
  color: "Hitam",
  size: "L",
  qty: 1,
  selected: true,
  saved: false,
  ...patch,
});

describe("maxQty", () => {
  it("min(stok, 10), tidak negatif", () => {
    expect(maxQty(3)).toBe(3);
    expect(maxQty(25)).toBe(10);
    expect(maxQty(-1)).toBe(0);
  });
});

describe("addLine", () => {
  it("baris baru", () => {
    const r = addLine([], { productId: "P001", color: "Hitam", size: "L", qty: 2 }, 10);
    expect(r).toEqual({ cart: [line({ qty: 2 })], added: 2 });
  });

  it("produk+varian sama digabung, dibatasi maks, keluar dari 'simpan untuk nanti'", () => {
    const r = addLine([line({ qty: 8, saved: true, selected: false })], { ...line(), qty: 5 }, 20);
    expect(r.added).toBe(2);
    expect(r.cart).toEqual([line({ qty: 10 })]);
  });

  it("varian beda tidak digabung", () => {
    expect(addLine([line()], { ...line(), size: "M" }, 10).cart).toHaveLength(2);
  });

  it("sudah di batas → added 0, keranjang tidak berubah", () => {
    const cart = [line({ qty: 3 })];
    expect(addLine(cart, line(), 3)).toEqual({ cart, added: 0 });
  });
});

describe("ringkasan", () => {
  const cart = [line({ qty: 2 }), line({ productId: "P002", qty: 1, selected: false }), line({ productId: "P010", qty: 4, saved: true })];
  const price = (id: string) => ({ P001: 75_000, P002: 450_000, P010: 850_000 })[id] ?? 0;

  it("badge = qty keranjang aktif", () => {
    expect(cartCount(cart)).toBe(3);
  });

  it("subtotal hanya baris terpilih & aktif", () => {
    expect(selectedSubtotal(cart, price)).toBe(150_000);
  });

  it("Pilih Semua tri-state", () => {
    expect(selectAllState(cart)).toBe("some");
    expect(selectAllState([line()])).toBe("all");
    expect(selectAllState([line({ selected: false })])).toBe("none");
    expect(selectAllState([])).toBe("none");
  });
});
