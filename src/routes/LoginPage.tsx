import { useEffect, useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { REDIRECT_KEY } from "../app/session";
import { BrandHeader } from "../components/BrandHeader";
import { tid } from "../components/testid";
import { login, toAuthError } from "../data/authRepository";
import {
  loginErrors,
  lockSecondsLeft,
  recordLoginFailure,
  UNLOCKED,
  type FieldErrors,
} from "../domain/authValidation";
import styles from "../features/auth/auth.module.css";
import { AlertIcon, CheckIcon, EyeIcon } from "../features/auth/icons";
import { loginLockStore } from "../features/auth/loginLockStore";

// FR-AUTH-10: "Ingat saya" menyimpan email di localStorage.
export const REMEMBER_KEY = "pm.rememberEmail";


export default function LoginPage() {
  const navigate = useNavigate();
  const registered = (useLocation().state as { registered?: boolean } | null)?.registered;
  const [email, setEmail] = useState(() => localStorage.getItem(REMEMBER_KEY) ?? "");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [banner, setBanner] = useState("");
  const [busy, setBusy] = useState(false);
  const [lock, setLock] = useState(loginLockStore.current);
  const [now, setNow] = useState(Date.now);

  useEffect(() => {
    loginLockStore.current = lock;
    if (!lock.lockedUntil) return;
    const timer = setInterval(() => {
      const t = Date.now();
      setNow(t);
      if (t >= lock.lockedUntil) {
        setLock(UNLOCKED);
        setBanner("");
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [lock]);

  const secondsLeft = lockSecondsLeft(lock, now);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (secondsLeft > 0 || busy) return;
    const fieldErrors = loginErrors(email, password);
    setErrors(fieldErrors);
    setBanner("");
    if (fieldErrors.email || fieldErrors.password) return;

    setBusy(true);
    try {
      await login(email, password);
      if (remember) localStorage.setItem(REMEMBER_KEY, email.trim());
      else localStorage.removeItem(REMEMBER_KEY);
      setLock(UNLOCKED);
      const to = sessionStorage.getItem(REDIRECT_KEY) ?? "/";
      sessionStorage.removeItem(REDIRECT_KEY);
      navigate(to, { replace: true });
    } catch (err) {
      const { kind, message } = toAuthError(err);
      setBanner(message);
      if (kind === "invalid") {
        const t = Date.now();
        setNow(t);
        setLock((l) => recordLoginFailure(l, t));
      }
      setBusy(false);
    }
  }

  return (
    <div className={styles.page}>
      <BrandHeader />
      <main className={styles.main}>
        <section className={styles.brand}>
          <h1 {...tid("shop_txt_login_brand_title")} className={styles.brandTitle}>Belanja dan bayar dari mana saja.</h1>
          <p className={styles.brandText}>
            Satu akun untuk PracticeMart di web dan aplikasi Android. Keranjang, pesanan, dan saldo PracticePay
            selalu sama di semua perangkat.
          </p>
          <ul {...tid("shop_list_login_chips")} className={styles.chips}>
            <li className={styles.chip}>Keranjang tersimpan</li>
            <li className={styles.chip}>PracticePay</li>
            <li className={styles.chip}>Lacak pesanan</li>
          </ul>
        </section>

        <section className={styles.card}>
          <div className={styles.head}>
            <h2 {...tid("shop_txt_login_title")} className={styles.title}>Masuk</h2>
            <p className={styles.subtitle}>
              Belum punya akun? <Link to="/register" {...tid("shop_link_register")}>Daftar</Link>
            </p>
          </div>

          {registered && !banner && (
            <div role="status" className={styles.success} {...tid("shop_txt_register_success")}>
              <CheckIcon />
              Akun berhasil dibuat
            </div>
          )}
          {banner && (
            <div role="alert" className={styles.alert} {...tid("shop_txt_login_error")}>
              <AlertIcon />
              {banner}
            </div>
          )}

          <form {...tid("shop_form_login")} className={styles.form} onSubmit={onSubmit} noValidate>
            <div className={styles.field}>
              <label htmlFor="shop_input_email" className={styles.label}>Email</label>
              <input
                {...tid("shop_input_email")}
                className={styles.input}
                type="email"
                autoComplete="email"
                placeholder="nama@contoh.id"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                aria-invalid={!!errors.email}
                aria-describedby={errors.email ? "shop_txt_email_error" : undefined}
              />
              {errors.email && (
                <span className={styles.fieldError} {...tid("shop_txt_email_error")}>{errors.email}</span>
              )}
            </div>

            <div className={styles.field}>
              <label htmlFor="shop_input_password" className={styles.label}>Password</label>
              <div className={styles.passwordWrap}>
                <input
                  {...tid("shop_input_password")}
                  className={styles.input}
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  aria-invalid={!!errors.password}
                  aria-describedby={errors.password ? "shop_txt_password_error" : undefined}
                />
                <button
                  type="button"
                  className={styles.eye}
                  {...tid("shop_btn_toggle_password")}
                  aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
                  onClick={() => setShowPassword((v) => !v)}
                >
                  <EyeIcon />
                </button>
              </div>
              {errors.password && (
                <span className={styles.fieldError} {...tid("shop_txt_password_error")}>{errors.password}</span>
              )}
            </div>

            <label className={styles.check}>
              <input
                type="checkbox"
                {...tid("shop_chk_remember")}
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
              />
              Ingat saya di perangkat ini
            </label>

            <button
              type="submit"
              className={styles.primary}
              {...tid("shop_btn_login")}
              disabled={secondsLeft > 0 || busy}
              aria-busy={busy}
            >
              {secondsLeft > 0 ? `Coba lagi dalam ${secondsLeft} detik` : "Masuk"}
            </button>
          </form>
        </section>
      </main>
      <footer className={styles.footer}>© 2026 PracticeMart</footer>
    </div>
  );
}
