// @vitest-environment jsdom
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fake, resetFake } from "../test/fakeAccount";
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

const $$ = (id: string) => screen.queryAllByTestId(id);
const names = () => $$("shop_item_wishlist").map((li) => within(li).getByTestId("shop_link_wishlist_product").textContent);

beforeEach(() => {
  // Kontrak §4.5: wishlist awal P001, P010, P002, P020; "PX" = produk yang tidak ada di katalog.
  resetFake({ wishlist: ["P001", "P010", "PX", "P002"] });
  vi.clearAllMocks();
});

describe("Wishlist (FR-SHOP-12)", () => {
  it("daftar urut sesuai data, produk tak dikenal dilewati, link ke detail; menu akun punya Wishlist", async () => {
    renderShop("/shop/wishlist");
    await waitFor(() => expect($$("shop_item_wishlist")).toHaveLength(3));
    expect(names()[0]).toMatch(/^Kaos Polos Basic/);
    expect($$("shop_link_wishlist_product")[1]).toHaveAttribute("href", "/shop/product/P010");
    expect(screen.getByTestId("acc_nav_wishlist")).toHaveAttribute("href", "/shop/wishlist");
    expect(screen.getByTestId("acc_nav_wishlist")).toHaveAttribute("aria-current", "page");
  });

  it("hapus → hilang + snackbar; semua dihapus → empty state", async () => {
    const user = userEvent.setup();
    resetFake({ wishlist: ["P001"] });
    renderShop("/shop/wishlist");
    await user.click(await screen.findByTestId("shop_btn_wishlist_remove"));
    expect(fake.state.wishlist).toEqual([]);
    expect(await screen.findByText("Dihapus dari wishlist")).toBeInTheDocument();
    expect(screen.getByTestId("shop_txt_wishlist_empty")).toHaveTextContent("Wishlist masih kosong");
    expect(screen.getByTestId("shop_btn_start_shopping")).toHaveAttribute("href", "/");
  });

  it("drag & drop memindahkan item dan menyimpan urutan sekali", async () => {
    renderShop("/shop/wishlist");
    await waitFor(() => expect($$("shop_item_wishlist")).toHaveLength(3));
    const [first, , third] = $$("shop_item_wishlist");
    fireEvent.dragStart(third);
    fireEvent.dragOver(first);
    fireEvent.drop(first);
    await waitFor(() => expect(fake.state.wishlist).toEqual(["P002", "P001", "P010", "PX"]));
    // Drop di dirinya sendiri tidak menulis apa pun.
    const writes = vi.mocked((await import("../test/fakeAccount")).fakeRepos.updateStateField).mock.calls.length;
    fireEvent.dragStart($$("shop_item_wishlist")[0]);
    fireEvent.drop($$("shop_item_wishlist")[0]);
    fireEvent.dragEnd($$("shop_item_wishlist")[0]);
    expect(vi.mocked((await import("../test/fakeAccount")).fakeRepos.updateStateField).mock.calls.length).toBe(writes);
  });

  it("drop membaca id dari dataTransfer (drop sebelum render dragstart); teks asing diabaikan", async () => {
    renderShop("/shop/wishlist");
    await waitFor(() => expect($$("shop_item_wishlist")).toHaveLength(3));
    const dt = (id: string) => ({ dataTransfer: { getData: () => id } });
    fireEvent.drop($$("shop_item_wishlist")[0], dt("P010"));
    await waitFor(() => expect(fake.state.wishlist).toEqual(["P010", "P001", "PX", "P002"]));
    fireEvent.drop($$("shop_item_wishlist")[0], dt("https://contoh.id"));
    expect(fake.state.wishlist).toEqual(["P010", "P001", "PX", "P002"]);
  });

  it("keyboard: Spasi angkat, panah pindah (dibatasi ujung), Spasi taruh → simpan; Esc batal tanpa menulis", async () => {
    const user = userEvent.setup();
    renderShop("/shop/wishlist");
    await waitFor(() => expect($$("shop_item_wishlist")).toHaveLength(3));
    const handle = $$("shop_btn_wishlist_drag")[0];
    handle.focus();
    await user.keyboard(" ");
    expect(handle).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByTestId("shop_txt_wishlist_live")).toHaveTextContent("diangkat");
    await user.keyboard("{ArrowUp}{ArrowDown}{ArrowDown}{ArrowDown}");
    expect(screen.getByTestId("shop_txt_wishlist_live")).toHaveTextContent("posisi 3 dari 3");
    expect(fake.state.wishlist).toEqual(["P001", "P010", "PX", "P002"]); // belum disimpan
    await user.keyboard(" ");
    await waitFor(() => expect(fake.state.wishlist).toEqual(["P010", "PX", "P002", "P001"]));
    expect(screen.getByTestId("shop_txt_wishlist_live")).toHaveTextContent("ditaruh di posisi 3");

    $$("shop_btn_wishlist_drag")[0].focus();
    await user.keyboard("{Enter}{ArrowDown}{Escape}");
    expect(screen.getByTestId("shop_txt_wishlist_live")).toHaveTextContent("Pemindahan dibatalkan");
    expect(fake.state.wishlist).toEqual(["P010", "PX", "P002", "P001"]);
    expect(names()[0]).toMatch(/^Headphone/);
    await user.keyboard("{ArrowDown}x");
    expect(fake.state.wishlist).toEqual(["P010", "PX", "P002", "P001"]);
  });
});
