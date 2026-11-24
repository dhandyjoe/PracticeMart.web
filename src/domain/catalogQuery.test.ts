import { describe, expect, it } from "vitest";
import { initialStock, PRODUCTS, totalStock, type Product } from "../data/catalog";
import {
  isSortKey,
  pushHistory,
  recommendations,
  searchProducts,
  suggest,
  type SearchQuery,
} from "./catalogQuery";

const stock = initialStock();
const stockOf = (p: Product) => totalStock(stock, p);
const q = (patch: Partial<SearchQuery>): SearchQuery => ({
  q: "",
  cats: [],
  min: null,
  max: null,
  rating: 0,
  inStock: false,
  sort: "relevan",
  ...patch,
});

describe("suggest", () => {
  it("mulai 2 karakter, maks 5, case-insensitive", () => {
    expect(suggest(PRODUCTS, "k")).toEqual([]);
    const s = suggest(PRODUCTS, " KA");
    expect(s.length).toBeLessThanOrEqual(5);
    expect(s.every((p) => p.name.toLowerCase().includes("ka"))).toBe(true);
    expect(suggest(PRODUCTS, "zzzz")).toEqual([]);
  });
});

describe("pushHistory", () => {
  it("terbaru di depan, tanpa duplikat, maks 5, abaikan kosong", () => {
    expect(pushHistory(["a", "b"], " B ")).toEqual(["B", "a"]);
    expect(pushHistory(["1", "2", "3", "4", "5"], "6")).toEqual(["6", "1", "2", "3", "4"]);
    expect(pushHistory(["a"], "  ")).toEqual(["a"]);
  });
});

describe("searchProducts", () => {
  it("kata kunci 'kaos'", () => {
    const r = searchProducts(PRODUCTS, q({ q: "kaos" }), stockOf);
    expect(r.length).toBeGreaterThan(0);
    expect(r.every((p) => p.name.toLowerCase().includes("kaos"))).toBe(true);
  });

  it("filter kategori, harga, rating, stok", () => {
    const r = searchProducts(
      PRODUCTS,
      q({ cats: ["fashion"], min: 50_000, max: 200_000, rating: 4.5, inStock: true }),
      stockOf,
    );
    expect(r.length).toBeGreaterThan(0);
    for (const p of r) {
      expect(p.cat).toBe("fashion");
      expect(p.price).toBeGreaterThanOrEqual(50_000);
      expect(p.price).toBeLessThanOrEqual(200_000);
      expect(p.rating).toBeGreaterThanOrEqual(4.5);
    }
    expect(searchProducts(PRODUCTS, q({ q: "buku catatan", inStock: true }), stockOf).map((p) => p.id)).not.toContain(
      "P060",
    );
  });

  it("urutan", () => {
    const prices = (sort: SearchQuery["sort"]) => searchProducts(PRODUCTS, q({ sort }), stockOf).map((p) => p.price);
    const murah = prices("murah");
    expect(murah).toEqual([...murah].sort((a, b) => a - b));
    expect(prices("mahal")).toEqual([...murah].reverse().sort((a, b) => b - a));
    const ratings = searchProducts(PRODUCTS, q({ sort: "rating" }), stockOf).map((p) => p.rating);
    expect(ratings).toEqual([...ratings].sort((a, b) => b - a));
    expect(searchProducts(PRODUCTS, q({ sort: "baru" }), stockOf)[0].id).toBe("P060");
    // Relevan: nama yang diawali kata kunci lebih dulu.
    const rel = searchProducts(PRODUCTS, q({ q: "kaos" }), stockOf);
    const firstNonPrefix = rel.findIndex((p) => !p.name.toLowerCase().startsWith("kaos"));
    expect(rel.slice(firstNonPrefix === -1 ? rel.length : firstNonPrefix).every((p) => !p.name.toLowerCase().startsWith("kaos"))).toBe(true);
  });

  it("isSortKey", () => {
    expect(isSortKey("murah")).toBe(true);
    expect(isSortKey("x")).toBe(false);
  });
});

describe("recommendations (kontrak §4.2)", () => {
  it("deterministik: P001, P002, P010, P020, P060", () => {
    expect(recommendations(PRODUCTS, true).map((p) => p.id)).toEqual(["P001", "P002", "P010", "P020", "P060"]);
  });

  it("acak: 5 produk unik, bergantung random", () => {
    const a = recommendations(PRODUCTS, false, () => 0);
    const b = recommendations(PRODUCTS, false, () => 0.99);
    expect(a).toHaveLength(5);
    expect(new Set(a.map((p) => p.id)).size).toBe(5);
    expect(a.map((p) => p.id)).not.toEqual(b.map((p) => p.id));
  });
});
