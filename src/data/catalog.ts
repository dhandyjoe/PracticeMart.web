import raw from "./catalog.json";
import type { Stock } from "./schema";

// Kontrak §4.2: katalog dibundel, salinan identik PracticeMart.apps/app/src/main/assets/seed/catalog.json.

export type Category = { slug: string; name: string };

export type Product = {
  id: string;
  name: string;
  cat: string;
  price: number;
  orig: number | null;
  rating: number;
  colors: string[];
  sizes: string[];
  stock: number;
  zero: string[];
};

export type Variant = { color: string; size: string; key: string };

export const CATEGORIES: Category[] = raw.categories;
export const PRODUCTS: Product[] = raw.products;

const byId = new Map(PRODUCTS.map((p) => [p.id, p]));
export const productById = (id: string) => byId.get(id);
export const categoryName = (slug: string) => CATEGORIES.find((c) => c.slug === slug)?.name ?? slug;

// Key varian kontrak §8.2: "<warna>|<ukuran>", tanpa varian = "|".
export const variantKey = (color: string, size: string) => `${color}|${size}`;

export function variants(p: Product): Variant[] {
  const colors = p.colors.length ? p.colors : [""];
  const sizes = p.sizes.length ? p.sizes : [""];
  return colors.flatMap((color) => sizes.map((size) => ({ color, size, key: variantKey(color, size) })));
}

export const initialStock = (): Stock =>
  Object.fromEntries(
    PRODUCTS.map((p) => [p.id, Object.fromEntries(variants(p).map((v) => [v.key, p.zero.includes(v.key) ? 0 : p.stock]))]),
  );

export const stockOf = (stock: Stock, productId: string, key: string) => stock[productId]?.[key] ?? 0;

export const totalStock = (stock: Stock, p: Product) => variants(p).reduce((n, v) => n + stockOf(stock, p.id, v.key), 0);

// Varian pertama yang masih ada stoknya, untuk "+ Keranjang" dari kartu.
export const firstAvailable = (stock: Stock, p: Product) => variants(p).find((v) => stockOf(stock, p.id, v.key) > 0);

export const discountPercent = (p: Product) => (p.orig ? Math.round((1 - p.price / p.orig) * 100) : 0);
