// Kontrak §8.2. Uang integer Rupiah, waktu epoch ms.

export const SCHEMA_VERSION = 1;

export type UserDoc = {
  email: string;
  displayName: string;
  createdAt: number;
  schemaVersion: number;
};

export type Address = {
  id: string;
  label: string;
  recipient: string;
  phone: string;
  province: string;
  city: string;
  street: string;
  postal: string;
  isPrimary: boolean;
};

export type CartLine = {
  productId: string;
  color: string;
  size: string;
  qty: number;
  selected: boolean;
  saved: boolean;
};

export type StateDoc = {
  profile: { name: string; email: string; birth: string; gender: string; photoUri: string };
  balance: number;
  pinHash: string;
  pinFailures: number;
  pinLockedUntil: number;
  voucher: string | null;
  cart: CartLine[];
  wishlist: string[];
  history: string[];
  addresses: Address[];
  orderSeq: number;
  schemaVersion: number;
};

export type TransactionDoc = { id: string; title: string; amount: number; at: number };

export type OrderStatus = "WAITING" | "PAID" | "PACKED" | "SHIPPED" | "DONE" | "CANCELLED";
export type OrderLine = Pick<CartLine, "productId" | "color" | "size" | "qty">;

export type OrderDoc = {
  id: string;
  total: number;
  method: string;
  methodLabel: string;
  status: OrderStatus;
  statusAt: number;
  stamps: Partial<Record<OrderStatus, number>>;
  cancelReason: string;
  vaDeadline: number;
  lines: OrderLine[];
  createdAt: number;
};

// Stok global satu dokumen: { <productId>: { "<warna>|<ukuran>": n } }.
export type Stock = Record<string, Record<string, number>>;
export type StockDoc = { stock: Stock; schemaVersion: number };

// Kontrak §8.5: dokumen dibaca lewat parse* — field yang belum ada diberi default,
// tipe yang salah diabaikan, field tak dikenal dibiarkan (tidak pernah dihapus klien).
type Raw = Record<string, unknown>;

const isRecord = (v: unknown): v is Raw => typeof v === "object" && v !== null && !Array.isArray(v);
const str = (v: unknown, d = "") => (typeof v === "string" ? v : d);
const int = (v: unknown, d = 0) => (typeof v === "number" && Number.isFinite(v) ? Math.trunc(v) : d);
const bool = (v: unknown, d = false) => (typeof v === "boolean" ? v : d);
const list = <T>(v: unknown, item: (x: unknown) => T | null): T[] =>
  Array.isArray(v) ? v.map(item).filter((x): x is T => x !== null) : [];
const strings = (v: unknown) => list(v, (x) => (typeof x === "string" ? x : null));

export const parseCartLine = (v: unknown): CartLine | null => {
  if (!isRecord(v) || typeof v.productId !== "string") return null;
  const qty = int(v.qty, 1);
  return qty < 1
    ? null
    : {
        productId: v.productId,
        color: str(v.color),
        size: str(v.size),
        qty,
        selected: bool(v.selected, true),
        saved: bool(v.saved),
      };
};

const parseAddress = (v: unknown): Address | null =>
  isRecord(v)
    ? {
        id: str(v.id),
        label: str(v.label),
        recipient: str(v.recipient),
        phone: str(v.phone),
        province: str(v.province),
        city: str(v.city),
        street: str(v.street),
        postal: str(v.postal),
        isPrimary: bool(v.isPrimary),
      }
    : null;

export function parseState(data: unknown): StateDoc {
  const d = isRecord(data) ? data : {};
  const p = isRecord(d.profile) ? d.profile : {};
  return {
    profile: {
      name: str(p.name),
      email: str(p.email),
      birth: str(p.birth),
      gender: str(p.gender),
      photoUri: str(p.photoUri),
    },
    balance: int(d.balance),
    pinHash: str(d.pinHash),
    pinFailures: int(d.pinFailures),
    pinLockedUntil: int(d.pinLockedUntil),
    voucher: typeof d.voucher === "string" && d.voucher ? d.voucher : null,
    cart: list(d.cart, parseCartLine),
    wishlist: strings(d.wishlist),
    history: strings(d.history),
    addresses: list(d.addresses, parseAddress),
    orderSeq: int(d.orderSeq),
    schemaVersion: int(d.schemaVersion, SCHEMA_VERSION),
  };
}

export function parseStock(data: unknown): Stock {
  const raw = isRecord(data) && isRecord(data.stock) ? data.stock : {};
  const stock: Stock = {};
  for (const [id, variants] of Object.entries(raw)) {
    if (!isRecord(variants)) continue;
    stock[id] = {};
    for (const [key, n] of Object.entries(variants)) stock[id][key] = Math.max(0, int(n));
  }
  return stock;
}

const STATUSES: OrderStatus[] = ["WAITING", "PAID", "PACKED", "SHIPPED", "DONE", "CANCELLED"];

export function parseOrder(data: unknown): OrderDoc {
  const d = isRecord(data) ? data : {};
  const stamps = isRecord(d.stamps) ? d.stamps : {};
  return {
    id: str(d.id),
    total: int(d.total),
    method: str(d.method),
    methodLabel: str(d.methodLabel),
    status: STATUSES.includes(d.status as OrderStatus) ? (d.status as OrderStatus) : "WAITING",
    statusAt: int(d.statusAt),
    stamps: Object.fromEntries(STATUSES.filter((s) => typeof stamps[s] === "number").map((s) => [s, int(stamps[s])])),
    cancelReason: str(d.cancelReason),
    vaDeadline: int(d.vaDeadline),
    lines: list(d.lines, (v) => {
      const l = parseCartLine(v);
      return l && { productId: l.productId, color: l.color, size: l.size, qty: l.qty };
    }),
    createdAt: int(d.createdAt),
  };
}
