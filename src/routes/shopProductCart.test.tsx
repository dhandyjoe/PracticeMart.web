// @vitest-environment jsdom
import { act, fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { initialStock } from "../data/catalog";
import { SNACKBAR_MS } from "../components/Snackbar";
import { fake, fakeRepos, line, resetFake } from "../test/fakeAccount";
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

const $ = (id: string) => screen.getByTestId(id);
const $$ = (id: string) => screen.queryAllByTestId(id);
const chip = (testid: string, name: string) => $$(testid).find((c) => c.textContent === name)!;

beforeEach(() => {
  resetFake({ wishlist: ["P001"] });
  vi.clearAllMocks();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("Detail produk", () => {
  it("info produk, breadcrumb, stok dibaca ulang", async () => {
    renderShop("/shop/product/P002");
    expect(await screen.findByTestId("shop_txt_product_name")).toHaveTextContent("Sepatu Lari Ringan");
    expect($("shop_txt_product_price")).toHaveTextContent("Rp450.000");
    expect(screen.getByText("Rp600.000")).toBeInTheDocument();
    expect(screen.getByText("−25%")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Olahraga" })).toHaveAttribute("href", "/shop/search?cat=olahraga");
    expect(screen.queryByTestId("shop_txt_selected_color")).toBeNull();
    expect($("shop_txt_selected_size")).toHaveTextContent("39");
    expect(fakeRepos.refreshStock).toHaveBeenCalled();
  });

  it("varian stok 0: chip disabled + tooltip, tidak bisa dipilih; ganti warna", async () => {
    renderShop("/shop/product/P001");
    expect(await screen.findByTestId("shop_txt_selected_color")).toHaveTextContent("Hitam");
    expect($("shop_txt_selected_size")).toHaveTextContent("S");
    const xl = chip("shop_chip_size", "XL");
    expect(xl).toHaveAttribute("aria-disabled", "true");
    const tip = $$("shop_txt_variant_tooltip")[0];
    expect(tip).not.toBeVisible();
    fireEvent.mouseEnter(xl);
    expect(tip).toBeVisible();
    expect(tip).toHaveTextContent("Stok habis untuk Hitam · XL");
    fireEvent.mouseLeave(xl);
    fireEvent.focus(xl);
    expect(tip).toBeVisible();
    fireEvent.blur(xl);
    await userEvent.click(xl);
    expect($("shop_txt_selected_size")).toHaveTextContent("S");

    await userEvent.click(chip("shop_chip_color", "Putih"));
    expect(chip("shop_chip_size", "XL")).toHaveAttribute("aria-disabled", "false");
    await userEvent.click(chip("shop_chip_size", "XL"));
    expect($("shop_txt_selected_size")).toHaveTextContent("XL");
    // Kembali ke Hitam saat XL terpilih → pindah ke ukuran pertama yang tersedia.
    await userEvent.click(chip("shop_chip_color", "Hitam"));
    expect($("shop_txt_selected_size")).toHaveTextContent("S");
  });

  it("warna habis semua → disabled", async () => {
    const stock = initialStock();
    stock.P001 = { ...stock.P001, "Navy|S": 0, "Navy|M": 0, "Navy|L": 0, "Navy|XL": 0 };
    resetFake({}, stock);
    renderShop("/shop/product/P001");
    const navy = await screen.findByRole("radio", { name: "Navy" });
    expect(navy).toHaveAttribute("aria-disabled", "true");
    await userEvent.click(navy);
    expect($("shop_txt_selected_color")).toHaveTextContent("Hitam");
  });

  it("stepper qty: maks 10 → pesan; minus; input", async () => {
    renderShop("/shop/product/P001");
    const qty = await screen.findByTestId("shop_input_qty");
    expect($("shop_btn_qty_minus")).toBeDisabled();
    for (let i = 0; i < 9; i++) await userEvent.click($("shop_btn_qty_plus"));
    expect(qty).toHaveValue(10);
    expect(screen.queryByTestId("shop_txt_qty_error")).toBeNull();
    await userEvent.click($("shop_btn_qty_plus"));
    expect(qty).toHaveValue(10);
    expect($("shop_txt_qty_error")).toHaveTextContent("Maksimal pembelian 10 pcs");
    await userEvent.click($("shop_btn_qty_minus"));
    expect(qty).toHaveValue(9);
    expect(screen.queryByTestId("shop_txt_qty_error")).toBeNull();
    fireEvent.change(qty, { target: { value: "25" } });
    expect(qty).toHaveValue(10);
    expect($("shop_txt_qty_error")).toBeInTheDocument();
    fireEvent.change(qty, { target: { value: "" } });
    expect(qty).toHaveValue(1);
  });

  it("maks qty = stok varian bila < 10", async () => {
    renderShop("/shop/product/P002");
    const qty = await screen.findByTestId("shop_input_qty");
    expect($("shop_txt_stock_left")).toHaveTextContent("Stok 3");
    for (let i = 0; i < 3; i++) await userEvent.click($("shop_btn_qty_plus"));
    expect(qty).toHaveValue(3);
    expect($("shop_txt_qty_error")).toBeInTheDocument();
  });

  it("+ Keranjang dengan varian & qty → snackbar", async () => {
    renderShop("/shop/product/P001");
    await userEvent.click(await screen.findByRole("radio", { name: "Navy" }));
    await userEvent.click(chip("shop_chip_size", "L"));
    await userEvent.click($("shop_btn_qty_plus"));
    await userEvent.click($("shop_btn_add_to_cart"));
    expect(fake.state.cart).toEqual([line("P001", "Navy", "L", 2)]);
    expect($("shop_txt_snackbar")).toHaveTextContent("Ditambahkan ke keranjang");
    expect($("shop_badge_cart")).toHaveTextContent("2");
  });

  it("Beli Sekarang (FR-SHOP-11) → /checkout dengan baris produk itu saja, keranjang tidak berubah", async () => {
    const router = renderShop("/shop/product/P001");
    await userEvent.click(await screen.findByRole("radio", { name: "Navy" }));
    await userEvent.click($("shop_btn_qty_plus"));
    await userEvent.click($("shop_btn_buy_now"));
    expect(router.state.location.pathname).toBe("/checkout");
    expect(router.state.location.state).toEqual({ buyNow: line("P001", "Navy", "S", 2) });
    expect(fake.state.cart).toEqual([]);
  });

  it("stok 0 → Stok Habis disabled, stepper mati", async () => {
    renderShop("/shop/product/P060");
    expect(await screen.findByTestId("shop_btn_add_to_cart")).toHaveTextContent("Stok Habis");
    expect($("shop_btn_buy_now")).toBeDisabled();
    expect($("shop_btn_add_to_cart")).toBeDisabled();
    expect($("shop_input_qty")).toBeDisabled();
    expect($("shop_btn_qty_plus")).toBeDisabled();
  });

  it("wishlist toggle", async () => {
    renderShop("/shop/product/P001");
    const btn = await screen.findByTestId("shop_btn_wishlist");
    expect(btn).toHaveAccessibleName("Hapus dari wishlist");
    expect(btn).toHaveAttribute("aria-pressed", "true");
    await userEvent.click(btn);
    expect(fake.state.wishlist).toEqual([]);
    expect(btn).toHaveAccessibleName("Tambah ke wishlist");
    await userEvent.click(btn);
    expect(fake.state.wishlist).toEqual(["P001"]);
  });

  it("galeri: panah, thumbnail, indikator", async () => {
    renderShop("/shop/product/P001");
    const indicator = await screen.findByTestId("shop_txt_gallery_indicator");
    expect(indicator).toHaveTextContent("1/5");
    await userEvent.click($("shop_btn_gallery_prev"));
    expect(indicator).toHaveTextContent("5/5");
    await userEvent.click($("shop_btn_gallery_next"));
    await userEvent.click($("shop_btn_gallery_next"));
    expect(indicator).toHaveTextContent("2/5");
    await userEvent.click($$("shop_btn_gallery_thumb")[3]);
    expect(indicator).toHaveTextContent("4/5");
    expect($("shop_img_product_main")).toHaveAccessibleName("Kaos Polos Basic, gambar 4");
  });

  it("produk tidak ada → halaman tidak ditemukan", async () => {
    renderShop("/shop/product/P999");
    expect(await screen.findByTestId("shop_txt_not_found")).toHaveTextContent("Halaman tidak ditemukan");
  });
});

describe("Image Viewer", () => {
  it("zoom +/−, double click, Ctrl+scroll, panah keyboard, Tab terkunci, Esc", async () => {
    renderShop("/shop/product/P001");
    await userEvent.click(await screen.findByTestId("shop_btn_gallery_next"));
    await userEvent.click($("shop_btn_open_viewer"));
    const dialog = screen.getByRole("dialog", { name: "Gambar Kaos Polos Basic" });
    expect($("shop_btn_viewer_close")).toHaveFocus();
    expect($("shop_txt_viewer_indicator")).toHaveTextContent("2/5");
    expect(screen.queryByTestId("shop_txt_zoom_level")).toBeNull();

    await userEvent.click($("shop_btn_zoom_in"));
    expect($("shop_txt_zoom_level")).toHaveTextContent("1,5×");
    for (let i = 0; i < 4; i++) await userEvent.click($("shop_btn_zoom_in"));
    expect($("shop_txt_zoom_level")).toHaveTextContent("3,0×");
    expect($("shop_btn_zoom_in")).toBeDisabled();
    for (let i = 0; i < 5; i++) await userEvent.click($("shop_btn_zoom_out"));
    expect($("shop_txt_zoom_level")).toHaveTextContent("0,5×");
    expect($("shop_btn_zoom_out")).toBeDisabled();

    const stage = within(dialog).getByRole("img").parentElement!.parentElement!;
    fireEvent.doubleClick(stage);
    expect(screen.queryByTestId("shop_txt_zoom_level")).toBeNull();
    fireEvent.doubleClick(stage);
    expect($("shop_txt_zoom_level")).toHaveTextContent("2,0×");
    fireEvent.wheel(stage, { deltaY: -100 });
    expect($("shop_txt_zoom_level")).toHaveTextContent("2,0×");
    fireEvent.wheel(stage, { deltaY: -100, ctrlKey: true });
    expect($("shop_txt_zoom_level")).toHaveTextContent("2,5×");
    fireEvent.wheel(stage, { deltaY: 100, ctrlKey: true });
    expect($("shop_txt_zoom_level")).toHaveTextContent("2,0×");

    // Pindah gambar mengembalikan zoom ke 1×.
    fireEvent.keyDown(document, { key: "ArrowRight" });
    expect($("shop_txt_viewer_indicator")).toHaveTextContent("3/5");
    expect(screen.queryByTestId("shop_txt_zoom_level")).toBeNull();
    fireEvent.keyDown(document, { key: "ArrowLeft" });
    fireEvent.keyDown(document, { key: "ArrowLeft" });
    expect($("shop_txt_viewer_indicator")).toHaveTextContent("1/5");
    await userEvent.click($("shop_btn_viewer_prev"));
    expect($("shop_txt_viewer_indicator")).toHaveTextContent("5/5");
    await userEvent.click($("shop_btn_viewer_next"));
    await userEvent.click($$("shop_btn_viewer_thumb")[2]);
    expect($("shop_txt_viewer_indicator")).toHaveTextContent("3/5");

    // Tab dari tombol terakhir kembali ke tombol pertama, Shift+Tab sebaliknya.
    const buttons = [...dialog.querySelectorAll<HTMLElement>("button:not(:disabled)")];
    buttons.at(-1)!.focus();
    await userEvent.tab();
    expect(buttons[0]).toHaveFocus();
    await userEvent.tab({ shift: true });
    expect(buttons.at(-1)).toHaveFocus();
    (document.activeElement as HTMLElement).blur();
    fireEvent.keyDown(document, { key: "Tab" });
    fireEvent.keyDown(document, { key: "Tab", shiftKey: true });
    fireEvent.keyDown(document, { key: "x" });

    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
    // Gambar terakhir di viewer ikut ke galeri.
    expect($("shop_txt_gallery_indicator")).toHaveTextContent("3/5");
  });

  it("tutup dengan tombol × dan klik scrim", async () => {
    renderShop("/shop/product/P001");
    await userEvent.click(await screen.findByTestId("shop_btn_open_viewer"));
    await userEvent.click($("shop_btn_viewer_close"));
    expect(screen.queryByRole("dialog")).toBeNull();
    await userEvent.click($("shop_btn_open_viewer"));
    fireEvent.mouseDown(screen.getByRole("dialog").parentElement!);
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.body.style.overflow).toBe("");
  });
});

describe("Keranjang", () => {
  const twoLines = () => [line("P001", "Hitam", "S", 2), line("P002", "", "42", 1, { selected: false })];

  it("kosong → empty state", async () => {
    renderShop("/shop/cart");
    expect(await screen.findByTestId("shop_txt_cart_empty")).toHaveTextContent("Keranjangmu masih kosong");
    expect($("shop_btn_start_shopping")).toHaveAttribute("href", "/");
  });

  it("baris, subtotal terpilih, Pilih Semua tri-state, data dibaca ulang", async () => {
    resetFake({ cart: twoLines() });
    renderShop("/shop/cart");
    expect(await screen.findAllByTestId("shop_item_cart_row")).toHaveLength(2);
    expect(fakeRepos.getState).toHaveBeenCalledTimes(2);
    expect($$("shop_txt_cart_item_name").map((n) => n.textContent)).toEqual(["Kaos Polos Basic", "Sepatu Lari Ringan"]);
    expect($$("shop_txt_cart_item_variant").map((n) => n.textContent)).toEqual(["Hitam · S", "42"]);
    expect($$("shop_txt_cart_item_subtotal")[0]).toHaveTextContent("Rp150.000");
    expect($("shop_txt_cart_subtotal")).toHaveTextContent("Rp150.000");
    expect($("shop_txt_cart_total")).toHaveTextContent("Rp150.000");
    expect($("shop_btn_checkout")).toHaveTextContent("Checkout (1)");

    const all = $("shop_chk_select_all") as HTMLInputElement;
    expect(all.indeterminate).toBe(true);
    await userEvent.click(all);
    await waitFor(() => expect(all.checked).toBe(true));
    expect(all.indeterminate).toBe(false);
    expect($("shop_txt_cart_subtotal")).toHaveTextContent("Rp600.000");
    await userEvent.click(all);
    await waitFor(() => expect(fake.state.cart.every((l) => !l.selected)).toBe(true));
    expect($("shop_btn_checkout")).toBeDisabled();

    await userEvent.click($$("shop_chk_cart_item")[0]);
    expect(fake.state.cart[0].selected).toBe(true);
  });

  it("ubah qty lewat select", async () => {
    resetFake({ cart: twoLines() });
    renderShop("/shop/cart");
    const selects = await screen.findAllByTestId("shop_spn_cart_qty");
    expect(within(selects[1]).getAllByRole("option")).toHaveLength(3);
    await userEvent.selectOptions(selects[0], "5");
    expect(fake.state.cart[0].qty).toBe(5);
    expect($("shop_txt_cart_subtotal")).toHaveTextContent("Rp375.000");
  });

  it("hapus → snackbar Urungkan 4 dtk → kembali di posisi semula", async () => {
    resetFake({ cart: twoLines() });
    renderShop("/shop/cart");
    await userEvent.click((await screen.findAllByTestId("shop_btn_cart_remove"))[0]);
    expect(fake.state.cart.map((l) => l.productId)).toEqual(["P002"]);
    expect($("shop_bar_undo")).toHaveTextContent("Kaos Polos Basic dihapus dari keranjang");
    await userEvent.click($("shop_btn_undo"));
    await waitFor(() => expect(fake.state.cart.map((l) => l.productId)).toEqual(["P001", "P002"]));
    expect(screen.queryByTestId("shop_bar_undo")).toBeNull();
  });

  it("snackbar hilang setelah 4 dtk; Urungkan tidak menggandakan", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"], shouldAdvanceTime: true });
    resetFake({ cart: twoLines() });
    renderShop("/shop/cart");
    fireEvent.click((await screen.findAllByTestId("shop_btn_cart_remove"))[1]);
    await screen.findByTestId("shop_bar_undo");
    // Baris sudah kembali (mis. dari device lain) sebelum Urungkan ditekan.
    fake.state = { ...fake.state, cart: twoLines() };
    fireEvent.click($("shop_btn_undo"));
    await waitFor(() => expect(fakeRepos.updateStateField).toHaveBeenCalledTimes(2));
    expect(fake.state.cart).toHaveLength(2);

    fireEvent.click($$("shop_btn_cart_remove")[0]);
    await screen.findByTestId("shop_bar_undo");
    act(() => vi.advanceTimersByTime(SNACKBAR_MS));
    expect(screen.queryByTestId("shop_bar_undo")).toBeNull();
  });

  it("simpan untuk nanti ↔ pindahkan ke keranjang; badge tidak menghitung yang disimpan", async () => {
    resetFake({ cart: twoLines() });
    renderShop("/shop/cart");
    await userEvent.click((await screen.findAllByTestId("shop_btn_cart_save"))[0]);
    expect(fake.state.cart[0].saved).toBe(true);
    expect($$("shop_item_saved_row")).toHaveLength(1);
    expect($("shop_badge_cart")).toHaveTextContent("1");
    await userEvent.click($("shop_btn_cart_move"));
    expect(fake.state.cart[0]).toMatchObject({ saved: false, selected: true });
    expect(screen.queryByTestId("shop_table_saved")).toBeNull();
  });

  it("hanya baris tersimpan → tabel aktif tidak tampil", async () => {
    resetFake({ cart: [line("P001", "Hitam", "S", 1, { saved: true })] });
    renderShop("/shop/cart");
    expect(await screen.findByTestId("shop_table_saved")).toBeInTheDocument();
    expect(screen.queryByTestId("shop_table_cart")).toBeNull();
    expect($("shop_btn_checkout")).toBeDisabled();
  });

  it("stok habis: tidak bisa dipilih; produk tak dikenal dilewati", async () => {
    resetFake({ cart: [line("P001", "Hitam", "XL", 1), line("P999", "", "", 1)] });
    renderShop("/shop/cart");
    expect(await screen.findAllByTestId("shop_item_cart_row")).toHaveLength(1);
    expect($("shop_txt_cart_item_out")).toHaveTextContent("Stok habis");
    expect($$("shop_chk_cart_item")[0]).toBeDisabled();
    expect($$("shop_chk_cart_item")[0]).not.toBeChecked();
    expect($("shop_txt_cart_subtotal")).toHaveTextContent("Rp0");
  });

  it("voucher: error kontrak, HEMAT10, Lepas", async () => {
    resetFake({ cart: [line("P001", "Hitam", "S", 2)] });
    renderShop("/shop/cart");
    const input = await screen.findByTestId("shop_input_voucher_code");
    expect($("shop_btn_voucher_apply")).toBeDisabled();
    await userEvent.type(input, "expired{Enter}");
    expect(input).toHaveValue("EXPIRED");
    expect($("shop_txt_voucher_error")).toHaveTextContent("Voucher sudah kedaluwarsa");
    expect(input).toHaveAttribute("aria-invalid", "true");
    await userEvent.clear(input);
    expect(screen.queryByTestId("shop_txt_voucher_error")).toBeNull();
    await userEvent.type(input, "ABC{Enter}");
    expect($("shop_txt_voucher_error")).toHaveTextContent("Voucher tidak ditemukan");

    await userEvent.clear(input);
    await userEvent.type(input, "hemat10");
    await userEvent.click($("shop_btn_voucher_apply"));
    expect(fake.state.voucher).toBe("HEMAT10");
    expect($("shop_txt_voucher_applied")).toHaveTextContent("Voucher HEMAT10 terpasang");
    expect($("shop_txt_cart_discount")).toHaveTextContent("−Rp15.000");
    expect($("shop_txt_cart_total")).toHaveTextContent("Rp135.000");

    await userEvent.click($("shop_btn_voucher_remove"));
    expect(fake.state.voucher).toBeNull();
    expect(screen.queryByTestId("shop_txt_cart_discount")).toBeNull();
  });

  it("MIN100K: ditolak di bawah Rp100.000; terpasang lalu subtotal turun → error & tanpa diskon", async () => {
    resetFake({ cart: [line("P001", "Hitam", "S", 1)] });
    renderShop("/shop/cart");
    await userEvent.type(await screen.findByTestId("shop_input_voucher_code"), "MIN100K{Enter}");
    expect($("shop_txt_voucher_error")).toHaveTextContent("Minimal belanja Rp100.000");

    resetFake({ cart: [line("P001", "Hitam", "S", 2)], voucher: "MIN100K" });
    await userEvent.click($("shop_tab_home"));
    await userEvent.click(await screen.findByTestId("shop_tab_cart"));
    expect(await screen.findByTestId("shop_txt_cart_discount")).toHaveTextContent("−Rp15.000");
    await userEvent.selectOptions($$("shop_spn_cart_qty")[0], "1");
    expect($("shop_txt_voucher_error")).toHaveTextContent("Minimal belanja Rp100.000");
    expect(screen.queryByTestId("shop_txt_cart_discount")).toBeNull();
    expect($("shop_txt_cart_total")).toHaveTextContent("Rp75.000");
  });

  it("Checkout → /checkout", async () => {
    resetFake({ cart: [line("P001", "Hitam", "S", 1)] });
    const router = renderShop("/shop/cart");
    await userEvent.click(await screen.findByTestId("shop_btn_checkout"));
    expect(router.state.location.pathname).toBe("/checkout");
  });
});

describe("Halaman lain", () => {
  it("URL tak dikenal → 404 dengan link Beranda", async () => {
    renderShop("/tidak-ada");
    expect(await screen.findByTestId("shop_txt_not_found")).toBeInTheDocument();
    expect($("shop_btn_back_home")).toHaveAttribute("href", "/");
  });
});
