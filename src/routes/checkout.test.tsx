// @vitest-environment jsdom
import { act, fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CheckoutError, getOrder, placeOrder } from "../data/orderRepository";
import type { Address, OrderDoc } from "../data/schema";
import { BANK_ORIGIN } from "../features/checkout/ThreeDSDialog";
import { writeDevSettings, writePreferences } from "../sim/settings";
import { fake, line, resetFake } from "../test/fakeAccount";
import { renderShop } from "../test/shopHarness";
import { DRAFT_KEY } from "./CheckoutPage";

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
vi.mock("../data/orderRepository", async (orig) => ({
  ...(await orig<typeof import("../data/orderRepository")>()),
  placeOrder: vi.fn(),
  getOrder: vi.fn(),
}));
// PBKDF2 sungguhan diuji di pinHash.test.ts; di sini cukup PIN kontrak.
vi.mock("../domain/pinHash", async (orig) => ({
  ...(await orig<typeof import("../domain/pinHash")>()),
  verifyPin: async (pin: string) => pin === "123456",
}));

const $ = (id: string) => screen.getByTestId(id);
const $$ = (id: string) => screen.queryAllByTestId(id);

const HOME: Address = {
  id: "home",
  label: "Rumah",
  recipient: "Rina",
  phone: "081234567890",
  province: "Jawa Barat",
  city: "Bandung",
  street: "Jl. Merdeka No. 10",
  postal: "40111",
  isPrimary: true,
};
const OFFICE: Address = { ...HOME, id: "office", label: "Kantor", province: "DKI Jakarta", city: "Jakarta Pusat", street: "Jl. Sudirman No. 1", postal: "10220", isPrimary: false };

const order = (patch: Partial<OrderDoc> = {}): OrderDoc => ({
  id: "PM-20260115-0001",
  total: 158_000,
  method: "card",
  methodLabel: "Kartu Kredit / Debit",
  status: "PAID",
  statusAt: 1,
  stamps: { PAID: 1 },
  cancelReason: "",
  vaDeadline: 0,
  lines: [],
  createdAt: 1,
  ...patch,
});

