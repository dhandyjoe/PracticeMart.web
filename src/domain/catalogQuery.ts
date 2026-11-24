import type { Product } from "../data/catalog";

// PRD FR-SHOP-04/05/06; kontrak §2 (saran mulai 2 karakter, maks 5) & §4.2 (rekomendasi).

export const MAX_SUGGESTIONS = 5;
export const MAX_HISTORY = 5;
export const RECOMMENDATION_COUNT = 5;
export const DETERMINISTIC_RECOMMENDATIONS = ["P001", "P002", "P010", "P020", "P060"];

export const SORTS = {
  relevan: "Paling Relevan",
  murah: "Harga Terendah",
  mahal: "Harga Tertinggi",
  rating: "Rating Tertinggi",
  baru: "Terbaru",
} as const;
export type SortKey = keyof typeof SORTS;
export const isSortKey = (v: string): v is SortKey => v in SORTS;

// Rating minimal: 0 = Semua.
export const RATINGS = [
  { value: 0, label: "Semua" },
  { value: 3, label: "≥ 3" },
  { value: 4, label: "≥ 4" },
  { value: 4.5, label: "≥ 4,5" },
];

export type SearchQuery = {
  q: string;
  cats: string[];
  min: number | null;
  max: number | null;
  rating: number;
  inStock: boolean;
  sort: SortKey;
};

const norm = (s: string) => s.trim().toLowerCase();

export function suggest(products: Product[], q: string): Product[] {
  const t = norm(q);
  return t.length < 2 ? [] : products.filter((p) => norm(p.name).includes(t)).slice(0, MAX_SUGGESTIONS);
}

// Riwayat terbaru di depan, tanpa duplikat (case-insensitive), maks 5.
export const pushHistory = (history: string[], q: string) =>
  q.trim() ? [q.trim(), ...history.filter((h) => norm(h) !== norm(q))].slice(0, MAX_HISTORY) : history;

export function searchProducts(products: Product[], query: SearchQuery, stockOf: (p: Product) => number): Product[] {
  const t = norm(query.q);
  const result = products.filter(
    (p) =>
      (!t || norm(p.name).includes(t)) &&
      (!query.cats.length || query.cats.includes(p.cat)) &&
      (query.min === null || p.price >= query.min) &&
      (query.max === null || p.price <= query.max) &&
      p.rating >= query.rating &&
      (!query.inStock || stockOf(p) > 0),
  );
  const by: Record<SortKey, (a: Product, b: Product) => number> = {
    // Nama yang diawali kata kunci lebih dulu; selebihnya urutan katalog (sort stabil).
    relevan: (a, b) => Number(!norm(a.name).startsWith(t)) - Number(!norm(b.name).startsWith(t)),
    murah: (a, b) => a.price - b.price,
    mahal: (a, b) => b.price - a.price,
    rating: (a, b) => b.rating - a.rating,
    // Katalog tidak punya tanggal: ID lebih besar = lebih baru.
    baru: (a, b) => b.id.localeCompare(a.id),
  };
  return result.sort(by[query.sort]);
}

export function recommendations(products: Product[], deterministic: boolean, random = Math.random): Product[] {
  if (deterministic) {
    return DETERMINISTIC_RECOMMENDATIONS.map((id) => products.find((p) => p.id === id)).filter(
      (p): p is Product => !!p,
    );
  }
  const pool = [...products];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, RECOMMENDATION_COUNT);
}
