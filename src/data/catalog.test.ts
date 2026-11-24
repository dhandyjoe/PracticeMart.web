import { describe, expect, it } from "vitest";
import {
  CATEGORIES,
  categoryName,
  discountPercent,
  firstAvailable,
  initialStock,
  PRODUCTS,
  productById,
  stockOf,
  totalStock,
  variants,
} from "./catalog";

const p = (id: string) => productById(id)!;

describe("katalog (kontrak §4.2)", () => {
  it("60 produk P001–P060, 6 kategori, setiap produk punya kategori valid", () => {
    expect(PRODUCTS).toHaveLength(60);
    expect(PRODUCTS[0].id).toBe("P001");
    expect(PRODUCTS[59].id).toBe("P060");
    expect(CATEGORIES.map((c) => c.name)).toEqual([
      "Fashion",
      "Elektronik",
      "Rumah Tangga",
      "Olahraga",
      "Buku",
      "Kecantikan",
    ]);
    const slugs = CATEGORIES.map((c) => c.slug);
    expect(PRODUCTS.every((x) => slugs.includes(x.cat))).toBe(true);
    expect(categoryName("rumah-tangga")).toBe("Rumah Tangga");
    expect(categoryName("x")).toBe("x");
    expect(productById("P999")).toBeUndefined();
  });

  it("tabel kontrak", () => {
    expect(p("P001")).toMatchObject({ name: "Kaos Polos Basic", price: 75_000 });
    expect(p("P002")).toMatchObject({ price: 450_000, orig: 600_000 });
    expect(discountPercent(p("P002"))).toBe(25);
    expect(discountPercent(p("P001"))).toBe(0);
    expect(p("P020").price).toBe(1_250_000);
  });

  it("varian warna × ukuran; tanpa varian = '|'", () => {
    expect(variants(p("P001"))).toHaveLength(12);
    expect(variants(p("P001"))[0]).toEqual({ color: "Hitam", size: "S", key: "Hitam|S" });
    expect(variants(p("P002")).map((v) => v.key)).toContain("|42");
    expect(variants(p("P060"))).toEqual([{ color: "", size: "", key: "|" }]);
  });

  it("stok awal: Hitam-XL P001 = 0, P002 3 per ukuran, P060 total 0", () => {
    const stock = initialStock();
    expect(Object.keys(stock)).toHaveLength(60);
    expect(stockOf(stock, "P001", "Hitam|XL")).toBe(0);
    expect(stockOf(stock, "P001", "Hitam|L")).toBe(10);
    expect(stockOf(stock, "P002", "|39")).toBe(3);
    expect(totalStock(stock, p("P060"))).toBe(0);
    expect(stockOf(stock, "P999", "|")).toBe(0);
  });

  it("firstAvailable melewati varian kosong", () => {
    const stock = { P001: { "Hitam|S": 0, "Hitam|M": 4 } };
    expect(firstAvailable(stock, p("P001"))?.key).toBe("Hitam|M");
    expect(firstAvailable(initialStock(), p("P060"))).toBeUndefined();
  });
});