beforeEach(() => {
  resetFake({ cart: [line("P001", "Hitam", "S", 2)], voucher: "HEMAT10", addresses: [HOME, OFFICE] });
  vi.clearAllMocks();
  writeDevSettings({ latency: 0, deterministic: true });
  vi.mocked(placeOrder).mockImplementation(async (input) =>
    order({ status: input.status, method: input.method, total: input.total }),
  );
  vi.mocked(getOrder).mockImplementation(async (_uid, id) => order({ id }));
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

async function fillCard(user: ReturnType<typeof userEvent.setup>, number = "4111111111111111") {
  await user.type(await screen.findByTestId("shop_input_card_number"), number);
  await user.type($("shop_input_card_exp"), "1230");
  await user.type($("shop_input_card_cvv"), "123");
}

describe("Checkout: ringkasan, kurir, alamat", () => {
  it("contoh kontrak Rp158.000; draf tersimpan di sessionStorage", async () => {
    const user = userEvent.setup();
    renderShop("/checkout");
    expect(await screen.findByTestId("shop_txt_checkout_total")).toHaveTextContent("Rp158.000");
    expect($("shop_txt_checkout_address")).toHaveTextContent("Rina · 081234567890 · Jl. Merdeka No. 10, Bandung, Jawa Barat 40111");
    expect($$("shop_item_checkout_line")).toHaveLength(1);
    expect($("shop_txt_checkout_discount")).toHaveTextContent("−Rp15.000");

    expect($("shop_btn_pay")).toHaveTextContent("Bayar Rp158.000");
    expect(JSON.parse(sessionStorage.getItem(DRAFT_KEY)!)).toMatchObject({ courier: "express", insurance: true, method: "card" });

    await user.click($("shop_rdo_courier_reguler"));
    await user.click($("shop_chk_insurance"));
    expect($("shop_txt_checkout_total")).toHaveTextContent("Rp146.000");
    expect(JSON.parse(sessionStorage.getItem(DRAFT_KEY)!)).toMatchObject({ courier: "reguler", insurance: false });
    // Data kartu tidak pernah disimpan.
    await fillCard(user);
    expect(sessionStorage.getItem(DRAFT_KEY)).not.toContain("4111");
  });

  it("draf dipulihkan saat dibuka ulang (FR-PAYM-04); draf rusak diabaikan", async () => {
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ courier: "express", insurance: true, method: "cod", addressId: "office" }));
    renderShop("/checkout");
    expect(await screen.findByTestId("shop_rdo_courier_express")).toBeChecked();
    expect($("shop_rdo_pay_cod")).toBeChecked();
    expect($("shop_txt_checkout_address")).toHaveTextContent("Jakarta Pusat");
  });

  it("draf bukan JSON → default", async () => {
    sessionStorage.setItem(DRAFT_KEY, "{rusak");
    renderShop("/checkout");
    expect(await screen.findByTestId("shop_rdo_courier_express")).toBeChecked();
    expect($("shop_chk_insurance")).toBeChecked();
  });

  it("Same Day: tidak tersedia di luar DKI; ganti alamat → tersedia + wajib jam kirim", async () => {
    const user = userEvent.setup();
    renderShop("/checkout");
    const sameDay = await screen.findByTestId("shop_rdo_courier_sameday");
    expect(sameDay).toBeDisabled();
    expect(sameDay.closest("label")).toHaveTextContent("Tidak tersedia untuk kota ini");

    await user.click($("shop_btn_change_address"));
    await user.click($$("shop_rdo_address")[1]);
    expect($("shop_txt_checkout_address")).toHaveTextContent("Jakarta Pusat");
    await user.click($("shop_rdo_courier_sameday"));
    expect($("shop_txt_checkout_shipping")).toHaveTextContent("Rp35.000");
    await user.click($("shop_rdo_pay_cod"));
    expect($("shop_txt_delivery_time_error")).toBeInTheDocument();
    expect($("shop_btn_pay")).toBeDisabled();
    fireEvent.change($("shop_input_delivery_time"), { target: { value: "08:00" } });
    expect($("shop_btn_pay")).toBeDisabled();
    fireEvent.change($("shop_input_delivery_time"), { target: { value: "10:00" } });
    expect($("shop_btn_pay")).toBeEnabled();
    expect(screen.queryByTestId("shop_txt_delivery_time_error")).toBeNull();
  });

  it("ONGKIR memotong ongkir", async () => {
    fake.state.voucher = "ONGKIR";
    renderShop("/checkout");
    expect(await screen.findByTestId("shop_txt_checkout_shipping_discount")).toHaveTextContent("−Rp20.000");
    expect($("shop_txt_checkout_total")).toHaveTextContent("Rp153.000");
  });

  it("keranjang kosong / tidak ada yang terpilih → kembali ke keranjang", async () => {
    resetFake({ cart: [line("P001", "Hitam", "S", 1, { selected: false })] });
    const router = renderShop("/checkout");
    await waitFor(() => expect(router.state.location.pathname).toBe("/shop/cart"));
  });

  it("tanpa alamat → Bayar disabled", async () => {
    resetFake({ cart: [line("P001", "Hitam", "S", 1)] });
    renderShop("/checkout");
    expect(await screen.findByTestId("shop_txt_no_address")).toBeInTheDocument();
    await userEvent.click($("shop_rdo_pay_cod"));
    expect($("shop_btn_pay")).toBeDisabled();
  });

  it("offline → banner & Bayar disabled (FR-PAYM-15)", async () => {
    renderShop("/checkout");
    await userEvent.click(await screen.findByTestId("shop_rdo_pay_cod"));
    expect($("shop_btn_pay")).toBeEnabled();
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
    act(() => void window.dispatchEvent(new Event("offline")));
    expect($("shop_txt_offline")).toHaveTextContent("Tidak ada koneksi");
    expect($("shop_btn_pay")).toBeDisabled();
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(true);
    act(() => void window.dispatchEvent(new Event("online")));
    expect(screen.queryByTestId("shop_txt_offline")).toBeNull();
  });
});

