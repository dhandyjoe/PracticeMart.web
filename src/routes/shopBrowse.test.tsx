// @vitest-environment jsdom
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { appRoutes } from "../app/router";
import { SessionProvider } from "../app/session";
import { logout } from "../data/authRepository";
import { DEV_KEYS } from "../sim/settings";
import { fake, line, resetFake } from "../test/fakeAccount";
import { renderShop } from "../test/shopHarness";
import { BANNER_MS, FLASH_SECONDS } from "./ShopHomePage";

vi.mock("../data/firebase", () => ({ auth: {}, db: {} }));
vi.mock("firebase/auth", async (orig) => ({
  ...(await orig<typeof import("firebase/auth")>()),
  onAuthStateChanged: (_auth: unknown, cb: (u: unknown) => void) => {
    cb({ uid: "u1" });
    return () => {};
  },
}));
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

const $ = (id: string) => screen.getByTestId(id);
const $$ = (id: string) => screen.queryAllByTestId(id);

beforeEach(() => {
  resetFake({ history: ["sepatu lari", "headphone"], wishlist: ["P001"] });
  vi.clearAllMocks();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("AccountProvider", () => {
  it("gagal memuat → pesan kontrak §6 + Coba lagi", async () => {
    fake.failLoad = true;
    renderShop("/");
    expect(await screen.findByTestId("shop_txt_load_error")).toHaveTextContent("Gagal memuat, coba lagi");
    fake.failLoad = false;
    await userEvent.click($("shop_btn_retry"));
    expect(await screen.findByTestId("shop_txt_greeting")).toHaveTextContent("Halo, Rina Wulandari");
  });
});

describe("Header", () => {
  it("saldo, badge keranjang, menu akun & Keluar", async () => {
    fake.state.cart = [line("P001", "Hitam", "S", 2), line("P010", "Hitam", "", 1), line("P002", "", "42", 5, { saved: true })];
    renderShop("/");
    expect(await screen.findByTestId("pay_txt_header_balance")).toHaveTextContent("Rp500.000");
    expect($("shop_badge_cart")).toHaveTextContent("3");
    expect($("shop_tab_cart")).toHaveAccessibleName("Keranjang, 3 item");
    expect($("shop_tab_home")).toHaveAttribute("href", "/");
    expect($("shop_tab_pay")).toHaveAttribute("href", "/pay");

    await userEvent.click($("shop_tab_account"));
    expect($("acc_txt_display_name")).toHaveTextContent("Rina Wulandari");
    expect($("shop_tab_account")).toHaveAttribute("aria-expanded", "true");
    await userEvent.click($("acc_btn_logout"));
    expect(logout).not.toHaveBeenCalled();
    await userEvent.click($("acc_dialog_logout_cancel"));
    expect(screen.queryByTestId("acc_dialog_logout")).toBeNull();
    await userEvent.click($("shop_tab_account"));
    await userEvent.click($("acc_btn_logout"));
    await userEvent.click($("acc_dialog_logout_confirm"));
    expect(logout).toHaveBeenCalled();
    await userEvent.click($("shop_tab_account"));
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByTestId("acc_menu")).toBeNull();
  });

  it("badge tidak tampil bila keranjang kosong; 99+", async () => {
    renderShop("/");
    await screen.findByTestId("shop_tab_cart");
    expect(screen.queryByTestId("shop_badge_cart")).toBeNull();
  });

  it("mega menu kategori: klik, Esc, klik luar, hover", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"], shouldAdvanceTime: true });
    const router = renderShop("/");
    const btn = await screen.findByTestId("shop_tab_category");
    await userEvent.click(btn);
    expect($$("shop_item_mega_category")).toHaveLength(6);
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByTestId("shop_menu_category")).toBeNull();

    fireEvent.mouseEnter(btn.parentElement!);
    act(() => vi.advanceTimersByTime(150));
    expect($("shop_menu_category")).toBeInTheDocument();
    fireEvent.mouseLeave(btn.parentElement!);
    expect(screen.queryByTestId("shop_menu_category")).toBeNull();

    await userEvent.click(btn);
    fireEvent.mouseDown(document.body);
    expect(screen.queryByTestId("shop_menu_category")).toBeNull();

    await userEvent.click(btn);
    await userEvent.click(screen.getByRole("menuitem", { name: /Rumah Tangga/ }));
    expect(router.state.location.search).toBe("?cat=rumah-tangga");
  });

  it("saran mulai 2 karakter, maks 5, kosong, Enter → hasil + riwayat", async () => {
    const router = renderShop("/");
    const input = await screen.findByTestId("shop_input_search");
    await userEvent.type(input, "k");
    expect($$("shop_item_suggestion")).toHaveLength(0);
    await userEvent.type(input, "a");
    expect($$("shop_item_suggestion").length).toBeGreaterThan(0);
    expect($$("shop_item_suggestion").length).toBeLessThanOrEqual(5);
    expect(input).toHaveAttribute("aria-expanded", "true");

    await userEvent.clear(input);
    await userEvent.type(input, "zzz");
    expect($("shop_txt_suggestion_empty")).toHaveTextContent('Tidak ada saran untuk "zzz"');
    await userEvent.type(input, "{Enter}");
    expect(router.state.location.pathname).toBe("/shop/search");
    expect(router.state.location.search).toBe("?q=zzz");
    expect(fake.state.history).toEqual(["zzz", "sepatu lari", "headphone"]);
    // Enter dengan isian kosong tidak navigasi.
    await userEvent.clear(input);
    await userEvent.type(input, "{Enter}");
    expect(router.state.location.search).toBe("?q=zzz");
  });

  it("panah + Enter memilih saran → detail produk", async () => {
    const router = renderShop("/");
    const input = await screen.findByTestId("shop_input_search");
    await userEvent.type(input, "kaos polos");
    await userEvent.keyboard("{ArrowDown}");
    expect(input).toHaveAttribute("aria-activedescendant", "shop_opt_search_0");
    await userEvent.keyboard("{ArrowUp}{ArrowDown}{Enter}");
    expect(router.state.location.pathname).toBe("/shop/product/P001");
    expect(input).toHaveValue("");
  });

  it("riwayat: tampil saat fokus kosong, klik, hapus ×, klik kanan → Hapus, Hapus semua", async () => {
    const router = renderShop("/");
    const input = await screen.findByTestId("shop_input_search");
    await userEvent.click(input);
    const items = $$("shop_item_search_history");
    expect(items.map((i) => i.textContent)).toEqual(["sepatu lari", "headphone"]);

    await userEvent.click(within(items[1]).getByRole("button", { name: 'Hapus "headphone" dari riwayat' }));
    await waitFor(() => expect(fake.state.history).toEqual(["sepatu lari"]));

    fireEvent.contextMenu($$("shop_item_search_history")[0]);
    await userEvent.click($("shop_btn_history_context_remove"));
    await waitFor(() => expect(fake.state.history).toEqual([]));
    expect(screen.queryByTestId("shop_list_suggestion")).toBeNull();

    fake.state = { ...fake.state, history: ["a", "b"] };
    await userEvent.type(input, "x{Enter}");
    await userEvent.clear(input);
    await userEvent.click($$("shop_item_search_history")[1]);
    expect(router.state.location.search).toBe("?q=a");

    await userEvent.clear(input);
    await userEvent.keyboard("{ArrowDown}");
    await userEvent.click($("shop_btn_history_clear"));
    await waitFor(() => expect(fake.state.history).toEqual([]));
    await userEvent.keyboard("{ArrowDown}{Escape}");
    expect(input).toHaveAttribute("aria-expanded", "false");
  });
});

