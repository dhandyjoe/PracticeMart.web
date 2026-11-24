// @vitest-environment jsdom
import { act, cleanup, fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { advanceOrder, cancelOrder, CheckoutError, countActiveOrders, getOrder, listOrders } from "../data/orderRepository";
import type { OrderDoc, TransactionDoc } from "../data/schema";
import { listTransactions, spendBalance, topUpBalance } from "../data/walletRepository";
import { writeDevSettings } from "../sim/settings";
import { fake, resetFake } from "../test/fakeAccount";
import { renderShop } from "../test/shopHarness";
import { itemSummary } from "./OrdersPage";

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
  listOrders: vi.fn(),
  getOrder: vi.fn(),
  advanceOrder: vi.fn(),
  cancelOrder: vi.fn(),
  countActiveOrders: vi.fn(),
}));
vi.mock("../data/walletRepository", () => ({ listTransactions: vi.fn(), spendBalance: vi.fn(), topUpBalance: vi.fn() }));
vi.mock("../domain/pinHash", async (orig) => ({
  ...(await orig<typeof import("../domain/pinHash")>()),
  verifyPin: async (pin: string) => pin === "123456",
}));

const $ = (id: string) => screen.getByTestId(id);
const $$ = (id: string) => screen.queryAllByTestId(id);
const Q = (id: string) => screen.queryByTestId(id);

const AT = Date.parse("2026-01-15T02:41:00Z"); // 09:41 WIB
const order = (p: Partial<OrderDoc> = {}): OrderDoc => ({
  id: "PM-20260115-0001", total: 158_000, method: "card", methodLabel: "Kartu Kredit / Debit", status: "PAID", statusAt: AT,
  stamps: { PAID: AT }, cancelReason: "", vaDeadline: 0, createdAt: AT,
  lines: [{ productId: "P001", color: "Hitam", size: "L", qty: 2 }], ...p,
});

const ORDERS = [
  order({ id: "PM-20260115-0004", status: "WAITING", total: 461_000, lines: [{ productId: "P002", color: "", size: "42", qty: 1 }] }),
  order({ id: "PM-20260115-0003", status: "SHIPPED", total: 861_000, lines: [{ productId: "P010", color: "Hitam", size: "", qty: 1 }, { productId: "P001", color: "Hitam", size: "L", qty: 1 }] }),
  order({ id: "PM-20260115-0002", status: "DONE" }),
  order({ id: "PM-20260110-0001", status: "CANCELLED", createdAt: Date.parse("2026-01-10T03:00:00Z") }),
];

beforeEach(() => {
  resetFake({ balance: 500_000 });
  vi.clearAllMocks();
  writeDevSettings({ latency: 0, deterministic: true, orderInterval: "manual" });
  vi.mocked(listOrders).mockResolvedValue(ORDERS);
  vi.mocked(getOrder).mockResolvedValue(order());
  vi.mocked(countActiveOrders).mockResolvedValue(0);
});

afterEach(() => vi.useRealTimers());