describe("Kartu & 3DS", () => {
  it("validasi Luhn, kedaluwarsa, CVV; Bayar disabled sampai valid", async () => {
    const user = userEvent.setup();
    renderShop("/checkout");
    await user.type(await screen.findByTestId("shop_input_card_number"), "4111111111111112");
    expect($("shop_input_card_number")).toHaveValue("4111 1111 1111 1112");
    expect($("shop_txt_card_number_error")).toHaveTextContent("Nomor kartu tidak valid");
    await user.type($("shop_input_card_exp"), "0120");
    await user.type($("shop_input_card_cvv"), "12");
    await user.tab();
    expect($("shop_txt_card_exp_error")).toHaveTextContent("Kartu sudah kedaluwarsa");
    expect($("shop_txt_card_cvv_error")).toHaveTextContent("CVV harus 3 digit");
    expect($("shop_btn_pay")).toBeDisabled();

    await user.clear($("shop_input_card_number"));
    await user.clear($("shop_input_card_exp"));
    await user.clear($("shop_input_card_cvv"));
    await fillCard(user);
    expect(screen.queryByTestId("shop_txt_card_number_error")).toBeNull();
    expect($("shop_btn_pay")).toBeEnabled();
  });

  it("sukses: overlay → iframe bank (origin lain) → postMessage success → order PAID → hasil", async () => {
    const user = userEvent.setup();
    const router = renderShop("/checkout");
    await fillCard(user);
    await user.click($("shop_btn_pay"));

    const frame = (await screen.findByTestId("shop_frame_3ds")) as HTMLIFrameElement;
    const src = new URL(frame.src);
    expect(src.origin).toBe(BANK_ORIGIN);
    expect(src.pathname).toBe("/3ds.html");
    expect(src.searchParams.get("parent")).toBe(location.origin);
    expect(src.searchParams.get("amount")).toBe("158000");
    expect(src.searchParams.get("card")).toBe("1111");
    expect($("shop_btn_pay")).toBeDisabled();

    // Pesan dari origin/jendela lain diabaikan.
    const data = { type: "3ds-result", status: "success" };
    act(() => void window.dispatchEvent(new MessageEvent("message", { data, origin: "https://evil.test", source: frame.contentWindow })));
    act(() => void window.dispatchEvent(new MessageEvent("message", { data, origin: BANK_ORIGIN, source: window })));
    act(() => void window.dispatchEvent(new MessageEvent("message", { data: { type: "x" }, origin: BANK_ORIGIN, source: frame.contentWindow })));
    expect(placeOrder).not.toHaveBeenCalled();

    act(() => void window.dispatchEvent(new MessageEvent("message", { data, origin: BANK_ORIGIN, source: frame.contentWindow })));
    await waitFor(() => expect(router.state.location.pathname).toBe("/checkout/result/PM-20260115-0001"));
    expect(placeOrder).toHaveBeenCalledWith(
      expect.objectContaining({ uid: "u1", method: "card", status: "PAID", total: 158_000, deterministic: true, vaTimeoutMs: undefined }),
    );
    expect(vi.mocked(placeOrder).mock.calls[0][0].lines).toEqual([line("P001", "Hitam", "S", 2)]);
    expect(await screen.findByTestId("shop_txt_payment_status")).toHaveTextContent("Pembayaran Berhasil");
    expect($("shop_txt_order_id")).toHaveTextContent("PM-20260115-0001");
    expect(sessionStorage.getItem(DRAFT_KEY)).toBeNull();
    expect($("shop_txt_snackbar")).toHaveTextContent("Pesanan PM-20260115-0001 berhasil dibuat");
  });

  it("3DS ditutup / dibatalkan di bank → kembali ke checkout tanpa order", async () => {
    const user = userEvent.setup();
    renderShop("/checkout");
    await fillCard(user);
    await user.click($("shop_btn_pay"));
    await user.click(await screen.findByTestId("shop_btn_3ds_close"));
    expect(screen.queryByTestId("shop_modal_3ds")).toBeNull();
    expect($("shop_btn_pay")).toBeEnabled();

    await user.click($("shop_btn_pay"));
    const frame = (await screen.findByTestId("shop_frame_3ds")) as HTMLIFrameElement;
    act(() =>
      void window.dispatchEvent(
        new MessageEvent("message", { data: { type: "3ds-result", status: "cancelled" }, origin: BANK_ORIGIN, source: frame.contentWindow }),
      ),
    );
    expect(screen.queryByTestId("shop_modal_3ds")).toBeNull();
    expect(placeOrder).not.toHaveBeenCalled();
  });

  it("overlay 'Memproses pembayaran…' selama 2 dtk × latency", async () => {
    writeDevSettings({ latency: 1 });
    vi.useFakeTimers({ toFake: ["setTimeout"], shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderShop("/checkout");
    await fillCard(user);
    await user.click($("shop_btn_pay"));
    expect($("shop_overlay_processing")).toHaveTextContent("Memproses pembayaran…");
    act(() => vi.advanceTimersByTime(2_000));
    expect(await screen.findByTestId("shop_modal_3ds")).toBeInTheDocument();
    expect(screen.queryByTestId("shop_overlay_processing")).toBeNull();
  });

  it("kartu ditolak → 'Pembayaran Gagal', tanpa order (N-05)", async () => {
    const user = userEvent.setup();
    const router = renderShop("/checkout");
    await fillCard(user, "4000000000000002");
    await user.click($("shop_btn_pay"));
    expect(await screen.findByTestId("shop_txt_payment_status")).toHaveTextContent("Pembayaran Gagal");
    expect(router.state.location.pathname).toBe("/checkout/result");
    expect(placeOrder).not.toHaveBeenCalled();
    await user.click($("shop_btn_back_to_cart"));
    expect(router.state.location.pathname).toBe("/shop/cart");
  });

  it("kartu pending → order WAITING, 'Menunggu Pembayaran' (N-06)", async () => {
    const user = userEvent.setup();
    vi.mocked(getOrder).mockResolvedValue(order({ status: "WAITING" }));
    renderShop("/checkout");
    await fillCard(user, "4000000000000119");
    await user.click($("shop_btn_pay"));
    expect(await screen.findByTestId("shop_txt_payment_status")).toHaveTextContent("Menunggu Pembayaran");
    expect(placeOrder).toHaveBeenCalledWith(expect.objectContaining({ method: "card", status: "WAITING" }));
  });
});

describe("VA, COD, error", () => {
  it("VA → WAITING dengan batas waktu dari Developer Options", async () => {
    writeDevSettings({ vaTimeout: "30s" });
    vi.mocked(getOrder).mockResolvedValue(order({ status: "WAITING", method: "va", methodLabel: "Virtual Account BNI", vaDeadline: Date.now() + 30_000 }));
    renderShop("/checkout");
    await userEvent.click(await screen.findByTestId("shop_rdo_pay_va"));
    expect(screen.queryByTestId("shop_form_card")).toBeNull();
    // FR-PAYM-05: pilih bank; default BCA, ikut tersimpan di draf.
    const banks = $$("shop_rdo_va_bank");
    expect(banks.map((b) => (b as HTMLInputElement).value)).toEqual(["BCA", "BNI", "Mandiri"]);
    expect(banks[0]).toBeChecked();
    await userEvent.click(banks[1]);
    expect(JSON.parse(sessionStorage.getItem(DRAFT_KEY)!).vaBank).toBe("BNI");
    await userEvent.click($("shop_btn_pay"));
    expect(await screen.findByTestId("shop_txt_va_deadline")).toHaveTextContent(/^Bayar sebelum pukul .+ WIB\.$/);
    expect(placeOrder).toHaveBeenCalledWith(expect.objectContaining({ method: "va", status: "WAITING", vaTimeoutMs: 30_000, vaBank: "BNI" }));
    // FR-PAYM-08: panel VA di halaman hasil + link ke detail pesanan.
    expect($("shop_txt_va_number")).toHaveTextContent("8808 2026 0115 0001");
    expect($("shop_txt_va_countdown")).toHaveTextContent(/^00:(30|29)$/);
    expect($("shop_link_order_detail")).toHaveAttribute("href", "/shop/order/PM-20260115-0001");
  });

  it("draf dengan bank VA tak dikenal → BCA", async () => {
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ method: "va", vaBank: "XYZ" }));
    renderShop("/checkout");
    await screen.findByTestId("shop_list_va_bank");
    expect($$("shop_rdo_va_bank")[0]).toBeChecked();
  });

  it("COD → PAID; ditolak bila total > Rp1.000.000 (N-07)", async () => {
    resetFake({ cart: [line("P020", "Hitam", "", 1)], addresses: [HOME] });
    renderShop("/checkout");
    const cod = await screen.findByTestId("shop_rdo_pay_cod");
    expect(cod).toBeDisabled();
    expect($("shop_txt_pay_cod_note")).toHaveTextContent("Untuk total maksimal Rp1.000.000");
    expect($("shop_txt_pay_wallet_note")).toHaveTextContent("Saldo tidak cukup");
    expect($("shop_rdo_pay_wallet")).toBeDisabled();
  });

  it("COD sukses", async () => {
    renderShop("/checkout");
    await userEvent.click(await screen.findByTestId("shop_rdo_pay_cod"));
    await userEvent.click($("shop_btn_pay"));
    await screen.findByTestId("shop_txt_order_id");
    expect(placeOrder).toHaveBeenCalledWith(expect.objectContaining({ method: "cod", status: "PAID" }));
  });

  it("Beli Sekarang: ringkasan hanya produk itu, keranjang tidak dipakai (keepCart); stok habis → keranjang", async () => {
    renderShop({ pathname: "/checkout", state: { buyNow: line("P010", "Hitam", "", 1) } });
    expect(await screen.findByText("Headphone Nirkabel")).toBeInTheDocument();
    expect(screen.queryByText("Kaos Polos Basic")).toBeNull();
    await userEvent.click($("shop_rdo_pay_cod"));
    await userEvent.click($("shop_btn_pay"));
    await screen.findByTestId("shop_txt_order_id");
    expect(placeOrder).toHaveBeenCalledWith(expect.objectContaining({ lines: [line("P010", "Hitam", "", 1)], keepCart: true }));
  });

  it("Beli Sekarang varian stok 0 → kembali ke keranjang", async () => {
    const router = renderShop({ pathname: "/checkout", state: { buyNow: line("P060", "", "", 1) } });
    await waitFor(() => expect(router.state.location.pathname).toBe("/shop/cart"));
  });

  it("metode yang tersimpan di draf tapi tidak lagi tersedia → tidak terpilih", async () => {
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ method: "wallet" }));
    fake.state.balance = 0;
    renderShop("/checkout");
    expect(await screen.findByTestId("shop_rdo_pay_wallet")).not.toBeChecked();
    expect($("shop_btn_pay")).toBeDisabled();
  });

  it("stok habis saat transaksi → pesan kontrak, bisa coba lagi", async () => {
    vi.mocked(placeOrder).mockRejectedValueOnce(new CheckoutError("Stok tidak cukup untuk Kaos Polos Basic"));
    renderShop("/checkout");
    await userEvent.click(await screen.findByTestId("shop_rdo_pay_cod"));
    await userEvent.click($("shop_btn_pay"));
    expect(await screen.findByTestId("shop_txt_checkout_error")).toHaveTextContent("Stok tidak cukup untuk Kaos Polos Basic");
    expect($("shop_btn_pay")).toBeEnabled();
  });

  it("error jaringan/lain → pesan umum", async () => {
    vi.mocked(placeOrder).mockRejectedValueOnce(new Error("unavailable"));
    renderShop("/checkout");
    await userEvent.click(await screen.findByTestId("shop_rdo_pay_cod"));
    await userEvent.click($("shop_btn_pay"));
    expect(await screen.findByTestId("shop_txt_checkout_error")).toHaveTextContent("Gagal memuat, coba lagi");

    vi.mocked(placeOrder).mockRejectedValueOnce(new Error("unavailable"));
    vi.spyOn(navigator, "onLine", "get").mockReturnValueOnce(true).mockReturnValue(false);
    await userEvent.click($("shop_btn_pay"));
    await waitFor(() => expect($("shop_txt_checkout_error")).toHaveTextContent("Tidak ada koneksi"));
    vi.restoreAllMocks();
  });

  it("notifikasi browser bila diizinkan (FR-PAYM-14)", async () => {
    const Notif = vi.fn();
    vi.stubGlobal("Notification", Object.assign(Notif, { permission: "granted" }));
    renderShop("/checkout");
    await userEvent.click(await screen.findByTestId("shop_rdo_pay_cod"));
    await userEvent.click($("shop_btn_pay"));
    await screen.findByTestId("shop_txt_order_id");
    expect(Notif).toHaveBeenCalledWith("Pesanan PM-20260115-0001 berhasil dibuat");

    writePreferences({ orderNotifications: false });
    Notif.mockClear();
    resetFake({ cart: [line("P001", "Hitam", "S", 2)], addresses: [HOME] });
    renderShop("/checkout");
    await userEvent.click((await screen.findAllByTestId("shop_rdo_pay_cod"))[0]);
    await userEvent.click($$("shop_btn_pay")[0]);
    await waitFor(() => expect(placeOrder).toHaveBeenCalledTimes(2));
    expect(Notif).not.toHaveBeenCalled();
  });
});

