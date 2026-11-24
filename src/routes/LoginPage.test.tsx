// @vitest-environment jsdom
import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { REDIRECT_KEY } from "../app/session";
import { AuthError, login } from "../data/authRepository";
import { UNLOCKED } from "../domain/authValidation";
import { loginLockStore } from "../features/auth/loginLockStore";
import LoginPage, { REMEMBER_KEY } from "./LoginPage";

vi.mock("../data/firebase", () => ({ auth: {}, db: {} }));
vi.mock("../data/authRepository", async (orig) => ({
  ...(await orig<typeof import("../data/authRepository")>()),
  login: vi.fn(),
}));

function renderLogin(state?: unknown) {
  const router = createMemoryRouter(
    [
      { path: "/login", element: <LoginPage /> },
      { path: "/", element: <p>HOME</p> },
      { path: "/orders", element: <p>ORDERS</p> },
    ],
    { initialEntries: [{ pathname: "/login", state }] },
  );
  render(<RouterProvider router={router} />);
  return router;
}

const $ = (id: string) => screen.getByTestId(id);
const loginButton = () => $("shop_btn_login") as HTMLButtonElement;

async function fillAndSubmit(email: string, password: string) {
  const user = userEvent.setup();
  await user.clear($("shop_input_email"));
  if (email) await user.type($("shop_input_email"), email);
  if (password) await user.type($("shop_input_password"), password);
  await user.click(loginButton());
}