describe("Pesanan Saya (W-ORD-01)", () => {
  it("tabel: id, tanggal, ringkasan produk, total, status, link detail", async () => {
    renderShop("/shop/orders");
    await waitFor(() => expect($$("shop_item_order_row")).toHaveLength(4));
    const first = $$("shop_item_order_row")[0];
    expect(within(first).getByTestId("shop_txt_order_id")).toHaveTextContent("PM-20260115-0004");
    expect(first).toHaveTextContent("15 Jan 2026");
    expect(first).toHaveTextContent("Sepatu Lari Ringan");
    expect(first).toHaveTextContent("Rp461.000");
    expect(within(first).getByTestId("shop_txt_order_status")).toHaveTextContent("Menunggu Pembayaran");
    expect($$("shop_item_order_row")[1]).toHaveTextContent("Headphone Nirkabel +1 lainnya");
    expect($$("shop_item_order_row")[2]).toHaveTextContent("Kaos Polos Basic ×2");
    expect(within(first).getByTestId("shop_link_order_detail")).toHaveAttribute("href", "/shop/order/PM-20260115-0004");
  });

  it("tab, cari Order ID, rentang tanggal, empty state", async () => {
    const user = userEvent.setup();
    renderShop("/shop/orders");
    await waitFor(() => expect($$("shop_item_order_row")).toHaveLength(4));

    await user.click($("shop_tab_order_dikirim"));
    expect($$("shop_txt_order_id").map((e) => e.textContent)).toEqual(["PM-20260115-0003"]);
    await user.click($("shop_tab_order_semua"));
    await user.type($("shop_input_order_search"), "pm-20260115-0002");
    expect($$("shop_item_order_row")).toHaveLength(1);
    await user.clear($("shop_input_order_search"));
    fireEvent.change($("shop_input_order_date_to"), { target: { value: "2026-01-12" } });
    expect($$("shop_txt_order_id").map((e) => e.textContent)).toEqual(["PM-20260110-0001"]);
    await user.click($("shop_tab_order_selesai"));
    expect($$("shop_item_order_row")).toHaveLength(0);
    expect($("shop_txt_orders_empty")).toHaveTextContent("Belum ada pesanan");
  });

  it("panah kiri/kanan memindahkan tab", async () => {
    const user = userEvent.setup();
    renderShop("/shop/orders");
    await screen.findByTestId("shop_table_orders");
    $("shop_tab_order_semua").focus();
    await user.keyboard("{ArrowRight}");
    expect($("shop_tab_order_menunggu")).toHaveAttribute("aria-selected", "true");
    expect($("shop_tab_order_menunggu")).toHaveFocus();
    await user.keyboard("{ArrowLeft}{ArrowLeft}");
    expect($("shop_tab_order_dibatalkan")).toHaveAttribute("aria-selected", "true");
  });

  it("gagal muat → 'Gagal memuat, coba lagi'; muat ulang berhasil", async () => {
    const user = userEvent.setup();
    vi.mocked(listOrders).mockRejectedValueOnce(new Error("offline"));
    renderShop("/shop/orders");
    expect(await screen.findByTestId("shop_txt_orders_error")).toHaveTextContent("Gagal memuat, coba lagi");
    await user.click($("shop_btn_orders_retry"));
    await waitFor(() => expect($$("shop_item_order_row")).toHaveLength(4));
    await user.click($("shop_btn_orders_reload"));
    expect(listOrders).toHaveBeenCalledTimes(3);
    expect($("shop_btn_orders_reload")).toHaveAccessibleName("Muat ulang");
  });

  it("badge pesanan aktif di menu akun & header; 0 → tidak tampil; diperbarui setelah status berubah", async () => {
    const user = userEvent.setup();
    vi.mocked(countActiveOrders).mockResolvedValue(2);
    renderShop("/shop/orders");
    expect(await screen.findByTestId("acc_badge_orders")).toHaveTextContent("2");
    cleanup();

    vi.mocked(cancelOrder).mockResolvedValue(order({ status: "CANCELLED" }));
    renderShop("/shop/order/PM-20260115-0001");
    await user.click(await screen.findByTestId("shop_tab_account"));
    expect(await screen.findByTestId("acc_badge_menu_orders")).toHaveTextContent("2");
    await user.click($("shop_tab_account"));

    vi.mocked(countActiveOrders).mockResolvedValue(0);
    await user.click($("shop_btn_cancel_order"));
    await user.click($$("shop_rdo_cancel_reason")[0]);
    await user.click($("shop_btn_confirm_cancel"));
    await waitFor(() => expect($("shop_txt_order_status")).toHaveTextContent("Dibatalkan"));
    await user.click($("shop_tab_account"));
    await waitFor(() => expect(Q("acc_badge_menu_orders")).toBeNull());
  });

  it("hitung pesanan gagal → badge tidak tampil, halaman tetap jalan", async () => {
    vi.mocked(countActiveOrders).mockRejectedValue(new Error("x"));
    renderShop("/shop/orders");
    await waitFor(() => expect($$("shop_item_order_row")).toHaveLength(4));
    expect(Q("acc_badge_orders")).toBeNull();
  });

  it("itemSummary: tanpa baris → '–'; produk tak dikenal → productId", () => {
    expect(itemSummary(order({ lines: [] }))).toBe("–");
    expect(itemSummary(order({ lines: [{ productId: "PX", color: "", size: "", qty: 1 }] }))).toBe("PX");
  });

  it("tombol lain di tab tidak memindahkan tab; filter 'Dari tanggal'", async () => {
    const user = userEvent.setup();
    renderShop("/shop/orders");
    await waitFor(() => expect($$("shop_item_order_row")).toHaveLength(4));
    $("shop_tab_order_semua").focus();
    await user.keyboard("{ArrowDown}");
    expect($("shop_tab_order_semua")).toHaveAttribute("aria-selected", "true");
    fireEvent.change($("shop_input_order_date_from"), { target: { value: "2026-01-15" } });
    expect($$("shop_item_order_row")).toHaveLength(3);
    expect($("shop_input_order_date_to")).toHaveAttribute("min", "2026-01-15");
  });
});

