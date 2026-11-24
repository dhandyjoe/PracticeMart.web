import { vi } from "vitest";
import { initialStock } from "../data/catalog";
import { parseState, type StateDoc, type Stock } from "../data/schema";

// Pengganti stateRepository/stockRepository di test UI: data akun di memori.
// Test memasang vi.mock(...) yang meneruskan ke `fake` (vi.mock harus ada di file test itu sendiri).
export const fake = {
  state: parseState({}),
  stock: initialStock() as Stock,
  name: "Rina Wulandari",
  failLoad: false,
};

export function resetFake(state: Partial<StateDoc> = {}, stock: Stock = initialStock()) {
  fake.state = { ...parseState({}), balance: 500_000, ...state };
  fake.stock = stock;
  fake.name = "Rina Wulandari";
  fake.failLoad = false;
}

export const fakeRepos = {
  getState: vi.fn(async () => {
    if (fake.failLoad) throw new Error("offline");
    return fake.state;
  }),
  updateStateField: vi.fn(async (_uid: string, field: keyof StateDoc, change: (v: never) => unknown) => {
    fake.state = { ...fake.state, [field]: change(fake.state[field] as never) };
    return fake.state;
  }),
  getStock: vi.fn(async () => fake.stock),
  refreshStock: vi.fn(async () => fake.stock),
  getDisplayName: vi.fn(async () => fake.name),
};

export const line = (productId: string, color = "", size = "", qty = 1, patch: Partial<StateDoc["cart"][number]> = {}) => ({
  productId,
  color,
  size,
  qty,
  selected: true,
  saved: false,
  ...patch,
});