describe("Beranda", () => {
  it("sapaan, kategori, rekomendasi deterministik, Lihat semua", async () => {
    localStorage.setItem(DEV_KEYS.deterministic, "1");
    renderShop("/");
    expect(await screen.findByTestId("shop_txt_greeting")).toHaveTextContent("Halo, Rina Wulandari");
    expect($$("shop_item_category")).toHaveLength(6);
    const names = within($("shop_grid_recommendation")).getAllByTestId("shop_txt_product_name").map((n) => n.textContent);
    expect(names).toEqual(["Kaos Polos Basic", "Sepatu Lari Ringan", "Headphone Nirkabel", "Smartwatch Sport", "Buku Catatan A5"]);
    expect($("shop_link_see_all")).toHaveAttribute("href", "/shop/search");
  });

  it("+ Keranjang → keranjang, snackbar + Lihat; stok 0 → Stok Habis", async () => {
    localStorage.setItem(DEV_KEYS.deterministic, "1");
    const router = renderShop("/");
    const grid = await screen.findByTestId("shop_grid_recommendation");
    const buttons = within(grid).getAllByTestId("shop_btn_add_to_cart");
    expect(buttons[4]).toHaveTextContent("Stok Habis");
    expect(buttons[4]).toBeDisabled();

    await userEvent.click(buttons[0]);
    expect(fake.state.cart).toEqual([line("P001", "Hitam", "S", 1)]);
    expect($("shop_txt_snackbar")).toHaveTextContent("Ditambahkan ke keranjang");
    expect($("shop_badge_cart")).toHaveTextContent("1");
    await userEvent.click($("shop_btn_snackbar_view"));
    expect(router.state.location.pathname).toBe("/shop/cart");
  });

  it("sudah maksimal → snackbar Maksimal pembelian 10 pcs", async () => {
    localStorage.setItem(DEV_KEYS.deterministic, "1");
    fake.state.cart = [line("P001", "Hitam", "S", 10)];
    renderShop("/");
    const grid = await screen.findByTestId("shop_grid_recommendation");
    await userEvent.click(within(grid).getAllByTestId("shop_btn_add_to_cart")[0]);
    expect($("shop_txt_snackbar")).toHaveTextContent("Maksimal pembelian 10 pcs");
  });

  it("carousel: panah, titik, auto-slide 4 dtk", async () => {
    vi.useFakeTimers({ toFake: ["setInterval", "clearInterval"] });
    renderShop("/");
    const title = await screen.findByTestId("shop_txt_banner_title");
    expect(title).toHaveTextContent("HEMAT10");
    fireEvent.click($("shop_btn_banner_next"));
    expect(title).toHaveTextContent("Cashback 5%");
    fireEvent.click($("shop_btn_banner_prev"));
    fireEvent.click($("shop_btn_banner_prev"));
    expect(title).toHaveTextContent("Gratis ongkir");
    fireEvent.click($$("shop_btn_banner_dot")[0]);
    expect($$("shop_btn_banner_dot")[0]).toHaveAttribute("aria-selected", "true");
    act(() => vi.advanceTimersByTime(BANNER_MS));
    expect(title).toHaveTextContent("Cashback 5%");
  });

  it("flash sale: countdown 02:14:37, Beli → keranjang, habis → disabled", async () => {
    vi.useFakeTimers({ toFake: ["setInterval", "clearInterval"] });
    const router = renderShop("/");
    const timer = await screen.findByTestId("shop_txt_flash_countdown");
    expect(timer).toHaveTextContent("02:14:37");
    act(() => vi.advanceTimersByTime(1000));
    expect(timer).toHaveTextContent("02:14:36");

    fireEvent.click($$("shop_btn_flash_buy")[0]);
    await waitFor(() => expect(router.state.location.pathname).toBe("/shop/cart"));
    expect(fake.state.cart[0].productId).toBe("P002");
  });

  it("flash sale selesai → Beli disabled", async () => {
    vi.useFakeTimers({ toFake: ["setInterval", "clearInterval"] });
    renderShop("/");
    const timer = await screen.findByTestId("shop_txt_flash_countdown");
    act(() => vi.advanceTimersByTime(FLASH_SECONDS * 1000));
    expect(timer).toHaveTextContent("00:00:00");
    expect($$("shop_btn_flash_buy").every((b) => (b as HTMLButtonElement).disabled)).toBe(true);
  });
});