describe("Detail pesanan (W-ORD-02)", () => {
  it("ringkasan, timeline, produk, rincian", async () => {
    renderShop("/shop/order/PM-20260115-0001");
    expect(await screen.findByTestId("shop_txt_order_id")).toHaveTextContent("PM-20260115-0001");
    expect($("shop_txt_order_total")).toHaveTextContent("Rp158.000");
    expect($("shop_txt_order_status")).toHaveTextContent("Dibayar");
    const steps = $$("shop_item_timeline_step");
    expect(steps).toHaveLength(5);
    expect(steps[1]).toHaveAttribute("aria-current", "step");
    expect(steps[1]).toHaveTextContent("09:41:00");
    expect(steps[2]).toHaveTextContent("Belum");
    expect($("shop_item_order_line")).toHaveTextContent("Kaos Polos Basic");
    expect($("shop_item_order_line")).toHaveTextContent("Hitam · L · 2 × Rp75.000");
    expect(screen.getByText("Ongkir, biaya & diskon").nextElementSibling).toHaveTextContent("Rp8.000");
  });

  it("Order ID tidak ada → 404", async () => {
    vi.mocked(getOrder).mockResolvedValue(null);
    renderShop("/shop/order/PM-X");
    expect(await screen.findByText(/tidak ditemukan/i)).toBeInTheDocument();
  });

  it("salin Order ID → toast", async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { ...navigator, clipboard: { writeText } });
    renderShop("/shop/order/PM-20260115-0001");
    await user.click(await screen.findByTestId("shop_btn_copy_order_id"));
    expect(writeText).toHaveBeenCalledWith("PM-20260115-0001");
    expect(await screen.findByText("Order ID disalin")).toBeInTheDocument();
    vi.unstubAllGlobals();
  });

  it("mode manual: 'Status berikutnya' memajukan status & memuat ulang saldo/stok", async () => {
    const user = userEvent.setup();
    vi.mocked(advanceOrder).mockResolvedValue(order({ status: "PACKED", stamps: { PAID: AT, PACKED: AT + 1000 } }));
    renderShop("/shop/order/PM-20260115-0001");
    await user.click(await screen.findByTestId("shop_btn_next_status"));
    expect(advanceOrder).toHaveBeenCalledWith("u1", "PM-20260115-0001", "PAID");
    await waitFor(() => expect($("shop_txt_order_status")).toHaveTextContent("Dikemas"));
  });

  it("interval otomatis memajukan status (expected = status saat ini); tanpa tombol manual", async () => {
    writeDevSettings({ orderInterval: "3" });
    vi.mocked(advanceOrder).mockResolvedValue(order({ status: "PACKED" }));
    vi.useFakeTimers({ toFake: ["setInterval", "clearInterval"] });
    renderShop("/shop/order/PM-20260115-0001");
    await vi.waitFor(() => expect(Q("shop_txt_order_id")).toBeInTheDocument());
    expect(Q("shop_btn_next_status")).toBeNull();
    await act(() => vi.advanceTimersByTimeAsync(3_000));
    expect(advanceOrder).toHaveBeenCalledWith("u1", "PM-20260115-0001", "PAID");
    await vi.waitFor(() => expect($("shop_txt_order_status")).toHaveTextContent("Dikemas"));
  });

  it("Menunggu Pembayaran tidak maju otomatis; 'Saya sudah bayar' memajukan", async () => {
    const user = userEvent.setup();
    writeDevSettings({ orderInterval: "3" });
    vi.mocked(getOrder).mockResolvedValue(order({ status: "WAITING", stamps: { WAITING: AT } }));
    vi.mocked(advanceOrder).mockResolvedValue(order({ status: "PAID" }));
    renderShop("/shop/order/PM-20260115-0001");
    await user.click(await screen.findByTestId("shop_btn_confirm_paid"));
    expect(advanceOrder).toHaveBeenCalledWith("u1", "PM-20260115-0001", "WAITING");
    await waitFor(() => expect($("shop_txt_order_status")).toHaveTextContent("Dibayar"));
  });

  it("VA lewat batas bayar → dibatalkan otomatis", async () => {
    vi.mocked(getOrder).mockResolvedValue(order({ status: "WAITING", vaDeadline: Date.now() - 1000 }));
    vi.mocked(cancelOrder).mockResolvedValue(order({ status: "CANCELLED", cancelReason: "Waktu pembayaran habis" }));
    renderShop("/shop/order/PM-20260115-0001");
    await waitFor(() => expect(cancelOrder).toHaveBeenCalledWith("u1", "PM-20260115-0001", "Waktu pembayaran habis"));
    await waitFor(() => expect($("shop_txt_order_status")).toHaveTextContent("Dibatalkan"));
    expect($("shop_txt_cancel_reason")).toHaveTextContent("Waktu pembayaran habis");
    expect(Q("shop_btn_cancel_order")).toBeNull();
  });

  it("batal: tombol disabled sampai alasan; 'Lainnya' wajib teks; sukses → Dibatalkan", async () => {
    const user = userEvent.setup();
    vi.mocked(cancelOrder).mockResolvedValue(order({ status: "CANCELLED", cancelReason: "Salah pesan" }));
    renderShop("/shop/order/PM-20260115-0001");
    await user.click(await screen.findByTestId("shop_btn_cancel_order"));
    expect($("shop_btn_confirm_cancel")).toBeDisabled();
    await user.click($$("shop_rdo_cancel_reason")[3]);
    expect($("shop_btn_confirm_cancel")).toBeDisabled();
    await user.type($("shop_input_cancel_other"), "Salah pesan");
    expect($("shop_btn_confirm_cancel")).toBeEnabled();
    await user.click($("shop_btn_confirm_cancel"));
    expect(cancelOrder).toHaveBeenCalledWith("u1", "PM-20260115-0001", "Salah pesan");
    await waitFor(() => expect(Q("shop_modal_cancel")).toBeNull());
    expect($("shop_txt_order_status")).toHaveTextContent("Dibatalkan");
    expect(Q("shop_btn_cancel_order")).toBeNull();
  });

  it("alasan pilihan dikirim apa adanya; Kembali menutup tanpa membatalkan", async () => {
    const user = userEvent.setup();
    vi.mocked(cancelOrder).mockResolvedValue(order({ status: "CANCELLED" }));
    renderShop("/shop/order/PM-20260115-0001");
    await user.click(await screen.findByTestId("shop_btn_cancel_order"));
    await user.click($("shop_btn_cancel_back"));
    expect(Q("shop_modal_cancel")).toBeNull();
    await user.click($("shop_btn_cancel_order"));
    await user.click($$("shop_rdo_cancel_reason")[0]);
    await user.click($("shop_btn_confirm_cancel"));
    expect(cancelOrder).toHaveBeenCalledWith("u1", "PM-20260115-0001", "Ingin ubah alamat pengiriman");
  });

  it("Dikirim: tanpa tombol batal, tampil teks penjelasan", async () => {
    vi.mocked(getOrder).mockResolvedValue(order({ status: "SHIPPED", stamps: { PAID: AT, SHIPPED: AT } }));
    renderShop("/shop/order/PM-20260115-0001");
    expect(await screen.findByTestId("shop_txt_cannot_cancel")).toHaveTextContent("Pesanan yang sudah dikirim tidak bisa dibatalkan");
    expect(Q("shop_btn_cancel_order")).toBeNull();
  });

  it("VA menunggu: nomor VA + salin, countdown, cara bayar; Cek Status gagal/berhasil bergantian (deterministik 30%)", async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    const waiting = order({ status: "WAITING", method: "va", methodLabel: "Virtual Account Mandiri", stamps: { WAITING: AT }, vaDeadline: Date.now() + 120_000 });
    vi.mocked(getOrder).mockResolvedValue(waiting);
    writeDevSettings({ errorRate: 30 });
    renderShop("/shop/order/PM-20260115-0001");

    expect(await screen.findByTestId("shop_txt_va_number")).toHaveTextContent("8900 2026 0115 0001");
    expect($("shop_txt_va_countdown")).toHaveAttribute("role", "timer");
    expect($$("shop_item_va_howto")).toHaveLength(3);
    await user.click($("shop_btn_copy_va"));
    expect(writeText).toHaveBeenCalledWith("8900202601150001");
    expect(await screen.findByText("Nomor VA disalin")).toBeInTheDocument();

    const outcomes: string[] = [];
    for (let i = 0; i < 2; i++) {
      await user.click($("shop_btn_va_check_status"));
      await waitFor(() => expect($("shop_btn_va_check_status")).toBeEnabled());
      outcomes.push(Q("shop_txt_va_error")?.textContent ?? screen.getByTestId("shop_txt_snackbar").textContent!);
    }
    expect(outcomes.sort()).toEqual(["Gagal memuat, coba lagi", "Pembayaran belum diterima"]);

    // Sudah dibayar di tempat lain → Cek Status memperbarui status, panel hilang.
    writeDevSettings({ errorRate: 0 });
    vi.mocked(getOrder).mockResolvedValue(order({ status: "PAID" }));
    await user.click($("shop_btn_va_check_status"));
    await waitFor(() => expect($("shop_txt_order_status")).toHaveTextContent("Dibayar"));
    expect(Q("shop_panel_va")).toBeNull();
  });

  it("VA: salin gagal, Cek Status saat pesanan hilang, countdown habis → 00:00", async () => {
    const user = userEvent.setup();
    Object.defineProperty(navigator, "clipboard", { value: { writeText: vi.fn().mockRejectedValue(new Error("x")) }, configurable: true });
    writeDevSettings({ errorRate: 0 });
    vi.useFakeTimers({ toFake: ["setInterval", "clearInterval", "Date"], shouldAdvanceTime: true });
    vi.mocked(getOrder).mockResolvedValueOnce(order({ status: "WAITING", method: "va", vaDeadline: Date.now() + 2_000 })).mockResolvedValue(null);
    renderShop("/shop/order/PM-20260115-0001");
    await user.click(await screen.findByTestId("shop_btn_copy_va"));
    expect(await screen.findByText("Gagal menyalin")).toBeInTheDocument();
    await user.click($("shop_btn_va_check_status"));
    expect(await screen.findByTestId("shop_txt_va_error")).toHaveTextContent("Gagal memuat, coba lagi");
    vi.mocked(cancelOrder).mockResolvedValue(order({ status: "WAITING", method: "va", vaDeadline: Date.now() + 2_000 }));
    await act(() => vi.advanceTimersByTimeAsync(3_000));
    expect($("shop_txt_va_countdown")).toHaveTextContent("00:00");
  });

  it("gagal membaca pesanan → 404", async () => {
    vi.mocked(getOrder).mockRejectedValue(new Error("x"));
    renderShop("/shop/order/PM-20260115-0001");
    expect(await screen.findByText(/tidak ditemukan/i)).toBeInTheDocument();
  });

  it("salin gagal → 'Gagal menyalin'", async () => {
    const user = userEvent.setup();
    vi.stubGlobal("navigator", { ...navigator, clipboard: { writeText: vi.fn().mockRejectedValue(new Error("x")) } });
    renderShop("/shop/order/PM-20260115-0001");
    await user.click(await screen.findByTestId("shop_btn_copy_order_id"));
    expect(await screen.findByText("Gagal menyalin")).toBeInTheDocument();
    vi.unstubAllGlobals();
  });

  it("produk tak dikenal & tanpa varian: nama = productId, harga Rp0", async () => {
    vi.mocked(getOrder).mockResolvedValue(order({ lines: [{ productId: "PX", color: "", size: "", qty: 3 }] }));
    renderShop("/shop/order/PM-20260115-0001");
    const row = await screen.findByTestId("shop_item_order_line");
    expect(row).toHaveTextContent("PX");
    expect(row).toHaveTextContent("3 × Rp0");
    expect(row).not.toHaveTextContent("·");
  });

  it("VA belum lewat batas → dibatalkan tepat saat batas tiba", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "Date"], shouldAdvanceTime: true });
    vi.mocked(getOrder).mockResolvedValue(order({ status: "WAITING", vaDeadline: Date.now() + 60_000 }));
    vi.mocked(cancelOrder).mockResolvedValue(order({ status: "CANCELLED", cancelReason: "Waktu pembayaran habis" }));
    renderShop("/shop/order/PM-20260115-0001");
    await vi.waitFor(() => expect(Q("shop_txt_order_id")).toBeInTheDocument());
    expect(cancelOrder).not.toHaveBeenCalled();
    await act(() => vi.advanceTimersByTimeAsync(60_000));
    expect(cancelOrder).toHaveBeenCalledWith("u1", "PM-20260115-0001", "Waktu pembayaran habis");
    await vi.waitFor(() => expect($("shop_txt_order_status")).toHaveTextContent("Dibatalkan"));
  });

  it("error non-bisnis: online → 'Gagal memuat, coba lagi'; offline → 'Tidak ada koneksi'", async () => {
    const user = userEvent.setup();
    vi.mocked(advanceOrder).mockRejectedValue(new Error("x"));
    renderShop("/shop/order/PM-20260115-0001");
    await user.click(await screen.findByTestId("shop_btn_next_status"));
    expect(await screen.findByTestId("shop_txt_order_error")).toHaveTextContent("Gagal memuat, coba lagi");
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
    await user.click($("shop_btn_next_status"));
    await waitFor(() => expect($("shop_txt_order_error")).toHaveTextContent("Tidak ada koneksi"));
    vi.restoreAllMocks();
  });

  it("error bisnis dari server ditampilkan apa adanya", async () => {
    const user = userEvent.setup();
    vi.mocked(cancelOrder).mockRejectedValue(new CheckoutError("Pesanan yang sudah dikirim tidak bisa dibatalkan"));
    renderShop("/shop/order/PM-20260115-0001");
    await user.click(await screen.findByTestId("shop_btn_cancel_order"));
    await user.click($$("shop_rdo_cancel_reason")[1]);
    await user.click($("shop_btn_confirm_cancel"));
    expect(await screen.findByTestId("shop_txt_order_error")).toHaveTextContent("Pesanan yang sudah dikirim tidak bisa dibatalkan");
  });
});

