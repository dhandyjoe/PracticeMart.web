// Kontrak §2 & §4.3. Teks error wajib persis.

export const VOUCHER_TEXT = {
  notFound: "Voucher tidak ditemukan",
  expired: "Voucher sudah kedaluwarsa",
  minSpend: "Minimal belanja Rp100.000",
} as const;

const ACTIVE = ["HEMAT10", "ONGKIR", "MIN100K"];

export const normalizeCode = (code: string) => code.trim().toUpperCase();

// "" = boleh dipakai.
export function voucherError(code: string, subtotal: number): string {
  const c = normalizeCode(code);
  if (c === "EXPIRED") return VOUCHER_TEXT.expired;
  if (!ACTIVE.includes(c)) return VOUCHER_TEXT.notFound;
  if (c === "MIN100K" && subtotal < 100_000) return VOUCHER_TEXT.minSpend;
  return "";
}

// Diskon subtotal. ONGKIR tidak memotong subtotal (lihat shippingDiscount).
export function voucherDiscount(code: string | null, subtotal: number): number {
  if (code === "HEMAT10") return Math.min(Math.floor(subtotal * 0.1), 50_000);
  if (code === "MIN100K" && subtotal >= 100_000) return 15_000;
  return 0;
}

// Dipakai Checkout: potongan ongkir maks Rp20.000 (Same Day Rp35.000 → tetap bayar Rp15.000).
export const shippingDiscount = (code: string | null, shipping: number) =>
  code === "ONGKIR" ? Math.min(shipping, 20_000) : 0;
