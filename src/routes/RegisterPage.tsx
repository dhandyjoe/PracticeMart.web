import { useState, type ChangeEvent, type FormEvent } from "react";
import { Link, useNavigate } from "react-router";
import { BrandHeader } from "../components/BrandHeader";
import { tid } from "../components/testid";
import { register, toAuthError } from "../data/authRepository";
import { isEmail, isRegisterValid, passwordStrength, STRENGTH_LABEL } from "../domain/authValidation";
import styles from "../features/auth/auth.module.css";
import { AlertIcon } from "../features/auth/icons";

export default function RegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "", confirm: "", agree: false });
  // design.md §5: error inline muncul setelah field kehilangan fokus.
  const [touched, setTouched] = useState({ email: false, confirm: false });
  const [emailTaken, setEmailTaken] = useState(false);
  const [banner, setBanner] = useState("");
  const [busy, setBusy] = useState(false);

  const set = (key: keyof typeof form) => (e: ChangeEvent<HTMLInputElement>) => {
    const value = key === "agree" ? e.target.checked : e.target.value;
    setForm((f) => ({ ...f, [key]: value }));
    if (key === "email") setEmailTaken(false);
  };
  const blur = (key: keyof typeof touched) => () => setTouched((t) => ({ ...t, [key]: true }));

  const strength = passwordStrength(form.password);
  const emailError =
    touched.email && form.email && !isEmail(form.email)
      ? "Format email tidak valid"
      : emailTaken
        ? "Email sudah terdaftar"
        : "";
  const confirmError =
    touched.confirm && form.confirm && form.confirm !== form.password ? "Konfirmasi password tidak sama" : "";
  const valid = isRegisterValid(form) && !emailTaken;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!valid || busy) return;
    setBusy(true);
    setBanner("");
    try {
      await register(form.name, form.email, form.password);
      navigate("/login", { replace: true, state: { registered: true } });
    } catch (err) {
      const { kind, message } = toAuthError(err);
      if (kind === "emailInUse") setEmailTaken(true);
      else setBanner(message);
      setBusy(false);
    }
  }

  return (
    <div className={styles.page}>
      <BrandHeader />
      <main className={styles.mainNarrow}>
        <section className={styles.card}>
          <div className={styles.head}>
            <h1 {...tid("shop_txt_register_title")} className={styles.title}>Buat akun</h1>
            <p className={styles.subtitle}>
              Sudah punya akun? <Link to="/login" {...tid("shop_link_login")}>Masuk</Link>
            </p>
          </div>

          {banner && (
            <div role="alert" className={styles.alert} {...tid("shop_txt_register_error")}>
              <AlertIcon />
              {banner}
            </div>
          )}

          <form {...tid("shop_form_register")} className={styles.form} onSubmit={onSubmit} noValidate>
            <div className={styles.field}>
              <label htmlFor="shop_input_reg_name" className={styles.label}>Nama lengkap</label>
              <input
                {...tid("shop_input_reg_name")}
                className={styles.input}
                type="text"
                autoComplete="name"
                value={form.name}
                onChange={set("name")}
              />
            </div>

            <div className={styles.field}>
              <label htmlFor="shop_input_reg_email" className={styles.label}>Email</label>
              <input
                {...tid("shop_input_reg_email")}
                className={styles.input}
                type="email"
                autoComplete="email"
                value={form.email}
                onChange={set("email")}
                onBlur={blur("email")}
                aria-invalid={!!emailError}
                aria-describedby={emailError ? "shop_txt_reg_email_error" : undefined}
              />
              {emailError && (
                <span className={styles.fieldError} {...tid("shop_txt_reg_email_error")}>{emailError}</span>
              )}
            </div>

            <div className={styles.grid2}>
              <div className={styles.field}>
                <label htmlFor="shop_input_reg_password" className={styles.label}>Password</label>
                <input
                  {...tid("shop_input_reg_password")}
                  className={styles.input}
                  type="password"
                  autoComplete="new-password"
                  value={form.password}
                  onChange={set("password")}
                  aria-describedby="shop_txt_password_helper"
                />
                <div className={styles.strength} data-level={strength}>
                  <div className={styles.bars} aria-hidden="true">
                    {[1, 2, 3].map((i) => (
                      <span key={i} className={styles.bar} data-on={i <= strength} />
                    ))}
                  </div>
                  <span className={styles.strengthLabel} {...tid("shop_txt_password_strength")}>
                    {STRENGTH_LABEL[strength]}
                  </span>
                </div>
              </div>

              <div className={styles.field}>
                <label htmlFor="shop_input_reg_confirm" className={styles.label}>Konfirmasi password</label>
                <input
                  {...tid("shop_input_reg_confirm")}
                  className={styles.input}
                  type="password"
                  autoComplete="new-password"
                  value={form.confirm}
                  onChange={set("confirm")}
                  onBlur={blur("confirm")}
                  aria-invalid={!!confirmError}
                  aria-describedby={confirmError ? "shop_txt_reg_confirm_error" : undefined}
                />
                {confirmError && (
                  <span className={styles.fieldError} {...tid("shop_txt_reg_confirm_error")}>{confirmError}</span>
                )}
              </div>
            </div>
            <span className={styles.helper} {...tid("shop_txt_password_helper")}>
              Minimal 8 karakter, berisi huruf dan angka
            </span>

            <label className={styles.check}>
              <input type="checkbox" {...tid("shop_chk_terms")} checked={form.agree} onChange={set("agree")} />
              <span>
                Saya menyetujui{" "}
                <a href="/terms" target="_blank" rel="noopener" {...tid("shop_link_terms")}>
                  Syarat &amp; Ketentuan
                </a>{" "}
                PracticeMart
              </span>
            </label>

            <button
              type="submit"
              className={styles.primary}
              {...tid("shop_btn_register")}
              disabled={!valid || busy}
              aria-busy={busy}
            >
              Daftar
            </button>
          </form>
        </section>
      </main>
    </div>
  );
}
