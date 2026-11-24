// @vitest-environment jsdom
import { act, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fakeRepos, resetFake } from "../test/fakeAccount";
import { renderShop } from "../test/shopHarness";

vi.mock("../data/firebase", () => ({ auth: {}, db: {} }));
vi.mock("../app/session", async (orig) => ({
  ...(await orig<typeof import("../app/session")>()),
  useSession: () => ({ uid: "u1" }),
}));
vi.mock("../data/stateRepository", async () => {
  const { fakeRepos: f } = await import("../test/fakeAccount");
  return { getState: f.getState, updateStateField: f.updateStateField };
});
vi.mock("../data/stockRepository", async () => {
  const { fakeRepos: f } = await import("../test/fakeAccount");
  return { getStock: f.getStock, refreshStock: f.refreshStock };
});
vi.mock("../data/authRepository", async (orig) => {
  const { fakeRepos: f } = await import("../test/fakeAccount");
  return { ...(await orig<typeof import("../data/authRepository")>()), getDisplayName: f.getDisplayName, logout: vi.fn() };
});

describe("AccountProvider", () => {
  beforeEach(() => {
    resetFake();
    fakeRepos.getState.mockClear();
  });

  it("membaca ulang state saat tab kembali aktif", async () => {
    renderShop("/shop/wishlist");
    await waitFor(() => expect(fakeRepos.getState).toHaveBeenCalled());
    const before = fakeRepos.getState.mock.calls.length;

    await act(async () => {
      document.dispatchEvent(new Event("visibilitychange"));
    });

    await waitFor(() => expect(fakeRepos.getState.mock.calls.length).toBeGreaterThan(before));
  });
});
