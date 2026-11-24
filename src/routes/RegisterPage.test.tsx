// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthError, register } from "../data/authRepository";
import LoginPage from "./LoginPage";
import RegisterPage from "./RegisterPage";

vi.mock("../data/firebase", () => ({ auth: {}, db: {} }));
vi.mock("../data/authRepository", async (orig) => ({
  ...(await orig<typeof import("../data/authRepository")>()),
  register: vi.fn(),
}));

function renderRegister() {
  const router = createMemoryRouter(
    [
      { path: "/register", element: <RegisterPage /> },
      { path: "/login", element: <LoginPage /> },
    ],
    { initialEntries: ["/register"] },
  );
  render(<RouterProvider router={router} />);
  return router;
}

const $ = (id: string) => screen.getByTestId(id);
const submit = () => $("shop_btn_register") as HTMLButtonElement;

async function fillValid(overrides: Partial<Record<"name" | "email" | "password" | "confirm", string>> = {}) {
  const v = { name: "Rina Wulandari", email: "rina@mail.com", password: "abcd1234", confirm: "abcd1234", ...overrides };
  const user = userEvent.setup();
  await user.type($("shop_input_reg_name"), v.name);
  await user.type($("shop_input_reg_email"), v.email);
  await user.type($("shop_input_reg_password"), v.password);
  await user.type($("shop_input_reg_confirm"), v.confirm);
  await user.click($("shop_chk_terms"));
  return user;
}

beforeEach(() => {
  vi.mocked(register).mockReset();
});

describe("RegisterPage", () => {
  it("render sesuai desain: id = data-testid, S&K tab baru, Daftar disabled", () => {
    renderRegister();
    expect(screen.getByRole("heading", { name: "Buat akun" })).toBeInTheDocument();
    for (const id of [
      "shop_input_reg_name",
      "shop_input_reg_email",
      "shop_input_reg_password",
      "shop_input_reg_confirm",
      "shop_chk_terms",
      "shop_link_terms",
      "shop_btn_register",
      "shop_link_login",
      "shop_txt_password_strength",
      "shop_txt_password_helper",
    ]) {
      expect($(id)).toHaveAttribute("id", id);
    }
    expect(screen.getByLabelText("Nama lengkap")).toBe($("shop_input_reg_name"));
    expect($("shop_txt_password_helper")).toHaveTextContent("Minimal 8 karakter, berisi huruf dan angka");
    expect($("shop_link_terms")).toHaveAttribute("href", "/terms");
    expect($("shop_link_terms")).toHaveAttribute("target", "_blank");
    expect($("shop_chk_terms")).not.toBeChecked();
    expect(submit()).toBeDisabled();
  });

  it("indikator kekuatan password Lemah/Sedang/Kuat", async () => {
    renderRegister();
    const user = userEvent.setup();
    const strength = $("shop_txt_password_strength");
    expect(strength).toHaveTextContent("");
    await user.type($("shop_input_reg_password"), "abc");
    expect(strength).toHaveTextContent("Lemah");
    await user.type($("shop_input_reg_password"), "d1234");
    expect(strength).toHaveTextContent("Sedang");
    await user.type($("shop_input_reg_password"), "5678!");
    expect(strength).toHaveTextContent("Kuat");
  });

  it("format email divalidasi saat blur", async () => {
    renderRegister();
    const user = userEvent.setup();
    await user.type($("shop_input_reg_email"), "rina");
    expect(screen.queryByTestId("shop_txt_reg_email_error")).toBeNull();
    await user.tab();
    expect($("shop_txt_reg_email_error")).toHaveTextContent("Format email tidak valid");
    expect($("shop_input_reg_email")).toHaveAttribute("aria-invalid", "true");
  });

  it("konfirmasi password beda → error saat blur, Daftar disabled", async () => {
    renderRegister();
    const user = await fillValid({ confirm: "abcd9999" });
    await user.click($("shop_input_reg_confirm"));
    await user.tab();
    expect($("shop_txt_reg_confirm_error")).toHaveTextContent("Konfirmasi password tidak sama");
    expect(submit()).toBeDisabled();
  });

  it("password lemah → Daftar disabled", async () => {
    renderRegister();
    await fillValid({ password: "abcdefgh", confirm: "abcdefgh" });
    expect(submit()).toBeDisabled();
  });

  it("Daftar baru aktif setelah S&K dicentang", async () => {
    renderRegister();
    const user = await fillValid();
    expect(submit()).toBeEnabled();
    await user.click($("shop_chk_terms"));
    expect(submit()).toBeDisabled();
  });

  it("sukses → halaman Login dengan banner \"Akun berhasil dibuat\"", async () => {
    vi.mocked(register).mockResolvedValue();
    const router = renderRegister();
    const user = await fillValid();
    await user.click(submit());
    expect(register).toHaveBeenCalledWith("Rina Wulandari", "rina@mail.com", "abcd1234");
    expect(await screen.findByTestId("shop_txt_register_success")).toHaveTextContent("Akun berhasil dibuat");
    expect(router.state.location.pathname).toBe("/login");
  });

  it("email sudah terdaftar → error inline; hilang saat email diubah", async () => {
    vi.mocked(register).mockRejectedValue(new AuthError("emailInUse"));
    renderRegister();
    const user = await fillValid();
    await user.click(submit());
    expect(await screen.findByTestId("shop_txt_reg_email_error")).toHaveTextContent("Email sudah terdaftar");
    expect(submit()).toBeDisabled();
    await user.type($("shop_input_reg_email"), "x");
    expect(screen.queryByTestId("shop_txt_reg_email_error")).toBeNull();
    expect(submit()).toBeEnabled();
  });

  it("error lain → banner role=alert", async () => {
    vi.mocked(register).mockRejectedValue(new AuthError("tooMany"));
    renderRegister();
    const user = await fillValid();
    await user.click(submit());
    const banner = await screen.findByTestId("shop_txt_register_error");
    expect(banner).toHaveTextContent("Terlalu banyak percobaan. Coba lagi nanti.");
    expect(banner).toHaveAttribute("role", "alert");
    expect(submit()).toBeEnabled();
  });
});
