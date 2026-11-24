import { getDocs, runTransaction } from "firebase/firestore";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { listTransactions, spendBalance, topUpBalance } from "./walletRepository";

vi.mock("./firebase", () => ({ db: "DB" }));
vi.mock("firebase/firestore", async (orig) => ({
  ...(await orig<typeof import("firebase/firestore")>()),
  doc: vi.fn((_db: unknown, ...path: string[]) => path.join("/")),
  collection: vi.fn((_db: unknown, ...path: string[]) => path.join("/")),
  query: vi.fn((...a: unknown[]) => a),
  orderBy: vi.fn(),
  limit: vi.fn(),
  getDocs: vi.fn(),
  runTransaction: vi.fn(),
}));

const tx = { get: vi.fn(), set: vi.fn(), update: vi.fn() };
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(runTransaction).mockImplementation(async (_db, fn) => fn(tx as never));
  tx.get.mockResolvedValue({ data: () => ({ balance: 500_000 }) });
});

describe("spendBalance (kontrak §8.3 Transfer, Bayar QR)", () => {
  it("kurangi saldo + dokumen transaksi bernominal negatif", async () => {
    expect(await spendBalance("u1", "Transfer ke Budi Santoso", 150_000, 99)).toBe(350_000);
    expect(tx.update).toHaveBeenCalledWith("states/u1", { balance: 350_000 });
    expect(tx.set).toHaveBeenCalledWith(expect.stringMatching(/^states\/u1\/transactions\/tx-/), expect.objectContaining({ title: "Transfer ke Budi Santoso", amount: -150_000, at: 99 }));
  });

  it("saldo kurang → 'Saldo tidak cukup', tanpa tulis", async () => {
    await expect(spendBalance("u1", "x", 500_001)).rejects.toThrow("Saldo tidak cukup");
    expect(tx.update).not.toHaveBeenCalled();
    expect(tx.set).not.toHaveBeenCalled();
  });

  it("nominal tak valid ditolak sebelum transaksi", async () => {
    for (const n of [0, -5, 1.5, NaN]) await expect(spendBalance("u1", "x", n)).rejects.toThrow("Nominal tidak valid");
    expect(runTransaction).not.toHaveBeenCalled();
  });
});

describe("listTransactions", () => {
  it("memetakan dokumen & memberi default", async () => {
    vi.mocked(getDocs).mockResolvedValueOnce({
      docs: [{ id: "8", data: () => ({ id: "8", title: "Top Up dari BCA", amount: 300_000, at: 5 }) }, { id: "x", data: () => ({}) }],
    } as never);
    expect(await listTransactions("u1")).toEqual([
      { id: "8", title: "Top Up dari BCA", amount: 300_000, at: 5 },
      { id: "x", title: "", amount: 0, at: 0 },
    ]);
  });
});

describe("topUpBalance (kontrak §8.3 Top Up)", () => {
  it("transaksi: saldo + n dan dokumen transaksi positif \"Top Up Saldo\"", async () => {
    await topUpBalance("u1", 100_000, 99);
    expect(tx.update).toHaveBeenCalledWith("states/u1", { balance: 600_000 });
    expect(tx.set).toHaveBeenCalledWith(expect.stringMatching(/^states\/u1\/transactions\/tx-/), expect.objectContaining({ title: "Top Up Saldo", amount: 100_000, at: 99 }));
  });

  it("di luar Rp10.000–Rp10.000.000 atau bukan bulat → ditolak tanpa menulis", async () => {
    for (const n of [9_999, 10_000_001, 15_000.5, NaN]) await expect(topUpBalance("u1", n)).rejects.toThrow("Nominal tidak valid");
    expect(runTransaction).not.toHaveBeenCalled();
  });
});
