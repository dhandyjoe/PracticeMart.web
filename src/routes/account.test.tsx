// @vitest-environment jsdom
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { logout, updateDisplayName } from "../data/authRepository";
import type { Address } from "../data/schema";
import { DEV_KEYS, PREF_KEYS, readDevSettings, readPreferences, writeDevSettings } from "../sim/settings";
import { fake, resetFake } from "../test/fakeAccount";
import { renderShop } from "../test/shopHarness";
import { CS_PHONE } from "./HelpPage";
import TermsPage from "./TermsPage";

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
  return {
    ...(await orig<typeof import("../data/authRepository")>()),
    getDisplayName: f.getDisplayName,
    logout: vi.fn(),
    updateDisplayName: vi.fn(async () => {}),
  };
});

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
const OFFICE: Address = { ...HOME, id: "office", label: "Kantor", province: "DKI Jakarta", city: "Jakarta Pusat", isPrimary: false };

beforeEach(() => {
  resetFake({
    profile: { name: "Rina Wulandari", email: "rina@mail.com", birth: "", gender: "", photoUri: "" },
    addresses: [HOME, OFFICE],
  });
  vi.clearAllMocks();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("Navigasi akun", () => {
  it("link aktif, nama & email, Keluar dengan konfirmasi", async () => {
    renderShop("/account");
    expect(await screen.findByTestId("acc_txt_nav_name")).toHaveTextContent("Rina Wulandari");
    expect($("acc_nav_profile")).toHaveAttribute("aria-current", "page");
    expect($("acc_nav_settings")).toHaveAttribute("href", "/settings");
    await userEvent.click($("acc_nav_logout"));
    expect(screen.getByRole("alertdialog", { name: "Keluar dari akun?" })).toBeInTheDocument();
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByTestId("acc_dialog_logout")).toBeNull();
    await userEvent.click($("acc_nav_logout"));
    // Fokus terkunci di dalam dialog (design §14.3).
    const [cancel, confirm] = [$("acc_dialog_logout_cancel"), $("acc_dialog_logout_confirm")];
    expect(cancel).toHaveFocus();
    await userEvent.tab();
    expect(confirm).toHaveFocus();
    await userEvent.tab();
    expect(cancel).toHaveFocus();
    await userEvent.tab({ shift: true });
    expect(confirm).toHaveFocus();
    confirm.blur();
    fireEvent.keyDown(document, { key: "Tab", shiftKey: true });
    expect(confirm).toHaveFocus();
    confirm.blur();
    fireEvent.keyDown(document, { key: "Tab" });
    expect(cancel).toHaveFocus();
    fireEvent.mouseDown(screen.getByRole("alertdialog"));
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
    fireEvent.mouseDown(screen.getByRole("alertdialog").parentElement!);
    expect(screen.queryByRole("alertdialog")).toBeNull();
    await userEvent.click($("acc_nav_logout"));
    await userEvent.click($("acc_dialog_logout_confirm"));
    expect(logout).toHaveBeenCalled();
  });
});

describe("Profil (FR-ACC-02)", () => {
  it("ubah nama, tanggal lahir, jenis kelamin → tersimpan di akun + nama tampilan", async () => {
    const user = userEvent.setup();
    renderShop("/account");
    const name = await screen.findByTestId("acc_input_name");
    expect($("acc_input_email")).toBeDisabled();
    expect($("acc_input_email")).toHaveValue("rina@mail.com");

    await user.clear(name);
    expect($("acc_txt_name_error")).toHaveTextContent("Nama wajib diisi");
    expect($("acc_btn_save_profile")).toBeDisabled();
    await user.type(name, "Rina W");
    fireEvent.change($("acc_input_birthdate"), { target: { value: "1998-08-17" } });
    await user.click($("acc_rdo_gender_female"));
    await user.click($("acc_btn_save_profile"));

    await waitFor(() => expect($("acc_txt_profile_saved")).toHaveTextContent("Profil tersimpan"));
    expect(fake.state.profile).toEqual({ name: "Rina W", email: "rina@mail.com", birth: "1998-08-17", gender: "female", photoUri: "" });
    expect(updateDisplayName).toHaveBeenCalledWith("u1", "Rina W");
    expect($("acc_txt_nav_name")).toHaveTextContent("Rina W");
  });

  it("tanpa foto profil: hanya inisial (kontrak 1.2)", async () => {
    renderShop("/account");
    await screen.findByTestId("acc_btn_save_profile");
    expect(screen.queryByTestId("acc_input_photo")).toBeNull();
    expect(screen.queryByTestId("acc_drop_photo")).toBeNull();
  });
});

describe("Alamat (FR-ACC-03)", () => {
  it("daftar, Jadikan utama", async () => {
    renderShop("/account");
    expect(await screen.findAllByTestId("addr_card")).toHaveLength(2);
    await userEvent.click($("addr_btn_set_default"));
    expect(fake.state.addresses.map((a) => a.isPrimary)).toEqual([false, true]);
  });

  it("tambah: validasi, kode pos langsung, kota dari daftar; alamat utama baru", async () => {
    const user = userEvent.setup();
    renderShop("/account");
    await user.click(await screen.findByTestId("addr_btn_add"));
    expect($("addr_btn_add")).toHaveTextContent("Batal");
    expect($("addr_input_recipient")).toHaveValue("Rina Wulandari");
    await user.clear($("addr_input_recipient"));
    await user.type($("addr_input_postal"), "1022");
    expect($("addr_txt_postal_error")).toHaveTextContent("Kode pos harus 5 digit");
    await user.click($("addr_btn_save"));
    expect($("addr_txt_recipient_error")).toHaveTextContent("Wajib diisi");
    expect($("addr_txt_phone_error")).toHaveTextContent("Nomor HP harus 10–13 digit");
    expect($("addr_txt_city_error")).toHaveTextContent("Pilih kota dari daftar");
    expect($("addr_txt_street_error")).toHaveTextContent("Wajib diisi");
    expect(fake.state.addresses).toHaveLength(2);

    await user.click($("addr_rdo_label_other"));
    await user.type($("addr_input_recipient"), "Budi");
    await user.type($("addr_input_phone"), "0812-1111-2222");
    await user.selectOptions($("addr_spn_province"), "Jawa Timur");
    await user.type($("addr_spn_city"), "Malang");
    await user.type($("addr_input_street"), "Jl. Ijen No. 5");
    await user.type($("addr_input_postal"), "0");
    await user.click($("addr_sw_primary"));
    expect($("addr_sw_primary")).toHaveAttribute("aria-checked", "true");
    await user.click($("addr_btn_save"));

    await waitFor(() => expect(fake.state.addresses).toHaveLength(3));
    expect(fake.state.addresses[2]).toMatchObject({
      label: "Lainnya",
      recipient: "Budi",
      phone: "081211112222",
      province: "Jawa Timur",
      city: "Malang",
      postal: "10220",
      isPrimary: true,
    });
    expect(fake.state.addresses.filter((a) => a.isPrimary)).toHaveLength(1);
    expect($("shop_txt_snackbar")).toHaveTextContent("Alamat tersimpan");
    expect(screen.queryByTestId("addr_form")).toBeNull();
  });

  it("ubah alamat; alamat utama tetap satu", async () => {
    const user = userEvent.setup();
    renderShop("/account");
    await user.click((await screen.findAllByTestId("addr_btn_edit"))[1]);
    expect($("addr_input_street")).toHaveValue("Jl. Merdeka No. 10");
    await user.clear($("addr_input_street"));
    await user.type($("addr_input_street"), "Jl. Sudirman No. 1");
    await user.click($("addr_btn_save"));
    await waitFor(() => expect(fake.state.addresses[1].street).toBe("Jl. Sudirman No. 1"));
    expect(fake.state.addresses.map((a) => a.isPrimary)).toEqual([true, false]);
    await user.click($$("addr_btn_edit")[0]);
    await user.click($("addr_btn_cancel"));
    expect(screen.queryByTestId("addr_form")).toBeNull();
  });

  it("alamat pertama otomatis utama; kosong → teks", async () => {
    resetFake({ addresses: [] });
    const user = userEvent.setup();
    renderShop("/account");
    expect(await screen.findByTestId("addr_txt_empty")).toBeInTheDocument();
    await user.click($("addr_btn_add"));
    expect($("addr_sw_primary")).toHaveAttribute("aria-checked", "true");
    await user.click($("addr_sw_primary"));
    await user.type($("addr_input_phone"), "081234567890");
    await user.type($("addr_spn_city"), "Jakarta Pusat");
    await user.type($("addr_input_street"), "Jl. A");
    await user.type($("addr_input_postal"), "10110");
    await user.click($("addr_btn_save"));
    await waitFor(() => expect(fake.state.addresses).toHaveLength(1));
    expect(fake.state.addresses[0].isPrimary).toBe(true);
  });

  it("Gunakan lokasi saat ini: lokasi uji, di luar area, ditolak, tidak didukung", async () => {
    const getCurrentPosition = vi.fn();
    Object.defineProperty(navigator, "geolocation", { value: { getCurrentPosition }, configurable: true });
    const user = userEvent.setup();
    renderShop("/account");
    await user.click(await screen.findByTestId("addr_btn_add"));
    await user.selectOptions($("addr_spn_province"), "Jawa Barat");

    getCurrentPosition.mockImplementationOnce((ok) => ok({ coords: { latitude: -6.2088, longitude: 106.8228 } }));
    await user.click($("addr_btn_use_location"));
    expect($("addr_txt_location_status")).toHaveTextContent("Lokasi ditemukan: Jakarta Pusat, DKI Jakarta");
    expect($("addr_spn_province")).toHaveValue("DKI Jakarta");
    expect($("addr_spn_city")).toHaveValue("Jakarta Pusat");

    getCurrentPosition.mockImplementationOnce((ok) => ok({ coords: { latitude: 1, longitude: 1 } }));
    await user.click($("addr_btn_use_location"));
    expect($("addr_txt_location_status")).toHaveTextContent("Lokasi di luar area layanan");

    getCurrentPosition.mockImplementationOnce((_ok, fail) => fail(new Error("denied")));
    await user.click($("addr_btn_use_location"));
    expect($("addr_txt_location_status")).toHaveTextContent("Izin lokasi ditolak");

    getCurrentPosition.mockImplementationOnce(() => {});
    await user.click($("addr_btn_use_location"));
    expect($("addr_txt_location_status")).toHaveTextContent("Mencari lokasi…");

    // @ts-expect-error -- simulasi browser tanpa Geolocation API
    delete navigator.geolocation;
    await user.click($("addr_btn_use_location"));
    expect($("addr_txt_location_status")).toHaveTextContent("Browser tidak mendukung lokasi");
  });

  it("/account#alamat menggulir ke daftar alamat", async () => {
    const scroll = vi.fn();
    Element.prototype.scrollIntoView = scroll;
    window.location.hash = "#alamat";
    renderShop("/account");
    await screen.findAllByTestId("addr_card");
    expect(scroll).toHaveBeenCalled();
    window.location.hash = "";
  });
});

describe("Pengaturan (FR-ACC-06, kontrak §5)", () => {
  it("umum & Developer Options tersimpan di browser", async () => {
    const user = userEvent.setup();
    renderShop("/settings");
    await user.selectOptions(await screen.findByTestId("acc_spn_language"), "en");
    await user.selectOptions($("acc_spn_theme"), "dark");
    await user.click($("dev_sw_deterministic"));
    await user.selectOptions($("dev_spn_latency"), "3");
    await user.click($("dev_sw_animations"));
    await user.selectOptions($("dev_spn_error_rate"), "50");
    await user.selectOptions($("dev_spn_va_timeout"), "2m");
    await user.selectOptions($("dev_spn_order_interval"), "manual");
    expect(readPreferences()).toMatchObject({ language: "en", theme: "dark" });
    expect(readDevSettings()).toEqual({
      deterministic: true,
      latency: 3,
      animations: false,
      errorRate: 50,
      vaTimeout: "2m",
      orderInterval: "manual",
      locatorHint: false,
    });
    expect($("dev_sw_deterministic")).toHaveAttribute("aria-checked", "true");
    expect($("dev_sw_deterministic")).toHaveAccessibleName(/Mode deterministik/);
  });

  it("notifikasi: OFF lalu ON meminta izin browser", async () => {
    const requestPermission = vi.fn(async () => "granted");
    vi.stubGlobal("Notification", { permission: "default", requestPermission });
    renderShop("/settings");
    const sw = await screen.findByTestId("acc_sw_notification");
    expect(sw).toHaveAttribute("aria-checked", "true");
    await userEvent.click(sw);
    expect(localStorage.getItem(PREF_KEYS.orderNotifications)).toBe("0");
    expect(requestPermission).not.toHaveBeenCalled();
    await userEvent.click(sw);
    expect(requestPermission).toHaveBeenCalled();
  });

  it("Reset pengaturan dengan dialog konfirmasi", async () => {
    writeDevSettings({ latency: 3 });
    renderShop("/settings");
    await userEvent.click(await screen.findByTestId("dev_btn_reset_settings"));
    await userEvent.click($("dev_dialog_reset_cancel"));
    expect(localStorage.getItem(DEV_KEYS.latency)).toBe("3");
    await userEvent.click($("dev_btn_reset_settings"));
    await userEvent.click($("dev_dialog_reset_confirm"));
    expect(localStorage.getItem(DEV_KEYS.latency)).toBeNull();
    expect($("dev_spn_latency")).toHaveValue("1");
    expect($("shop_txt_snackbar")).toHaveTextContent("Pengaturan dikembalikan ke awal");
  });

  it("Tentang (DEV-04)", async () => {
    renderShop("/settings");
    expect(await screen.findByTestId("dev_txt_uid")).toHaveTextContent("u1");
    expect($("dev_txt_contract_version")).toHaveTextContent("1.3");
    expect($("dev_txt_locator_version")).toHaveTextContent("v1");
    expect($("dev_txt_version")).toHaveTextContent(/^\d+\.\d+\.\d+$/);
  });

  it("URL hook DEV-02 → simpan lalu kembali", async () => {
    const router = renderShop("/settings?deterministic=true&latency=0&animations=false&flaky=0");
    await waitFor(() => expect(router.state.location.pathname).toBe("/"));
    expect(readDevSettings()).toMatchObject({ deterministic: true, latency: 0, animations: false, errorRate: 0 });
  });

  it("URL hook dari halaman lain → kembali ke halaman itu", async () => {
    const router = renderShop("/help");
    await screen.findByTestId("help_frame_faq");
    act(() => void router.navigate("/settings?latency=2"));
    await waitFor(() => expect(router.state.location.pathname).toBe("/help"));
    expect(readDevSettings().latency).toBe(2);
  });
});

describe("Locator Hint Overlay (DEV-03)", () => {
  it("label data-testid tampil hanya saat ON", async () => {
    vi.spyOn(Element.prototype, "getBoundingClientRect").mockReturnValue({ top: 10, left: 10, right: 50, bottom: 30, width: 40, height: 20 } as DOMRect);
    renderShop("/settings");
    await userEvent.click(await screen.findByTestId("dev_sw_locator_hint"));
    await waitFor(() => expect(screen.getAllByText("dev_sw_locator_hint").length).toBeGreaterThan(0));
    fireEvent.scroll(window);
    await userEvent.click($("dev_sw_locator_hint"));
    await waitFor(() => expect(screen.queryByText("shop_tab_home")).toBeNull());
    vi.restoreAllMocks();
  });
});

describe("Pusat Bantuan (FR-HELP-01)", () => {
  it("FAQ di iframe same-origin; postMessage contact → toast; tel: & S&K", async () => {
    renderShop("/help");
    const frame = (await screen.findByTestId("help_frame_faq")) as HTMLIFrameElement;
    expect(frame.getAttribute("src")).toBe("/help/faq.html");
    expect($("help_link_phone")).toHaveAttribute("href", `tel:${CS_PHONE}`);
    expect($("help_link_terms")).toHaveAttribute("target", "_blank");

    const data = { type: "contact" };
    act(() => void window.dispatchEvent(new MessageEvent("message", { data, origin: "https://evil.test", source: frame.contentWindow })));
    act(() => void window.dispatchEvent(new MessageEvent("message", { data: { type: "x" }, origin: location.origin, source: frame.contentWindow })));
    expect(screen.queryByTestId("help_txt_contact_toast")).toBeNull();
    act(() => void window.dispatchEvent(new MessageEvent("message", { data, origin: location.origin, source: frame.contentWindow })));
    expect($("help_txt_contact_toast")).toHaveTextContent("Menghubungkan ke CS PracticeMart…");
  });

  it("widget chat", async () => {
    const user = userEvent.setup();
    renderShop("/help");
    await user.click(await screen.findByTestId("help_btn_chat"));
    expect($("help_btn_chat")).toHaveTextContent("Tutup chat");
    await user.click($("help_btn_chat_send"));
    expect($$("help_item_chat_message")).toHaveLength(1);
    await user.type($("help_input_chat"), "Pesanan saya belum sampai{Enter}");
    expect(within($("help_widget_chat")).getAllByTestId("help_item_chat_message")[1]).toHaveTextContent("Pesanan saya belum sampai");
    await user.click($("help_btn_chat"));
    expect(screen.queryByTestId("help_widget_chat")).toBeNull();
  });
});

it("Syarat & Ketentuan bisa dibuka tanpa login", () => {
  render(<RouterProvider router={createMemoryRouter([{ path: "/", element: <TermsPage /> }])} />);
  expect($("terms_txt_title")).toHaveTextContent("Syarat & Ketentuan");
});