describe("PracticePay & PIN", () => {
  it("PIN salah → sisa percobaan; PIN benar → order wallet", async () => {
    const user = userEvent.setup();
    renderShop("/checkout");
    await user.click(await screen.findByTestId("shop_rdo_pay_wallet"));
    await user.click($("shop_btn_pay"));
    const dialog = screen.getByRole("dialog", { name: "Masukkan PIN PracticePay" });
    expect(dialog).toBeInTheDocument();

    for (const d of "11111") await user.click(within(dialog).getByRole("button", { name: d }));
    expect($("pay_ind_pin")).toHaveAccessibleName("5 dari 6 digit");
    await user.click($("pay_btn_pin_delete"));
    expect($("pay_ind_pin")).toHaveAccessibleName("4 dari 6 digit");
    await user.keyboard("11");
    expect(await screen.findByTestId("pay_txt_pin_error")).toHaveTextContent("PIN salah. Sisa 2 percobaan.");
    expect(fake.state.pinFailures).toBe(1);

    await user.keyboard("12345{Backspace}56");
    await waitFor(() => expect(placeOrder).toHaveBeenCalledWith(expect.objectContaining({ method: "wallet", status: "PAID" })));
    expect(fake.state.pinFailures).toBe(0);
  });

  it("3× salah → terkunci 30 dtk (disimpan di akun)", async () => {
    vi.useFakeTimers({ toFake: ["setInterval", "clearInterval", "Date"], shouldAdvanceTime: true });
    const user = userEvent.setup();
    renderShop("/checkout");
    await user.click(await screen.findByTestId("shop_rdo_pay_wallet"));
    await user.click($("shop_btn_pay"));
    for (let i = 0; i < 3; i++) {
      await user.keyboard("000000");
      await screen.findByTestId("pay_txt_pin_error");
    }
    expect($("pay_txt_pin_error")).toHaveTextContent("PracticePay terkunci. Coba lagi dalam 30 detik");
    expect(fake.state).toMatchObject({ pinFailures: 0 });
    expect(fake.state.pinLockedUntil).toBeGreaterThan(Date.now());
    expect($$("pay_btn_pin_digit")[0]).toBeDisabled();
    await user.keyboard("1");
    expect($("pay_ind_pin")).toHaveAccessibleName("0 dari 6 digit");

    act(() => vi.advanceTimersByTime(30_000));
    expect(screen.queryByTestId("pay_txt_pin_error")).toBeNull();
    expect($$("pay_btn_pin_digit")[0]).toBeEnabled();
  });

  it("tutup dialog PIN → Bayar aktif lagi", async () => {
    const user = userEvent.setup();
    renderShop("/checkout");
    await user.click(await screen.findByTestId("shop_rdo_pay_wallet"));
    await user.click($("shop_btn_pay"));
    await user.click($("pay_btn_pin_close"));
    expect(screen.queryByTestId("pay_dialog_pin")).toBeNull();
    expect($("shop_btn_pay")).toBeEnabled();
  });
});