beforeEach(() => {
  loginLockStore.current = UNLOCKED;
  vi.mocked(login).mockReset();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("LoginPage", () => {
  it("render sesuai desain: id = data-testid, label terhubung", () => {
    renderLogin();
    expect(screen.getByRole("heading", { name: "Masuk" })).toBeInTheDocument();
    for (const id of [
      "shop_input_email",
      "shop_input_password",
      "shop_btn_toggle_password",
      "shop_chk_remember",
      "shop_btn_login",
      "shop_link_register",
    ]) {
      expect($(id)).toHaveAttribute("id", id);
    }
    expect(screen.getByLabelText("Email")).toBe($("shop_input_email"));
    expect(screen.getByLabelText("Password")).toBe($("shop_input_password"));
    expect($("shop_chk_remember")).toBeChecked();
    expect($("shop_link_register")).toHaveAttribute("href", "/register");
    // Lupa Password dihapus dari web (PRD FR-AUTH-13).
    expect(screen.queryByTestId("shop_link_forgot_password")).toBeNull();
  });

  it("field kosong → error inline, tidak memanggil login", async () => {
    renderLogin();
    await fillAndSubmit("", "");
    expect($("shop_txt_email_error")).toHaveTextContent("Email wajib diisi");
    expect($("shop_txt_password_error")).toHaveTextContent("Password wajib diisi");
    expect($("shop_input_email")).toHaveAttribute("aria-invalid", "true");
    expect(login).not.toHaveBeenCalled();
  });

  it("format email salah", async () => {
    renderLogin();
    await fillAndSubmit("rina", "x");
    expect($("shop_txt_email_error")).toHaveTextContent("Format email tidak valid");
    expect(screen.queryByTestId("shop_txt_password_error")).toBeNull();
    expect(login).not.toHaveBeenCalled();
  });

  it("toggle show/hide password mengubah type & aria-label", async () => {
    renderLogin();
    const user = userEvent.setup();
    expect($("shop_input_password")).toHaveAttribute("type", "password");
    expect($("shop_btn_toggle_password")).toHaveAccessibleName("Tampilkan password");
    await user.click($("shop_btn_toggle_password"));
    expect($("shop_input_password")).toHaveAttribute("type", "text");
    expect($("shop_btn_toggle_password")).toHaveAccessibleName("Sembunyikan password");
  });

  it("sukses → Beranda, email diingat", async () => {
    vi.mocked(login).mockResolvedValue();
    const router = renderLogin();
    await fillAndSubmit("rina@mail.com", "Rahasia123");
    expect(login).toHaveBeenCalledWith("rina@mail.com", "Rahasia123");
    expect(await screen.findByText("HOME")).toBeInTheDocument();
    expect(router.state.location.pathname).toBe("/");
    expect(localStorage.getItem(REMEMBER_KEY)).toBe("rina@mail.com");
  });

  it("Enter di field password = submit", async () => {
    vi.mocked(login).mockResolvedValue();
    renderLogin();
    const user = userEvent.setup();
    await user.type($("shop_input_email"), "rina@mail.com");
    await user.type($("shop_input_password"), "x{Enter}");
    expect(login).toHaveBeenCalledOnce();
  });

  it("Ingat saya OFF → email lama dihapus; email tersimpan terisi otomatis", async () => {
    localStorage.setItem(REMEMBER_KEY, "lama@mail.com");
    vi.mocked(login).mockResolvedValue();
    renderLogin();
    expect($("shop_input_email")).toHaveValue("lama@mail.com");
    await userEvent.click($("shop_chk_remember"));
    await fillAndSubmit("rina@mail.com", "x");
    await screen.findByText("HOME");
    expect(localStorage.getItem(REMEMBER_KEY)).toBeNull();
  });

  it("kembali ke URL tujuan dari sessionStorage", async () => {
    sessionStorage.setItem(REDIRECT_KEY, "/orders");
    vi.mocked(login).mockResolvedValue();
    renderLogin();
    await fillAndSubmit("rina@mail.com", "x");
    expect(await screen.findByText("ORDERS")).toBeInTheDocument();
    expect(sessionStorage.getItem(REDIRECT_KEY)).toBeNull();
  });

  it("error non-kredensial tampil di banner tanpa menambah hitungan kunci", async () => {
    vi.mocked(login).mockRejectedValue(new AuthError("network"));
    renderLogin();
    for (let i = 0; i < 3; i++) await fillAndSubmit("rina@mail.com", "x");
    expect($("shop_txt_login_error")).toHaveTextContent("Tidak ada koneksi. Periksa internet lalu coba lagi.");
    expect($("shop_txt_login_error")).toHaveAttribute("role", "alert");
    expect(loginButton()).toBeEnabled();
  });

  it("3× salah → terkunci 30 dtk dengan countdown, lalu terbuka lagi", async () => {
    vi.useFakeTimers({ toFake: ["setInterval", "clearInterval", "Date"] });
    vi.mocked(login).mockRejectedValue(new AuthError("invalid"));
    renderLogin();

    await fillAndSubmit("rina@mail.com", "salah");
    expect($("shop_txt_login_error")).toHaveTextContent("Email atau password salah");
    expect(loginButton()).toBeEnabled();
    await fillAndSubmit("rina@mail.com", "salah");
    await fillAndSubmit("rina@mail.com", "salah");

    expect(loginButton()).toBeDisabled();
    expect(loginButton()).toHaveTextContent("Coba lagi dalam 30 detik");

    // Submit lewat Enter saat terkunci tidak memanggil Firebase.
    fireEvent.submit(loginButton().form!);
    expect(login).toHaveBeenCalledTimes(3);

    act(() => vi.advanceTimersByTime(1_000));
    expect(loginButton()).toHaveTextContent("Coba lagi dalam 29 detik");

    act(() => vi.advanceTimersByTime(29_000));
    expect(loginButton()).toHaveTextContent("Masuk");
    expect(loginButton()).toBeEnabled();
    expect(screen.queryByTestId("shop_txt_login_error")).toBeNull();
  });

  it("kunci bertahan saat halaman dibuka ulang (memori per client)", () => {
    loginLockStore.current = { fails: 0, lockedUntil: Date.now() + 10_000 };
    renderLogin();
    expect(loginButton()).toBeDisabled();
    expect(loginButton()).toHaveTextContent(/Coba lagi dalam (10|9) detik/);
  });

  it("datang dari Register → banner sukses", () => {
    renderLogin({ registered: true });
    expect($("shop_txt_register_success")).toHaveTextContent("Akun berhasil dibuat");
  });
});