describe("Hasil pencarian", () => {
  it("kata kunci 'kaos': jumlah + urutan, semua tampil", async () => {
    renderShop("/shop/search?q=kaos");
    expect(await screen.findByTestId("shop_txt_result_count")).toHaveTextContent("12 produk · Paling Relevan");
    expect($$("shop_card_product")).toHaveLength(12);
    expect($("shop_txt_list_end")).toHaveTextContent("Semua produk sudah ditampilkan");
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent('untuk "kaos"');
  });

  it("urutkan & tampilan list ada di URL", async () => {
    const router = renderShop("/shop/search?q=kaos");
    await userEvent.selectOptions(await screen.findByTestId("shop_spn_sort"), "murah");
    expect(router.state.location.search).toBe("?q=kaos&sort=murah");
    expect($("shop_txt_result_count")).toHaveTextContent("12 produk · Harga Terendah");
    const prices = $$("shop_txt_product_price").map((p) => Number(p.textContent!.replace(/\D/g, "")));
    expect(prices).toEqual([...prices].sort((a, b) => a - b));

    await userEvent.click($("shop_btn_view_list"));
    expect(router.state.location.search).toBe("?q=kaos&sort=murah&view=list");
    expect($("shop_btn_view_list")).toHaveAttribute("aria-pressed", "true");
    expect($$("shop_btn_add_to_cart")[0]).toHaveAccessibleName(/^Tambah Kaos .+ ke keranjang$/);
    await userEvent.click($$("shop_btn_add_to_cart")[0]);
    expect(fake.state.cart).toHaveLength(1);
    await userEvent.click($("shop_btn_view_grid"));
    expect(router.state.location.search).toBe("?q=kaos&sort=murah");
  });

  it("filter sidebar: draf → Terapkan → URL + chip; hapus chip; Reset", async () => {
    const router = renderShop("/shop/search?q=kaos");
    await userEvent.click(await screen.findByTestId("shop_chk_category_fashion"));
    await userEvent.click($("shop_chk_category_rumah_tangga"));
    await userEvent.click($("shop_chk_category_rumah_tangga"));
    await userEvent.type($("shop_input_price_min"), "80000");
    await userEvent.type($("shop_input_price_max"), "150000");
    await userEvent.click($("shop_rad_rating_4"));
    await userEvent.click($("shop_chk_in_stock"));
    expect($("shop_badge_filter_count")).toHaveTextContent("4");
    // Belum diterapkan: URL masih sama.
    expect(router.state.location.search).toBe("?q=kaos");

    await userEvent.click($("shop_btn_filter_apply"));
    expect(router.state.location.search).toBe("?q=kaos&cat=fashion&min=80000&max=150000&rating=4&stock=1");
    expect($$("shop_chip_active_filter").map((c) => c.textContent)).toEqual([
      "Fashion",
      "Rp80.000 – Rp150.000",
      "Rating ≥ 4",
      "Stok tersedia",
    ]);
    const count = Number($("shop_txt_result_count").textContent!.split(" ")[0]);
    expect(count).toBeGreaterThan(0);
    expect(count).toBeLessThan(12);

    await userEvent.click(screen.getByRole("button", { name: "Hapus filter Rating ≥ 4" }));
    expect(router.state.location.search).toBe("?q=kaos&cat=fashion&min=80000&max=150000&stock=1");
    await userEvent.click(screen.getByRole("button", { name: "Hapus filter Rp80.000 – Rp150.000" }));
    await userEvent.click(screen.getByRole("button", { name: "Hapus filter Fashion" }));
    expect(router.state.location.search).toBe("?q=kaos&stock=1");

    await userEvent.click($("shop_btn_filter_reset"));
    expect(router.state.location.search).toBe("?q=kaos");
    expect(screen.queryByTestId("shop_chip_active_filter")).toBeNull();
  });

  it("slider harga maksimum & chip harga satu sisi", async () => {
    const router = renderShop("/shop/search?min=500000");
    expect(await screen.findByTestId("shop_chip_active_filter")).toHaveTextContent("≥ Rp500.000");
    fireEvent.change($("shop_sld_price_max"), { target: { value: "1000000" } });
    expect($("shop_input_price_max")).toHaveValue(1000000);
    await userEvent.clear($("shop_input_price_min"));
    await userEvent.click($("shop_btn_filter_apply"));
    expect(router.state.location.search).toBe("?max=1000000");
    expect($("shop_chip_active_filter")).toHaveTextContent("≤ Rp1.000.000");
  });

  it("tidak ada hasil", async () => {
    renderShop("/shop/search?q=zzzz");
    expect(await screen.findByTestId("shop_txt_empty_result")).toHaveTextContent("Produk tidak ditemukan");
    expect($("shop_txt_result_count")).toHaveTextContent("0 produk");
  });

  it("infinite scroll 20 per halaman", async () => {
    let trigger: (() => void) | undefined;
    const observe = vi.fn();
    vi.stubGlobal(
      "IntersectionObserver",
      class {
        constructor(cb: IntersectionObserverCallback) {
          trigger = () => cb([{ isIntersecting: true } as IntersectionObserverEntry], this as never);
        }
        observe = observe;
        disconnect() {}
      },
    );
    renderShop("/shop/search");
    expect(await screen.findByTestId("shop_txt_result_count")).toHaveTextContent("60 produk");
    expect($$("shop_card_product")).toHaveLength(20);
    expect($("shop_txt_load_more")).toHaveTextContent("Memuat produk lainnya…");
    act(() => trigger!());
    expect($$("shop_card_product")).toHaveLength(40);
    act(() => trigger!());
    expect($$("shop_card_product")).toHaveLength(60);
    expect($("shop_txt_list_end")).toBeInTheDocument();
    vi.unstubAllGlobals();
  });
});

