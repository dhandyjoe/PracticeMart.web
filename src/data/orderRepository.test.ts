import { FieldPath, getCountFromServer, getDoc, getDocs, increment, orderBy, runTransaction, updateDoc, where } from "firebase/firestore";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { updateDisplayName } from "./authRepository";
import { advanceOrder, cancelOrder, CheckoutError, countActiveOrders, getOrder, listOrders, placeOrder } from "./orderRepository";
import { parseOrder } from "./schema";

vi.mock("./firebase", () => ({ auth: "AUTH", db: "DB" }));
vi.mock("firebase/firestore", async (orig) => ({
  ...(await orig<typeof import("firebase/firestore")>()),
  doc: vi.fn((_db: unknown, ...path: string[]) => path.join("/")),
  getDoc: vi.fn(),
  getDocs: vi.fn(),
  orderBy: vi.fn((...a: unknown[]) => a),
  query: vi.fn((...a: unknown[]) => a),
  collection: vi.fn((_db: unknown, ...path: string[]) => path.join("/")),
  updateDoc: vi.fn(),
  runTransaction: vi.fn(),
  where: vi.fn((...a: unknown[]) => a),
  getCountFromServer: vi.fn(),
}));

const snap = (data?: object) => ({ exists: () => !!data, data: () => data }) as never;
const tx = { get: vi.fn(), set: vi.fn(), update: vi.fn() };
const NOW = Date.parse("2026-01-15T03:00:00Z");

const cart = [
  { productId: "P001", color: "Hitam", size: "L", qty: 2, selected: true, saved: false },
  { productId: "P002", color: "", size: "42", qty: 1, selected: false, saved: false },
];

function given(state: object, stock: object) {
  tx.get.mockImplementation(async (ref: string) =>
    ref === "states/u1" ? snap(state) : snap({ stock, schemaVersion: 1 }),
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(runTransaction).mockImplementation(async (_db, fn) => fn(tx as never));
});

describe("placeOrder (kontrak §8.3)", () => {
  const input = {
    uid: "u1",
    lines: [{ productId: "P001", color: "Hitam", size: "L", qty: 2 }],
    method: "card" as const,
    status: "PAID" as const,
    total: 158_000,
    deterministic: true,
    now: NOW,
  };

  it("kartu: order, orderSeq + 1, baris dibayar dihapus, voucher lepas, stok berkurang", async () => {
    given({ orderSeq: 4, balance: 500_000, cart, voucher: "HEMAT10" }, { P001: { "Hitam|L": 10 } });
    const order = await placeOrder(input);

    expect(order).toEqual({
      id: "PM-20260115-0005",
      total: 158_000,
      method: "card",
      methodLabel: "Kartu Kredit / Debit",
      status: "PAID",
      statusAt: NOW,
      stamps: { PAID: NOW },
      cancelReason: "",
      vaDeadline: 0,
      lines: input.lines,
      createdAt: NOW,
    });
    expect(tx.set).toHaveBeenCalledWith("states/u1/orders/PM-20260115-0005", order);
    expect(tx.update).toHaveBeenCalledWith("states/u1", { orderSeq: 5, cart: [cart[1]], voucher: null });
    expect(tx.update).toHaveBeenCalledWith("catalog/stock", new FieldPath("stock", "P001", "Hitam|L"), 8);
    expect(tx.set).toHaveBeenCalledTimes(1);
  });

  it("Beli Sekarang (keepCart): keranjang tidak disentuh, voucher tetap terpakai", async () => {
    given({ orderSeq: 4, balance: 500_000, cart, voucher: "HEMAT10" }, { P001: { "Hitam|L": 10 } });
    await placeOrder({ ...input, keepCart: true });
    expect(tx.update).toHaveBeenCalledWith("states/u1", { orderSeq: 5, voucher: null });
  });

  it("PracticePay: saldo berkurang + transaksi Belanja PracticeMart", async () => {
    given({ orderSeq: 0, balance: 500_000, cart }, { P001: { "Hitam|L": 10 }, P002: { "|42": 3 } });
    await placeOrder({
      ...input,
      method: "wallet",
      total: 236_000,
      lines: [...input.lines, { productId: "P002", color: "", size: "42", qty: 1 }],
    });
    expect(tx.update).toHaveBeenCalledWith("states/u1", { orderSeq: 1, cart: [], voucher: null, balance: 264_000 });
    expect(tx.set).toHaveBeenCalledWith("states/u1/transactions/pay-PM-20260115-0001", {
      id: "pay-PM-20260115-0001",
      title: "Belanja PracticeMart",
      amount: -236_000,
      at: NOW,
    });
    expect(tx.update).toHaveBeenCalledWith(
      "catalog/stock",
      new FieldPath("stock", "P001", "Hitam|L"),
      8,
      new FieldPath("stock", "P002", "|42"),
      2,
    );
  });

  it("VA: status WAITING dengan vaDeadline", async () => {
    given({ orderSeq: 0, cart }, { P001: { "Hitam|L": 10 } });
    const order = await placeOrder({ ...input, method: "va", status: "WAITING", vaTimeoutMs: 900_000, vaBank: "BNI" });
    expect(order).toMatchObject({ status: "WAITING", stamps: { WAITING: NOW }, vaDeadline: NOW + 900_000, methodLabel: "Virtual Account BNI" });
  });

  it("stok kurang → 'Stok tidak cukup untuk <nama>', tidak menulis apa pun", async () => {
    given({ orderSeq: 0, cart }, { P001: { "Hitam|L": 1 } });
    await expect(placeOrder(input)).rejects.toThrow(new CheckoutError("Stok tidak cukup untuk Kaos Polos Basic"));
    given({ orderSeq: 0, cart }, {});
    await expect(placeOrder({ ...input, lines: [{ productId: "PX", color: "", size: "", qty: 1 }] })).rejects.toThrow(
      "Stok tidak cukup untuk PX",
    );
    expect(tx.set).not.toHaveBeenCalled();
    expect(tx.update).not.toHaveBeenCalled();
  });

  it("saldo kurang → 'Saldo tidak cukup'", async () => {
    given({ orderSeq: 0, balance: 1_000, cart }, { P001: { "Hitam|L": 10 } });
    await expect(placeOrder({ ...input, method: "wallet" })).rejects.toThrow("Saldo tidak cukup");
  });

  it("tanggal app bukan deterministik memakai Asia/Jakarta & jam sekarang", async () => {
    vi.useFakeTimers({ now: Date.parse("2026-11-19T20:00:00Z"), toFake: ["Date"] });
    given({ orderSeq: 9, cart }, { P001: { "Hitam|L": 10 } });
    const order = await placeOrder({ ...input, deterministic: false, now: undefined });
    expect(order.id).toBe("PM-20261120-0010");
    vi.useRealTimers();
  });
});

