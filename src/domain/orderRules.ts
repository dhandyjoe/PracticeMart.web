import type { OrderDoc, OrderStatus } from "../data/schema";

// Kontrak §2 & PRD FR-ORD-01…04.

export const FLOW: OrderStatus[] = ["WAITING", "PAID", "PACKED", "SHIPPED", "DONE"];

export const STATUS_LABEL: Record<OrderStatus, string> = {
  WAITING: "Menunggu Pembayaran",
  PAID: "Dibayar",
  PACKED: "Dikemas",
  SHIPPED: "Dikirim",
  DONE: "Selesai",
  CANCELLED: "Dibatalkan",
};

// Tab Pesanan Saya mengelompokkan status (design W-ORD-01).
export const TABS = [
  { key: "semua", label: "Semua", statuses: null },
  { key: "menunggu", label: "Menunggu", statuses: ["WAITING"] },
  { key: "diproses", label: "Diproses", statuses: ["PAID", "PACKED"] },
  { key: "dikirim", label: "Dikirim", statuses: ["SHIPPED"] },
  { key: "selesai", label: "Selesai", statuses: ["DONE"] },
  { key: "dibatalkan", label: "Dibatalkan", statuses: ["CANCELLED"] },
] as const satisfies readonly { key: string; label: string; statuses: OrderStatus[] | null }[];
export type TabKey = (typeof TABS)[number]["key"];

export const nextStatus = (s: OrderStatus): OrderStatus | null => (s === "CANCELLED" ? null : (FLOW[FLOW.indexOf(s) + 1] ?? null));

// FR-ORD-03: batal hanya bila status ≤ Dikemas.
export const canCancel = (s: OrderStatus) => s === "WAITING" || s === "PAID" || s === "PACKED";
export const CANNOT_CANCEL_SHIPPED = "Pesanan yang sudah dikirim tidak bisa dibatalkan";

export const CANCEL_REASONS = [
  "Ingin ubah alamat pengiriman",
  "Ingin ubah metode pembayaran",
  "Menemukan harga lebih murah",
  "Lainnya",
] as const;
export const VA_EXPIRED_REASON = "Waktu pembayaran habis";

// Kontrak §2: 5% dari total, maks Rp10.000, dibulatkan ke bawah; hanya pesanan PracticePay.
export const cashback = (o: Pick<OrderDoc, "method" | "total">) =>
  o.method === "wallet" ? Math.min(Math.floor(o.total * 0.05), 10_000) : 0;

const WIB = 7 * 3_600_000;
// Tanggal kalender Asia/Jakarta (yyyy-mm-dd) untuk membandingkan dengan <input type="date">.
export const jakartaDay = (ms: number) => new Date(ms + WIB).toISOString().slice(0, 10);

export type OrderFilter = { tab: TabKey; query: string; from: string; to: string };

export function filterOrders(orders: OrderDoc[], f: OrderFilter): OrderDoc[] {
  const statuses = TABS.find((t) => t.key === f.tab)?.statuses;
  const q = f.query.trim().toUpperCase();
  return orders.filter((o) => {
    const day = jakartaDay(o.createdAt);
    return (!statuses || (statuses as readonly OrderStatus[]).includes(o.status)) && (!q || o.id.includes(q)) && (!f.from || day >= f.from) && (!f.to || day <= f.to);
  });
}