const TXS: TransactionDoc[] = [
  { id: "8", title: "Top Up dari BCA", amount: 300_000, at: Date.parse("2026-01-15T02:12:00Z") },
  { id: "7", title: "Belanja PracticeMart", amount: -86_000, at: Date.parse("2026-01-15T01:47:00Z") },
  { id: "6", title: "Transfer ke Budi Santoso", amount: -150_000, at: Date.parse("2026-01-14T12:30:00Z") },
];

async function enterPin(user: ReturnType<typeof userEvent.setup>, pin: string) {
  const dialog = await screen.findByTestId("pay_dialog_pin");
  for (const d of pin) await user.click(within(dialog).getByRole("button", { name: d }));
}

describe("PracticePay (W-PAY-01)", () => {
  beforeEach(() => {
    vi.mocked(listTransactions).mockResolvedValue(TXS);
  });

  it("saldo + sembunyikan/tampilkan; riwayat dengan format tanggal & nominal", async () => {
    const user = userEvent.setup();
    renderShop("/pay");
    expect(await screen.findByTestId("pay_txt_balance")).toHaveTextContent("Rp500.000");
    await user.click($("pay_btn_toggle_balance"));
    expect($("pay_txt_balance")).toHaveTextContent("Rp••••••");
    expect($("pay_btn_toggle_balance")).toHaveAccessibleName("Tampilkan saldo");
    await user.click($("pay_btn_toggle_balance"));
    expect($("pay_btn_toggle_balance")).toHaveAccessibleName("Sembunyikan saldo");

    await waitFor(() => expect($$("pay_item_history_row")).toHaveLength(3));
    expect($$("pay_item_history_row")[0]).toHaveTextContent("2026-01-15 09:12");
    expect($$("pay_txt_history_amount").map((e) => e.textContent)).toEqual(["+Rp300.000", "−Rp86.000", "−Rp150.000"]);
    expect($("pay_txt_history_count")).toHaveTextContent("Menampilkan 3 transaksi");
  });

  it("chip Masuk/Keluar & urut tanggal/nominal", async () => {
    const user = userEvent.setup();
    renderShop("/pay");
    await waitFor(() => expect($$("pay_item_history_row")).toHaveLength(3));
    await user.click($("pay_chip_out"));
    expect($("pay_chip_out")).toHaveAttribute("aria-checked", "true");
    expect($$("pay_txt_history_amount")).toHaveLength(2);
    await user.click($("pay_chip_in"));
    expect($$("pay_txt_history_amount")).toHaveLength(1);
    await user.click($("pay_chip_all"));
    await user.click($("pay_btn_sort_date")); // desc → asc
    expect($$("pay_item_history_row")[0]).toHaveTextContent("Transfer ke Budi Santoso");
    await user.click($("pay_btn_sort_amount"));
    expect($$("pay_item_history_row")[0]).toHaveTextContent("Top Up dari BCA");
    await user.click($("pay_btn_sort_amount"));
    expect($$("pay_item_history_row")[0]).toHaveTextContent("Transfer ke Budi Santoso");
  });

  it("riwayat gagal dimuat → coba lagi", async () => {
    const user = userEvent.setup();
    vi.mocked(listTransactions).mockRejectedValueOnce(new Error("x"));
    renderShop("/pay");
    expect(await screen.findByTestId("pay_txt_history_error")).toHaveTextContent("Gagal memuat, coba lagi");
    await user.click($("pay_btn_history_retry"));
    await waitFor(() => expect($$("pay_item_history_row")).toHaveLength(3));
  });

  it("transfer: kontak → nominal → PIN → berhasil, saldo & riwayat dimuat ulang", async () => {
    const user = userEvent.setup();
    vi.mocked(spendBalance).mockImplementation(async (_u, _t, amount) => {
      fake.state = { ...fake.state, balance: fake.state.balance - amount };
      return fake.state.balance;
    });
    renderShop("/pay");
    await user.click(await screen.findByTestId("pay_btn_transfer"));
    expect($("pay_btn_transfer_next")).toBeDisabled();

    await user.type($("pay_input_recipient"), "zzz");
    expect($("pay_txt_no_contact")).toHaveTextContent("Kontak tidak ditemukan");
    await user.clear($("pay_input_recipient"));
    await user.type($("pay_input_recipient"), "bud");
    await user.click($$("pay_item_contact")[0]);
    expect($("pay_input_recipient")).toHaveValue("Budi Santoso");

    await user.type($("pay_input_amount"), "5000");
    expect($("pay_txt_amount_error")).toHaveTextContent("Minimal transfer Rp10.000");
    expect($("pay_btn_transfer_next")).toBeDisabled();
    await user.click($$("pay_chip_amount")[1]); // Rp100.000
    expect($("pay_input_amount")).toHaveValue("Rp100.000");
    expect(Q("pay_txt_amount_error")).toBeNull();
    // FR-PAY-05: catatan opsional maks 50 karakter.
    expect($("pay_txt_transfer_note_count")).toHaveTextContent("0/50");
    await user.type($("pay_input_transfer_note"), "  Bayar arisan " + "x".repeat(60));
    expect(($("pay_input_transfer_note") as HTMLInputElement).value).toHaveLength(50);
    expect($("pay_txt_transfer_note_count")).toHaveTextContent("50/50");
    await user.clear($("pay_input_transfer_note"));
    await user.type($("pay_input_transfer_note"), "  Bayar arisan ");
    const Notif = vi.fn();
    vi.stubGlobal("Notification", Object.assign(Notif, { permission: "granted" }));
    await user.click($("pay_btn_transfer_next"));

    await enterPin(user, "123456");
    await waitFor(() => expect($("pay_txt_transfer_result")).toHaveTextContent("Transfer berhasil"));
    expect(spendBalance).toHaveBeenCalledWith("u1", "Transfer ke Budi Santoso · Bayar arisan", 100_000);
    expect($("pay_txt_transfer_note")).toHaveTextContent("Catatan: Bayar arisan");
    // FR-PAY-07: notifikasi browser.
    expect(Notif).toHaveBeenCalledWith("Transfer Rp100.000 ke Budi Santoso berhasil");
    vi.unstubAllGlobals();
    expect(listTransactions).toHaveBeenCalledTimes(2);
    expect($("pay_modal_transfer")).toHaveTextContent("Rp100.000 ke Budi Santoso");
    await user.click($("pay_btn_transfer_done"));
    expect($("pay_txt_balance")).toHaveTextContent("Rp400.000");
  });

  it("kontak: daftar A–Z dengan header per huruf, 'Terakhir' dari riwayat transfer → pilih langsung", async () => {
    const user = userEvent.setup();
    renderShop("/pay");
    await waitFor(() => expect($$("pay_item_history_row")).toHaveLength(3));
    await user.click($("pay_btn_transfer"));
    expect($$("pay_txt_contact_letter").map((e) => e.textContent)).toEqual(["A", "B", "C", "D", "E", "F", "G"]);
    expect(screen.getByRole("group", { name: "B" })).toHaveTextContent("Budi Santoso");
    expect($$("pay_chip_recent_contact").map((e) => e.textContent)).toEqual(["Budi Santoso"]);
    await user.type($("pay_input_recipient"), "an");
    expect($$("pay_txt_contact_letter").map((e) => e.textContent)).toEqual(["A", "B", "D", "G"]);
    await user.click($$("pay_chip_recent_contact")[0]);
    expect($("pay_input_recipient")).toHaveValue("Budi Santoso");
    expect(Q("pay_list_contacts")).toBeNull();
    expect(Q("pay_list_recent_contacts")).toBeNull();
  });

  it("saldo tidak cukup menonaktifkan Lanjut; PIN salah menahan transfer", async () => {
    const user = userEvent.setup();
    renderShop("/pay");
    await user.click(await screen.findByTestId("pay_btn_transfer"));
    await user.type($("pay_input_recipient"), "Eka");
    await user.click($$("pay_item_contact")[0]);
    await user.type($("pay_input_amount"), "600000");
    expect($("pay_txt_amount_error")).toHaveTextContent("Saldo tidak cukup");
    expect($("pay_btn_transfer_next")).toBeDisabled();
    await user.clear($("pay_input_amount"));
    await user.type($("pay_input_amount"), "20000");
    await user.click($("pay_btn_transfer_next"));
    await enterPin(user, "111111");
    expect(await screen.findByTestId("pay_txt_pin_error")).toHaveTextContent("PIN salah. Sisa 2 percobaan.");
    expect(spendBalance).not.toHaveBeenCalled();
  });

  it("server menolak (saldo berubah di perangkat lain) → kembali ke form dengan pesan", async () => {
    const user = userEvent.setup();
    vi.mocked(spendBalance).mockRejectedValue(new CheckoutError("Saldo tidak cukup"));
    renderShop("/pay");
    await user.click(await screen.findByTestId("pay_btn_transfer"));
    await user.type($("pay_input_recipient"), "Eka");
    await user.click($$("pay_item_contact")[0]);
    await user.type($("pay_input_amount"), "20000");
    await user.click($("pay_btn_transfer_next"));
    await enterPin(user, "123456");
    expect(await screen.findByTestId("pay_txt_transfer_error")).toHaveTextContent("Saldo tidak cukup");
  });

  it("riwayat kosong → 'Belum ada transaksi'; Muat ulang membaca ulang", async () => {
    const user = userEvent.setup();
    vi.mocked(listTransactions).mockResolvedValue([]);
    renderShop("/pay");
    expect(await screen.findByTestId("pay_txt_history_empty")).toHaveTextContent("Belum ada transaksi");
    expect($("pay_txt_history_count")).toHaveTextContent("Menampilkan 0 transaksi");
    await user.click($("pay_btn_history_reload"));
    expect(listTransactions).toHaveBeenCalledTimes(2);
  });

  it("transfer: tutup dialog PIN → kembali ke form; error jaringan saat offline → 'Tidak ada koneksi'", async () => {
    const user = userEvent.setup();
    vi.mocked(spendBalance).mockRejectedValue(new Error("x"));
    renderShop("/pay");
    await user.click(await screen.findByTestId("pay_btn_transfer"));
    await user.type($("pay_input_recipient"), "Eka");
    await user.click($$("pay_item_contact")[0]);
    await user.type($("pay_input_amount"), "20000");
    await user.click($("pay_btn_transfer_next"));
    await user.click(await screen.findByTestId("pay_btn_pin_close"));
    expect(await screen.findByTestId("pay_input_amount")).toBeInTheDocument();
    expect(spendBalance).not.toHaveBeenCalled();

    vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
    await user.click($("pay_btn_transfer_next"));
    await enterPin(user, "123456");
    expect(await screen.findByTestId("pay_txt_transfer_error")).toHaveTextContent("Tidak ada koneksi");
    vi.restoreAllMocks();
  });

  it("QR tanpa kode terbaca → 'QR tidak terbaca'; QR tanpa nominal → URL tanpa amount; batal pilih file → tidak apa-apa", async () => {
    vi.stubGlobal("createImageBitmap", async () => ({}));
    vi.stubGlobal("BarcodeDetector", class { detect = async () => []; });
    const router = renderShop("/pay");
    const input = await screen.findByTestId("pay_input_qr_upload");
    fireEvent.change(input, { target: { files: [] } });
    expect(Q("pay_txt_qr_error")).toBeNull();
    fireEvent.change(input, { target: { files: [new File(["x"], "qr.png")] } });
    expect(await screen.findByTestId("pay_txt_qr_error")).toHaveTextContent("QR tidak terbaca");

    vi.stubGlobal("BarcodeDetector", class { detect = async () => [{ rawValue: "/pay/qr?merchant=kopipagi" }]; });
    fireEvent.change(input, { target: { files: [new File(["x"], "qr.png")] } });
    await waitFor(() => expect(router.state.location.pathname + router.state.location.search).toBe("/pay/qr?merchant=KOPIPAGI"));
    vi.unstubAllGlobals();
  });

  it("Top Up: validasi batas, gagal sesuai error rate, lalu berhasil → saldo & riwayat dimuat ulang", async () => {
    const user = userEvent.setup();
    writeDevSettings({ errorRate: 30 });
    vi.mocked(topUpBalance).mockImplementation(async (_uid, amount) => {
      fake.state = { ...fake.state, balance: fake.state.balance + amount };
    });
    renderShop("/pay");
    await user.click(await screen.findByTestId("pay_btn_topup"));
    expect($("pay_input_topup_amount")).toHaveFocus();
    expect($("pay_btn_topup_submit")).toBeDisabled();
    await user.type($("pay_input_topup_amount"), "5000");
    expect($("pay_txt_topup_amount_error")).toHaveTextContent("Minimal top up Rp10.000");
    expect($("pay_btn_topup_submit")).toBeDisabled();
    await user.clear($("pay_input_topup_amount"));
    await user.type($("pay_input_topup_amount"), "10000001");
    expect($("pay_txt_topup_amount_error")).toHaveTextContent("Maksimal top up Rp10.000.000");
    await user.clear($("pay_input_topup_amount"));
    await user.type($("pay_input_topup_amount"), "100000");
    expect($("pay_btn_topup_submit")).toHaveTextContent("Top Up Rp100.000");

    // Deterministik 30%: satu dari dua permintaan gagal.
    await user.click($("pay_btn_topup_submit"));
    if (Q("pay_txt_topup_result") === null) {
      expect(await screen.findByTestId("pay_txt_topup_error")).toHaveTextContent("Gagal memuat, coba lagi");
      expect(topUpBalance).not.toHaveBeenCalled();
      await user.click($("pay_btn_topup_submit"));
    }
    expect(await screen.findByTestId("pay_txt_topup_result")).toHaveTextContent("Top up berhasil");
    expect(topUpBalance).toHaveBeenCalledWith("u1", 100_000);
    await user.click($("pay_btn_topup_done"));
    expect(Q("pay_modal_topup")).toBeNull();
    expect($("pay_txt_balance")).toHaveTextContent("Rp600.000");
    expect(listTransactions).toHaveBeenCalledTimes(2);
  });

  it("Top Up: error server dari repository ditampilkan; Tutup menutup dialog", async () => {
    const user = userEvent.setup();
    writeDevSettings({ errorRate: 0 });
    vi.mocked(topUpBalance).mockRejectedValue(new CheckoutError("Nominal tidak valid"));
    renderShop("/pay");
    await user.click(await screen.findByTestId("pay_btn_topup"));
    await user.type($("pay_input_topup_amount"), "20000");
    await user.click($("pay_btn_topup_submit"));
    expect(await screen.findByTestId("pay_txt_topup_error")).toHaveTextContent("Nominal tidak valid");
    await user.click($("pay_btn_topup_close"));
    expect(Q("pay_modal_topup")).toBeNull();
  });

  it("unggah QR tanpa BarcodeDetector → 'QR tidak terbaca'", async () => {
    renderShop("/pay");
    const input = await screen.findByTestId("pay_input_qr_upload");
    fireEvent.change(input, { target: { files: [new File(["x"], "qr.png", { type: "image/png" })] } });
    expect(await screen.findByTestId("pay_txt_qr_error")).toHaveTextContent("QR tidak terbaca");
  });

  it("unggah QR valid → halaman konfirmasi merchant", async () => {
    vi.stubGlobal("BarcodeDetector", class { detect = async () => [{ rawValue: "https://x.dev/pay/qr?merchant=KOPIPAGI&amount=28000" }]; });
    vi.stubGlobal("createImageBitmap", async () => ({}));
    const router = renderShop("/pay");
    fireEvent.change(await screen.findByTestId("pay_input_qr_upload"), { target: { files: [new File(["x"], "qr.png")] } });
    await waitFor(() => expect(router.state.location.pathname + router.state.location.search).toBe("/pay/qr?merchant=KOPIPAGI&amount=28000"));
    expect(await screen.findByTestId("pay_txt_merchant")).toHaveTextContent("Kopi Pagi");
    vi.unstubAllGlobals();
  });

  it("unggah QR bukan milik PracticeMart → 'QR tidak valid'", async () => {
    vi.stubGlobal("BarcodeDetector", class { detect = async () => [{ rawValue: "halo" }]; });
    vi.stubGlobal("createImageBitmap", async () => ({}));
    renderShop("/pay");
    fireEvent.change(await screen.findByTestId("pay_input_qr_upload"), { target: { files: [new File(["x"], "qr.png")] } });
    expect(await screen.findByTestId("pay_txt_qr_error")).toHaveTextContent("QR tidak valid");
    vi.unstubAllGlobals();
  });
});