describe("Halaman hasil", () => {
  it("salin Order ID → toast; gagal salin", async () => {
    const writeText = vi.fn().mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error("denied"));
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    renderShop("/checkout/result/PM-20260115-0001");
    await userEvent.click(await screen.findByTestId("shop_btn_copy_order_id"));
    expect(writeText).toHaveBeenCalledWith("PM-20260115-0001");
    expect($("shop_txt_snackbar")).toHaveTextContent("Order ID disalin");
    await userEvent.click($("shop_btn_copy_order_id"));
    expect($("shop_txt_snackbar")).toHaveTextContent("Gagal menyalin");
  });

  it("order tidak ada / gagal dibaca / tanpa state → 404", async () => {
    vi.mocked(getOrder).mockResolvedValueOnce(null);
    renderShop("/checkout/result/PM-X");
    expect(await screen.findByTestId("shop_txt_not_found")).toBeInTheDocument();
  });

  it("gagal membaca order → 404", async () => {
    vi.mocked(getOrder).mockRejectedValueOnce(new Error("x"));
    renderShop("/checkout/result/PM-X");
    expect(await screen.findByTestId("shop_txt_not_found")).toBeInTheDocument();
  });

  it("/checkout/result tanpa state gagal → 404", async () => {
    renderShop("/checkout/result");
    expect(await screen.findByTestId("shop_txt_not_found")).toBeInTheDocument();
  });
});
