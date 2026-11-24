import type { TransactionDoc } from "../data/schema";
import { formatRupiah } from "./money";

// Kontrak §2 & §4.4, PRD FR-PAY-03/05/10/11.

export const MIN_TRANSFER = 10_000;
export const NOTE_MAX = 50;
export const AMOUNT_CHIPS = [50_000, 100_000, 200_000];

export type Contact = { name: string; phone: string };
// shortcut: kontrak §4.4 hanya menetapkan nama (+ nomor Budi); nomor lain karangan, samakan dengan Android bila sudah ada.
export const CONTACTS: Contact[] = [
  { name: "Andi Pratama", phone: "0812-1111-2001" },
  { name: "Anisa Rahma", phone: "0812-1111-2002" },
  { name: "Budi Santoso", phone: "0812-3456-7890" },
  { name: "Bunga Lestari", phone: "0813-2222-2004" },
  { name: "Citra Dewi", phone: "0819-5555-2005" },
  { name: "Dewi Anggraini", phone: "0821-3333-2006" },
  { name: "Dimas Saputra", phone: "0821-3333-2007" },
  { name: "Eka Putri", phone: "0838-8888-2008" },
  { name: "Fajar Nugroho", phone: "0812-9999-2009" },
  { name: "Gilang Ramadhan", phone: "0857-4444-2010" },
];

const digits = (s: string) => s.replace(/\D/g, "");

// FR-PAY-03: cari nama atau nomor; kueri kosong = semua.
export function searchContacts(query: string): Contact[] {
  const q = query.trim().toLowerCase();
  const d = digits(q);
  return CONTACTS.filter((c) => !q || c.name.toLowerCase().includes(q) || (d !== "" && digits(c.phone).includes(d)));
}

// FR-PAY-03 "Terakhir": penerima transfer terbaru (maks 3, unik) dari judul transaksi "Transfer ke <nama>[ · catatan]".
export function recentContacts(txs: TransactionDoc[], max = 3): Contact[] {
  const out: Contact[] = [];
  for (const t of [...txs].sort((a, b) => b.at - a.at)) {
    const name = /^Transfer ke (.+?)(?: · |$)/.exec(t.title)?.[1];
    const c = CONTACTS.find((x) => x.name === name);
    if (c && !out.includes(c)) out.push(c);
    if (out.length === max) break;
  }
  return out;
}

// FR-PAY-03: kelompok A–Z untuk header lengket.
export function groupContacts(list: Contact[]): [string, Contact[]][] {
  const groups = new Map<string, Contact[]>();
  for (const c of list) groups.set(c.name[0]!.toUpperCase(), [...(groups.get(c.name[0]!.toUpperCase()) ?? []), c]);
  return [...groups].sort(([a], [b]) => a.localeCompare(b));
}

export const AMOUNT_TEXT = { min: `Minimal transfer ${formatRupiah(MIN_TRANSFER)}`, balance: "Saldo tidak cukup" } as const;

// "" bila valid. Saldo dicek juga di transaksi server.
export function transferError(amount: number, balance: number): string {
  if (amount > balance) return AMOUNT_TEXT.balance;
  if (amount > 0 && amount < MIN_TRANSFER) return AMOUNT_TEXT.min;
  return "";
}

export const parseAmount = (s: string) => Number(digits(s).slice(0, 9) || 0);

// FR-PAY-02 versi sederhana: input nominal → saldo bertambah (tanpa pilih bank).
export const TOPUP_MIN = 10_000;
export const TOPUP_MAX = 10_000_000;
export const topUpError = (amount: number) =>
  amount < TOPUP_MIN ? `Minimal top up ${formatRupiah(TOPUP_MIN)}` : amount > TOPUP_MAX ? `Maksimal top up ${formatRupiah(TOPUP_MAX)}` : "";

export type Merchant = { name: string; fixed: number | null };
export const MERCHANTS: Record<string, Merchant> = {
  KOPIPAGI: { name: "Kopi Pagi", fixed: null },
  TOKOBUKU: { name: "Toko Buku", fixed: 45_000 },
};

// Isi QR = URL /pay/qr?merchant=<id>&amount=<n> (FR-PAY-10) atau query-nya saja. Null bila bukan QR PracticeMart.
export function parseQr(text: string): { merchant: string; amount: number } | null {
  try {
    const p = new URL(text, "https://x.invalid").searchParams;
    const merchant = (p.get("merchant") ?? "").toUpperCase();
    return merchant in MERCHANTS ? { merchant, amount: parseAmount(p.get("amount") ?? "") } : null;
  } catch {
    return null;
  }
}

export type TxFilter = "all" | "in" | "out";
export type TxSort = { by: "date" | "amount"; dir: "asc" | "desc" };

export function viewTransactions(list: TransactionDoc[], filter: TxFilter, sort: TxSort): TransactionDoc[] {
  const key = (t: TransactionDoc) => (sort.by === "date" ? t.at : t.amount);
  const sign = sort.dir === "asc" ? 1 : -1;
  return list
    .filter((t) => filter === "all" || (filter === "in") === t.amount > 0)
    .sort((a, b) => sign * (key(a) - key(b)));
}
