import type { CartLine } from "../data/schema";

// Kontrak §2: maks qty per item = min(stok varian, 10). PRD FR-SHOP-16: produk+varian sama digabung.

export const MAX_QTY = 10;
export const MAX_QTY_TEXT = "Maksimal pembelian 10 pcs";

export const maxQty = (stockLeft: number) => Math.max(0, Math.min(stockLeft, MAX_QTY));

export const sameLine = (a: Pick<CartLine, "productId" | "color" | "size">, b: typeof a) =>
  a.productId === b.productId && a.color === b.color && a.size === b.size;

export type NewLine = Pick<CartLine, "productId" | "color" | "size" | "qty">;

// Mengembalikan keranjang baru + jumlah yang benar-benar masuk (0 = sudah di batas maksimal).
export function addLine(cart: CartLine[], line: NewLine, stockLeft: number): { cart: CartLine[]; added: number } {
  const existing = cart.find((l) => sameLine(l, line));
  const current = existing?.qty ?? 0;
  const qty = Math.min(current + line.qty, maxQty(stockLeft));
  const added = Math.max(0, qty - current);
  if (!added) return { cart, added };
  if (existing) {
    return { cart: cart.map((l) => (l === existing ? { ...l, qty, selected: true, saved: false } : l)), added };
  }
  return { cart: [...cart, { ...line, qty, selected: true, saved: false }], added };
}

export const activeLines = (cart: CartLine[]) => cart.filter((l) => !l.saved);

// Badge keranjang = jumlah qty di keranjang aktif (tanpa "Simpan untuk nanti").
export const cartCount = (cart: CartLine[]) => activeLines(cart).reduce((n, l) => n + l.qty, 0);

export function selectAllState(cart: CartLine[]): "all" | "some" | "none" {
  const lines = activeLines(cart);
  const selected = lines.filter((l) => l.selected).length;
  if (!lines.length || !selected) return "none";
  return selected === lines.length ? "all" : "some";
}

export const selectedSubtotal = (cart: CartLine[], priceOf: (productId: string) => number) =>
  activeLines(cart)
    .filter((l) => l.selected)
    .reduce((sum, l) => sum + priceOf(l.productId) * l.qty, 0);