describe("getOrder & parseOrder", () => {
  it("dokumen ada / tidak ada", async () => {
    vi.mocked(getDoc).mockResolvedValueOnce(snap({ id: "PM-1", status: "PAID", total: 5 })).mockResolvedValueOnce(snap());
    expect(await getOrder("u1", "PM-1")).toMatchObject({ id: "PM-1", status: "PAID", total: 5, lines: [] });
    expect(await getOrder("u1", "PM-2")).toBeNull();
    expect(getDoc).toHaveBeenCalledWith("states/u1/orders/PM-1");
  });

  it("parseOrder memberi default & membuang data rusak", () => {
    expect(
      parseOrder({
        status: "LOST",
        stamps: { PAID: 5, FOO: 1, DONE: "x" },
        lines: [{ productId: "P001", qty: 2, extra: 1 }, { qty: 1 }],
      }),
    ).toEqual({
      id: "",
      total: 0,
      method: "",
      methodLabel: "",
      status: "WAITING",
      statusAt: 0,
      stamps: { PAID: 5 },
      cancelReason: "",
      vaDeadline: 0,
      lines: [{ productId: "P001", color: "", size: "", qty: 2 }],
      createdAt: 0,
    });
    expect(parseOrder(undefined).lines).toEqual([]);
  });
});

it("updateDisplayName menulis users/{uid}.displayName", async () => {
  await updateDisplayName("u1", "Rina W");
  expect(updateDoc).toHaveBeenCalledWith("users/u1", { displayName: "Rina W" });
});