describe("Bayar QR (/pay/qr)", () => {
  it("merchant nominal bebas: nominal dari URL bisa diubah → PIN → berhasil", async () => {
    const user = userEvent.setup();
    vi.mocked(spendBalance).mockResolvedValue(472_000);
    renderShop("/pay/qr?merchant=KOPIPAGI&amount=28000");
    expect(await screen.findByTestId("pay_txt_merchant")).toHaveTextContent("Kopi Pagi");
    expect($("pay_input_qr_amount")).toHaveValue("Rp28.000");
    await user.click($("pay_btn_qr_pay"));
    await enterPin(user, "123456");
    expect(await screen.findByTestId("pay_txt_qr_result")).toHaveTextContent("Pembayaran berhasil");
    expect(spendBalance).toHaveBeenCalledWith("u1", "Bayar QR · Kopi Pagi", 28_000);
  });

  it("merchant nominal tetap mengabaikan ?amount=", async () => {
    renderShop("/pay/qr?merchant=TOKOBUKU&amount=1");
    expect(await screen.findByTestId("pay_input_qr_amount")).toHaveValue("Rp45.000");
    expect($("pay_input_qr_amount")).toHaveAttribute("readonly");
  });

  it("merchant tak dikenal → 'QR tidak valid'", async () => {
    renderShop("/pay/qr?merchant=LAIN");
    expect(await screen.findByTestId("pay_txt_qr_invalid")).toHaveTextContent("QR tidak valid");
  });

  it("tanpa ?merchant= → 'QR tidak valid' + kembali ke PracticePay", async () => {
    renderShop("/pay/qr");
    expect(await screen.findByTestId("pay_txt_qr_invalid")).toBeInTheDocument();
    expect($("pay_link_back")).toHaveAttribute("href", "/pay");
  });

  it("tanpa nominal: Bayar disabled; ketik nominal → aktif; tutup PIN tidak membayar", async () => {
    const user = userEvent.setup();
    renderShop("/pay/qr?merchant=KOPIPAGI");
    expect(await screen.findByTestId("pay_input_qr_amount")).toHaveValue("");
    expect($("pay_btn_qr_pay")).toBeDisabled();
    await user.type($("pay_input_qr_amount"), "15a000");
    expect($("pay_input_qr_amount")).toHaveValue("Rp15.000");
    expect($("pay_btn_qr_pay")).toHaveTextContent("Bayar Rp15.000");
    await user.click($("pay_btn_qr_pay"));
    await user.click(await screen.findByTestId("pay_btn_pin_close"));
    expect(Q("pay_dialog_pin")).toBeNull();
    expect(spendBalance).not.toHaveBeenCalled();
  });

  it("server menolak → pesan error, tetap di form", async () => {
    const user = userEvent.setup();
    vi.mocked(spendBalance).mockRejectedValue(new CheckoutError("Saldo tidak cukup"));
    renderShop("/pay/qr?merchant=TOKOBUKU");
    await user.click(await screen.findByTestId("pay_btn_qr_pay"));
    await enterPin(user, "123456");
    expect(await screen.findByTestId("pay_txt_qr_error")).toHaveTextContent("Saldo tidak cukup");
    expect(Q("pay_txt_qr_result")).toBeNull();
  });

  it("nominal melebihi saldo → 'Saldo tidak cukup'", async () => {
    renderShop("/pay/qr?merchant=KOPIPAGI&amount=900000");
    expect(await screen.findByTestId("pay_txt_amount_error")).toHaveTextContent("Saldo tidak cukup");
    expect($("pay_btn_qr_pay")).toBeDisabled();
  });
});