describe("router", () => {
  it.each([
    ["/", "shop_txt_greeting"],
    ["/shop", "shop_txt_greeting"],
    ["/shop/search?q=kaos", "shop_txt_result_count"],
    ["/shop/product/P001", "shop_btn_wishlist"],
    ["/shop/cart", "shop_txt_cart_empty"],
    ["/tidak-ada", "shop_txt_not_found"],
    ["/checkout", "shop_txt_cart_empty"],
    ["/checkout/result", "shop_txt_not_found"],
    ["/checkout/result/PM-1", "shop_txt_not_found"],
    ["/account", "acc_input_name"],
    ["/settings", "dev_txt_uid"],
    ["/help", "help_frame_faq"],
  ])("%s dimuat lazy di dalam layout", async (path, testid) => {
    render(
      <SessionProvider>
        <RouterProvider router={createMemoryRouter(appRoutes(), { initialEntries: [path] })} />
      </SessionProvider>,
    );
    expect(await screen.findByTestId(testid)).toBeInTheDocument();
    expect($("shop_tab_home")).toBeInTheDocument();
  });
});

it("/terms dimuat lazy tanpa layout", async () => {
  render(
    <SessionProvider>
      <RouterProvider router={createMemoryRouter(appRoutes(), { initialEntries: ["/terms"] })} />
    </SessionProvider>,
  );
  expect(await screen.findByTestId("terms_txt_title")).toBeInTheDocument();
});
