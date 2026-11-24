import { CATEGORIES, categoryName } from "../../data/catalog";
import { isSortKey, RATINGS, type SearchQuery } from "../../domain/catalogQuery";
import { formatRupiah } from "../../domain/money";

// design §14.4: state pencarian ada di URL agar bisa dibagikan.
// /shop/search?q=kaos&cat=fashion&cat=buku&min=50000&max=200000&rating=4&stock=1&sort=murah&view=list

export type View = "grid" | "list";

const num = (v: string | null) => {
  const n = v === null || v.trim() === "" ? NaN : Number(v);
  return Number.isFinite(n) && n >= 0 ? Math.trunc(n) : null;
};

export function readSearch(params: URLSearchParams): SearchQuery & { view: View } {
  const sort = params.get("sort") ?? "";
  const rating = Number(params.get("rating"));
  const slugs = CATEGORIES.map((c) => c.slug);
  return {
    q: params.get("q")?.trim() ?? "",
    cats: params.getAll("cat").filter((c) => slugs.includes(c)),
    min: num(params.get("min")),
    max: num(params.get("max")),
    rating: RATINGS.some((r) => r.value === rating) ? rating : 0,
    inStock: params.get("stock") === "1",
    sort: isSortKey(sort) ? sort : "relevan",
    view: params.get("view") === "list" ? "list" : "grid",
  };
}

export function writeSearch(s: SearchQuery & { view: View }): URLSearchParams {
  const p = new URLSearchParams();
  if (s.q) p.set("q", s.q);
  for (const c of s.cats) p.append("cat", c);
  if (s.min !== null) p.set("min", String(s.min));
  if (s.max !== null) p.set("max", String(s.max));
  if (s.rating) p.set("rating", String(s.rating));
  if (s.inStock) p.set("stock", "1");
  if (s.sort !== "relevan") p.set("sort", s.sort);
  if (s.view === "list") p.set("view", "list");
  return p;
}

export const activeFilterCount = (s: SearchQuery) =>
  s.cats.length + Number(s.min !== null || s.max !== null) + Number(s.rating > 0) + Number(s.inStock);

export type Chip = { label: string; remove: (s: SearchQuery) => Partial<SearchQuery> };

export function filterChips(s: SearchQuery): Chip[] {
  const chips: Chip[] = s.cats.map((c) => ({
    label: categoryName(c),
    remove: (q) => ({ cats: q.cats.filter((x) => x !== c) }),
  }));
  if (s.min !== null || s.max !== null) {
    const label =
      s.min !== null && s.max !== null
        ? `${formatRupiah(s.min)} – ${formatRupiah(s.max)}`
        : s.min !== null
          ? `≥ ${formatRupiah(s.min)}`
          : `≤ ${formatRupiah(s.max!)}`;
    chips.push({ label, remove: () => ({ min: null, max: null }) });
  }
  if (s.rating) {
    chips.push({ label: `Rating ${RATINGS.find((r) => r.value === s.rating)!.label}`, remove: () => ({ rating: 0 }) });
  }
  if (s.inStock) chips.push({ label: "Stok tersedia", remove: () => ({ inStock: false }) });
  return chips;
}