describe("advanceOrder (kontrak §8.3 Status pesanan)", () => {
  const stored = (p: object = {}) => ({ id: "PM-1", status: "PAID", method: "card", total: 86_000, stamps: { PAID: 1 }, lines: [], ...p });
  const givenOrder = (order: object | undefined, state: object = { balance: 100 }) =>
    tx.get.mockImplementation(async (ref: string) => snap(ref === "states/u1" ? state : order));

  it("maju satu status bila sama dengan yang diharapkan", async () => {
    givenOrder(stored());
    const o = await advanceOrder("u1", "PM-1", "PAID", NOW);
    expect(o).toMatchObject({ status: "PACKED", stamps: { PAID: 1, PACKED: NOW } });
    expect(tx.update).toHaveBeenCalledWith("states/u1/orders/PM-1", { status: "PACKED", statusAt: NOW, stamps: { PAID: 1, PACKED: NOW } });
    expect(tx.set).not.toHaveBeenCalled();
  });

  it("status berbeda dari yang diharapkan / sudah akhir → tidak menulis", async () => {
    givenOrder(stored({ status: "SHIPPED" }));
    expect((await advanceOrder("u1", "PM-1", "PAID", NOW)).status).toBe("SHIPPED");
    givenOrder(stored({ status: "CANCELLED" }));
    await advanceOrder("u1", "PM-1", "CANCELLED", NOW);
    givenOrder(stored({ status: "DONE" }));
    await advanceOrder("u1", "PM-1", "DONE", NOW);
    expect(tx.update).not.toHaveBeenCalled();
  });

  it("DONE pesanan PracticePay: cashback ke saldo + transaksi dalam transaksi yang sama", async () => {
    givenOrder(stored({ status: "SHIPPED", method: "wallet" }), { balance: 414_000 });
    await advanceOrder("u1", "PM-1", "SHIPPED", NOW);
    expect(tx.update).toHaveBeenCalledWith("states/u1", { balance: 418_300 });
    expect(tx.set).toHaveBeenCalledWith("states/u1/transactions/cashback-PM-1", { id: "cashback-PM-1", title: "Cashback belanja", amount: 4_300, at: NOW });
  });

  it("DONE pesanan non-PracticePay: tanpa cashback", async () => {
    givenOrder(stored({ status: "SHIPPED" }));
    await advanceOrder("u1", "PM-1", "SHIPPED", NOW);
    expect(tx.set).not.toHaveBeenCalled();
  });

  it("pesanan tidak ada → error", async () => {
    givenOrder(undefined);
    await expect(advanceOrder("u1", "PM-9", "PAID")).rejects.toThrow("Pesanan tidak ditemukan");
  });
});

describe("cancelOrder (kontrak §8.3 Batal)", () => {
  const stored = (p: object = {}) => ({
    id: "PM-1", status: "PACKED", stamps: { PACKED: 1 },
    lines: [{ productId: "P001", color: "Hitam", size: "L", qty: 2 }, { productId: "P002", color: "", size: "42", qty: 1 }], ...p,
  });
  const givenOrder = (o: object) => tx.get.mockImplementation(async () => snap(o));

  it("CANCELLED + alasan; stok dikembalikan per varian", async () => {
    givenOrder(stored());
    const o = await cancelOrder("u1", "PM-1", "Menemukan harga lebih murah", NOW);
    expect(o).toMatchObject({ status: "CANCELLED", cancelReason: "Menemukan harga lebih murah" });
    expect(tx.update).toHaveBeenCalledWith("catalog/stock", new FieldPath("stock", "P001", "Hitam|L"), increment(2), new FieldPath("stock", "P002", "|42"), increment(1));
    expect(tx.update).toHaveBeenCalledWith("states/u1/orders/PM-1", expect.objectContaining({ status: "CANCELLED", cancelReason: "Menemukan harga lebih murah" }));
  });

  it("status Dikirim ke atas ditolak tanpa menulis", async () => {
    for (const status of ["SHIPPED", "DONE"]) {
      givenOrder(stored({ status }));
      await expect(cancelOrder("u1", "PM-1", "x")).rejects.toThrow("Pesanan yang sudah dikirim tidak bisa dibatalkan");
    }
    expect(tx.update).not.toHaveBeenCalled();
  });

  it("sudah CANCELLED → tidak mengembalikan stok dua kali", async () => {
    givenOrder(stored({ status: "CANCELLED" }));
    expect((await cancelOrder("u1", "PM-1", "x")).status).toBe("CANCELLED");
    expect(tx.update).not.toHaveBeenCalled();
  });

  it("pesanan tidak ada → error", async () => {
    givenOrder(undefined as never);
    await expect(cancelOrder("u1", "PM-9", "x")).rejects.toThrow("Pesanan tidak ditemukan");
  });
});

describe("listOrders", () => {
  it("diurut createdAt turun & di-parse", async () => {
    vi.mocked(getDocs).mockResolvedValueOnce({ docs: [{ data: () => ({ id: "PM-2", status: "DONE" }) }] } as never);
    expect(await listOrders("u1")).toEqual([expect.objectContaining({ id: "PM-2", status: "DONE" })]);
    expect(orderBy).toHaveBeenCalledWith("createdAt", "desc");
  });
});

describe("countActiveOrders (FR-ACC-01)", () => {
  it("agregasi count pesanan berstatus Menunggu s/d Dikirim", async () => {
    vi.mocked(getCountFromServer).mockResolvedValue({ data: () => ({ count: 3 }) } as never);
    expect(await countActiveOrders("u1")).toBe(3);
    expect(where).toHaveBeenCalledWith("status", "in", ["WAITING", "PAID", "PACKED", "SHIPPED"]);
  });
});
