import { getDoc, runTransaction, updateDoc } from "firebase/firestore";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { initialStock } from "./catalog";

vi.mock("./firebase", () => ({ db: "DB" }));
vi.mock("firebase/firestore", () => ({
  doc: vi.fn((_db: unknown, ...path: string[]) => path.join("/")),
  getDoc: vi.fn(),
  updateDoc: vi.fn(),
  runTransaction: vi.fn(),
}));

const snap = (data?: object) => ({ exists: () => !!data, data: () => data }) as never;
const tx = { get: vi.fn(), set: vi.fn() };

beforeEach(() => {
  vi.clearAllMocks();
  vi.resetModules();
  vi.mocked(runTransaction).mockImplementation(async (_db, fn) => fn(tx as never));
});

describe("stockRepository", () => {
  const load = () => import("./stockRepository");

  it("dokumen ada: dibaca sekali per tab (cache)", async () => {
    vi.mocked(getDoc).mockResolvedValue(snap({ stock: { P001: { "Hitam|L": 4 } } }));
    const { getStock } = await load();
    expect(await getStock()).toEqual({ P001: { "Hitam|L": 4 } });
    await getStock();
    expect(getDoc).toHaveBeenCalledOnce();
    expect(runTransaction).not.toHaveBeenCalled();
  });

  it("belum ada: dibuat dari stok awal di transaksi", async () => {
    vi.mocked(getDoc).mockResolvedValue(snap());
    tx.get.mockResolvedValue(snap());
    const { getStock } = await load();
    expect(await getStock()).toEqual(initialStock());
    expect(tx.set).toHaveBeenCalledWith("catalog/stock", { stock: initialStock(), schemaVersion: 1 });
  });

  it("dibuat client lain di antara baca & transaksi: pakai milik mereka, tidak menimpa", async () => {
    vi.mocked(getDoc).mockResolvedValue(snap());
    tx.get.mockResolvedValue(snap({ stock: { P001: { "Hitam|L": 1 } } }));
    const { getStock } = await load();
    expect(await getStock()).toEqual({ P001: { "Hitam|L": 1 } });
    expect(tx.set).not.toHaveBeenCalled();
  });

  it("gagal tidak di-cache; refreshStock membaca ulang", async () => {
    vi.mocked(getDoc).mockRejectedValueOnce(new Error("offline")).mockResolvedValue(snap({ stock: {} }));
    const { getStock, refreshStock } = await load();
    await expect(getStock()).rejects.toThrow("offline");
    expect(await getStock()).toEqual({});
    await refreshStock();
    expect(getDoc).toHaveBeenCalledTimes(3);
  });
});

describe("stateRepository", () => {
  it("getState mem-parse dokumen", async () => {
    vi.mocked(getDoc).mockResolvedValue(snap({ balance: 500000, wishlist: ["P001"] }));
    const { getState } = await import("./stateRepository");
    expect(await getState("u1")).toMatchObject({ balance: 500000, wishlist: ["P001"], cart: [] });
    expect(getDoc).toHaveBeenCalledWith("states/u1");
  });

  it("updateStateField baca ulang lalu update satu field tanpa menunggu ack", async () => {
    vi.mocked(getDoc).mockResolvedValue(snap({ wishlist: ["P010"], balance: 1 }));
    vi.mocked(updateDoc).mockReturnValue(new Promise(() => {}));
    const { updateStateField } = await import("./stateRepository");
    const next = await updateStateField("u1", "wishlist", (w) => [...w, "P001"], vi.fn());
    expect(updateDoc).toHaveBeenCalledWith("states/u1", { wishlist: ["P010", "P001"] });
    expect(next).toMatchObject({ wishlist: ["P010", "P001"], balance: 1 });
  });

  it("tulisan ditolak server → onWriteError", async () => {
    vi.mocked(getDoc).mockResolvedValue(snap({}));
    const err = new Error("permission-denied");
    vi.mocked(updateDoc).mockRejectedValue(err);
    const onError = vi.fn();
    const { updateStateField } = await import("./stateRepository");
    await updateStateField("u1", "voucher", () => "HEMAT10", onError);
    await vi.waitFor(() => expect(onError).toHaveBeenCalledWith(err));
  });
});
