import { shippingDiscount, voucherDiscount, voucherError } from "./voucherRules";

// Kontrak §2 & §4.3, PRD FR-PAYM-03/05/06/11.

export const COURIERS = {
  reguler: { name: "Reguler", note: "Estimasi 3–5 hari", fee: 10_000 },
  express: { name: "Express", note: "Estimasi 1–2 hari", fee: 20_000 },
  sameday: { name: "Same Day", note: "Tiba hari ini", fee: 35_000 },
} as const;
export type Courier = keyof typeof COURIERS;

export const SAME_DAY_PROVINCE = "DKI Jakarta";
export const SAME_DAY_UNAVAILABLE = "Tidak tersedia untuk kota ini";
export const courierAvailable = (c: Courier, province: string) => c !== "sameday" || province === SAME_DAY_PROVINCE;

// Same Day: jam kirim 09:00–17:00.
export const isDeliveryTimeValid = (hhmm: string) => /^\d{2}:\d{2}$/.test(hhmm) && hhmm >= "09:00" && hhmm <= "17:00";

export const INSURANCE_FEE = 2_000;
export const SERVICE_FEE = 1_000;
export const COD_LIMIT = 1_000_000;

export type PriceSummary = {
  subtotal: number;
  discount: number;
  shipping: number;
  shippingDiscount: number;
  insurance: number;
  serviceFee: number;
  total: number;
};

// Kontrak §2: Total = Subtotal − Diskon voucher + (Ongkir − Potongan ongkir) + Asuransi + Biaya layanan.
export function priceSummary(subtotal: number, voucher: string | null, courier: Courier, insurance: boolean): PriceSummary {
  const valid = voucher && !voucherError(voucher, subtotal) ? voucher : null;
  const discount = voucherDiscount(valid, subtotal);
  const shipping = COURIERS[courier].fee;
  const shipDiscount = shippingDiscount(valid, shipping);
  const ins = insurance ? INSURANCE_FEE : 0;
  return {
    subtotal,
    discount,
    shipping,
    shippingDiscount: shipDiscount,
    insurance: ins,
    serviceFee: SERVICE_FEE,
    total: subtotal - discount + (shipping - shipDiscount) + ins + SERVICE_FEE,
  };
}

export const METHODS = {
  card: "Kartu Kredit / Debit",
  va: "Virtual Account",
  wallet: "PracticePay",
  cod: "Bayar di Tempat (COD)",
} as const;
export type Method = keyof typeof METHODS;

// ---------- Kartu ----------
export const CARD_TEXT = {
  invalid: "Nomor kartu tidak valid",
  expired: "Kartu sudah kedaluwarsa",
  expiryFormat: "Format MM/YY tidak valid",
  cvv: "CVV harus 3 digit",
} as const;

export const digitsOnly = (s: string) => s.replace(/\D/g, "");

// "4111111111111111" → "4111 1111 1111 1111" (maks 16 digit).
export const formatCardNumber = (s: string) => digitsOnly(s).slice(0, 16).replace(/(\d{4})(?=\d)/g, "$1 ");

// "1230" / "12/30" → "12/30".
export function formatExpiry(s: string) {
  const d = digitsOnly(s).slice(0, 4);
  return d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
}

export function luhn(number: string): boolean {
  const d = digitsOnly(number);
  if (d.length < 13 || d.length > 19) return false;
  let sum = 0;
  for (let i = 0; i < d.length; i++) {
    let n = Number(d[d.length - 1 - i]);
    if (i % 2 === 1) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
  }
  return sum % 10 === 0;
}

// Kartu berlaku sampai akhir bulan MM/YY. Memakai jam asli (kontrak §5), bukan tanggal deterministik.
export function expiryError(mmyy: string, now: Date): string {
  const m = /^(\d{2})\/(\d{2})$/.exec(mmyy);
  if (!m || Number(m[1]) < 1 || Number(m[1]) > 12) return CARD_TEXT.expiryFormat;
  const endOfMonth = new Date(2000 + Number(m[2]), Number(m[1]), 1);
  return now < endOfMonth ? "" : CARD_TEXT.expired;
}

export type Card = { number: string; expiry: string; cvv: string };

export function cardErrors(card: Card, now: Date): Partial<Record<keyof Card, string>> {
  const errors: Partial<Record<keyof Card, string>> = {};
  if (!luhn(card.number)) errors.number = CARD_TEXT.invalid;
  const exp = expiryError(card.expiry, now);
  if (exp) errors.expiry = exp;
  if (!/^\d{3}$/.test(card.cvv)) errors.cvv = CARD_TEXT.cvv;
  return errors;
}

// Kontrak §4.3: kartu uji. Nomor valid lain diperlakukan seperti kartu sukses.
export type CardOutcome = "success" | "declined" | "pending";
export function cardOutcome(number: string): CardOutcome {
  const d = digitsOnly(number);
  if (d === "4000000000000002") return "declined";
  if (d === "4000000000000119") return "pending";
  return "success";
}

export const OTP_3DS = "123456";

// ---------- Order ID ----------
// Kontrak §2: PM-YYYYMMDD-XXXX; YYYYMMDD = tanggal app (deterministik 2026-01-15, selain itu hari ini Asia/Jakarta).
export const DETERMINISTIC_DATE = "20260115";

export function appDate(now: number, deterministic: boolean) {
  if (deterministic) return DETERMINISTIC_DATE;
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit", day: "2-digit" })
    .format(now)
    .replace(/-/g, "");
}

export const orderId = (date: string, seq: number) => `PM-${date}-${String(seq).padStart(4, "0")}`;

// ---------- Virtual Account (FR-PAYM-05/08) ----------
export const VA_BANKS = ["BCA", "BNI", "Mandiri"] as const;
export type VaBank = (typeof VA_BANKS)[number];
const VA_PREFIX: Record<VaBank, string> = { BCA: "8077", BNI: "8808", Mandiri: "8900" };

// Bank disimpan di methodLabel ("Virtual Account BNI"); order lama tanpa nama bank = BCA.
export const vaBankOf = (methodLabel: string): VaBank => VA_BANKS.find((b) => methodLabel.endsWith(b)) ?? "BCA";

// Kontrak §4.3: BCA deterministik = 8077 0000 1234 5678.
// shortcut: bank lain & mode acak = prefix bank + digit Order ID karena kontrak belum mengaturnya; samakan dengan Android bila kontrak menambahkannya.
export function vaNumber(id: string, bank: VaBank) {
  const digits = bank === "BCA" && id.includes(DETERMINISTIC_DATE) ? "8077000012345678" : VA_PREFIX[bank] + id.replace(/\D/g, "");
  return digits.replace(/(\d{4})(?=\d)/g, "$1 ");
}
