import { describe, expect, it } from "vitest";
import type { OrderDoc } from "../data/schema";
import { canCancel, cashback, filterOrders, jakartaDay, nextStatus, TABS } from "./orderRules";
import { CONTACTS, groupContacts, parseQr, recentContacts, searchContacts, topUpError, transferError, viewTransactions } from "./payRules";

const order = (p: Partial<OrderDoc>): OrderDoc => ({
  id: "PM-20260115-0001", total: 100_000, method: "card", methodLabel: "", status: "PAID", statusAt: 0, stamps: {},
  cancelReason: "", vaDeadline: 0, lines: [], createdAt: Date.parse("2026-01-15T03:00:00Z"), ...p,
});

describe("status & batal (kontrak §2)", () => {
  it("urutan status; DONE & CANCELLED tidak maju", () => {
    expect(["WAITING", "PAID", "PACKED", "SHIPPED", "DONE", "CANCELLED"].map((s) => nextStatus(s as never))).toEqual(["PAID", "PACKED", "SHIPPED", "DONE", null, null]);
  });
  it("batal hanya dari status ≤ Dikemas", () => {
    expect(["WAITING", "PAID", "PACKED"].every((s) => canCancel(s as never))).toBe(true);
    expect(["SHIPPED", "DONE", "CANCELLED"].some((s) => canCancel(s as never))).toBe(false);
  });
  it("cashback 5% maks Rp10.000, dibulatkan ke bawah, hanya PracticePay", () => {
    expect(cashback({ method: "wallet", total: 86_000 })).toBe(4_300);
    expect(cashback({ method: "wallet", total: 99_999 })).toBe(4_999);
    expect(cashback({ method: "wallet", total: 1_000_000 })).toBe(10_000);
    expect(cashback({ method: "card", total: 86_000 })).toBe(0);
  });
});

describe("filterOrders", () => {
  const list = [
    order({ id: "PM-20260115-0001", status: "WAITING" }),
    order({ id: "PM-20260115-0002", status: "PACKED" }),
    order({ id: "PM-20260115-0003", status: "PAID", createdAt: Date.parse("2026-01-10T03:00:00Z") }),
    order({ id: "PM-20260115-0004", status: "CANCELLED" }),
  ];
  const f = (o: object) => filterOrders(list, { tab: "semua", query: "", from: "", to: "", ...o }).map((x) => x.id.slice(-4));

  it("tab: Diproses = Dibayar + Dikemas", () => {
    expect(f({})).toEqual(["0001", "0002", "0003", "0004"]);
    expect(f({ tab: "diproses" })).toEqual(["0002", "0003"]);
    expect(TABS.map((t) => t.key)).toEqual(["semua", "menunggu", "diproses", "dikirim", "selesai", "dibatalkan"]);
  });
  it("cari Order ID tanpa peduli huruf besar; rentang tanggal Asia/Jakarta inklusif", () => {
    expect(f({ query: " pm-20260115-0004 " })).toEqual(["0004"]);
    expect(f({ from: "2026-01-11" })).toEqual(["0001", "0002", "0004"]);
    expect(f({ to: "2026-01-10" })).toEqual(["0003"]);
    expect(f({ from: "2026-01-15", to: "2026-01-15", tab: "menunggu" })).toEqual(["0001"]);
  });
  it("jam 17:30 UTC sudah hari berikutnya di Jakarta", () => {
    expect(jakartaDay(Date.parse("2026-01-15T17:30:00Z"))).toBe("2026-01-16");
  });
});

describe("PracticePay", () => {
  it("transferError: minimal Rp10.000, saldo", () => {
    expect(transferError(0, 500_000)).toBe("");
    expect(transferError(9_999, 500_000)).toBe("Minimal transfer Rp10.000");
    expect(transferError(10_000, 500_000)).toBe("");
    expect(transferError(500_001, 500_000)).toBe("Saldo tidak cukup");
  });
  it("searchContacts: nama atau nomor", () => {
    expect(searchContacts("")).toHaveLength(CONTACTS.length);
    expect(searchContacts("an").map((c) => c.name)).toEqual(expect.arrayContaining(["Andi Pratama", "Anisa Rahma"]));
    expect(searchContacts("0812-3456-7890").map((c) => c.name)).toEqual(["Budi Santoso"]);
    expect(searchContacts("zzz")).toEqual([]);
    expect(searchContacts("--")).toHaveLength(0);
  });
  it("parseQr: URL, query, merchant tak dikenal", () => {
    expect(parseQr("https://pm.app/pay/qr?merchant=KOPIPAGI&amount=28000")).toEqual({ merchant: "KOPIPAGI", amount: 28_000 });
    expect(parseQr("/pay/qr?merchant=tokobuku")).toEqual({ merchant: "TOKOBUKU", amount: 0 });
    expect(parseQr("/pay/qr?merchant=LAIN")).toBeNull();
    expect(parseQr("halo")).toBeNull();
  });
  it("viewTransactions: filter masuk/keluar & urut", () => {
    const t = (id: string, amount: number, at: number) => ({ id, title: id, amount, at });
    const list = [t("a", 300, 1), t("b", -100, 3), t("c", 50, 2)];
    const ids = (f: "all" | "in" | "out", by: "date" | "amount", dir: "asc" | "desc") => viewTransactions([...list], f, { by, dir }).map((x) => x.id);
    expect(ids("all", "date", "desc")).toEqual(["b", "c", "a"]);
    expect(ids("in", "amount", "asc")).toEqual(["c", "a"]);
    expect(ids("out", "date", "asc")).toEqual(["b"]);
  });
});

describe("topUpError (FR-PAY-02)", () => {
  it("Rp10.000 – Rp10.000.000 inklusif", () => {
    expect(topUpError(9_999)).toBe("Minimal top up Rp10.000");
    expect(topUpError(10_000)).toBe("");
    expect(topUpError(10_000_000)).toBe("");
    expect(topUpError(10_000_001)).toBe("Maksimal top up Rp10.000.000");
  });
});

describe("kontak transfer (FR-PAY-03)", () => {
  const tx = (title: string, at: number) => ({ id: String(at), title, amount: -1, at });
  it("recentContacts: terbaru dulu, unik, maks 3, catatan diabaikan, nama tak dikenal dilewati", () => {
    const txs = [
      tx("Transfer ke Andi Pratama", 1),
      tx("Transfer ke Budi Santoso · arisan", 5),
      tx("Transfer ke Orang Asing", 6),
      tx("Belanja PracticeMart", 7),
      tx("Transfer ke Budi Santoso", 4),
      tx("Transfer ke Citra Dewi", 3),
      tx("Transfer ke Eka Putri", 2),
    ];
    expect(recentContacts(txs).map((c) => c.name)).toEqual(["Budi Santoso", "Citra Dewi", "Eka Putri"]);
    expect(recentContacts([])).toEqual([]);
  });
  it("groupContacts: per huruf awal, urut A–Z", () => {
    const groups = groupContacts(CONTACTS);
    expect(groups.map(([l]) => l)).toEqual(["A", "B", "C", "D", "E", "F", "G"]);
    expect(groups[0][1].map((c) => c.name)).toEqual(["Andi Pratama", "Anisa Rahma"]);
  });
});
