import { useEffect, useState, type ReactNode } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router";
import { useSession } from "../app/session";
import { ConfirmDialog } from "../components/Dialog";
import { useSnackbar } from "../components/Snackbar";
import { tid } from "../components/testid";
import { AccountNav } from "../features/account/AccountNav";
import styles from "../features/account/account.module.css";
import shop from "../features/shop/shop.module.css";
import { applyUrlHooks, hasUrlHooks, resetSettings, writeDevSettings, writePreferences } from "../sim/settings";
import { useSettings } from "../sim/useSettings";

// Versi kontrak bersama (docs/contract.md) & kontrak locator (PRD §12). CI nanti mencocokkan dengan header dokumen.
export const CONTRACT_VERSION = "1.3";
export const LOCATOR_CONTRACT_VERSION = "v1";

function Setting({ id, label, sub, children }: { id: string; label: string; sub?: string; children: ReactNode }) {
  return (
    <div className={styles.setting}>
      <label htmlFor={id} className={styles.settingText}>
        {label}
        {sub && <span>{sub}</span>}
      </label>
      {children}
    </div>
  );
}

function Switch({ id, checked, onChange }: { id: string; checked: boolean; onChange: (v: boolean) => void }) {
  return <button type="button" role="switch" className={styles.switch} aria-checked={checked} {...tid(id)} onClick={() => onChange(!checked)} />;
}

function Select<T extends string | number>({
  id,
  value,
  options,
  onChange,
}: {
  id: string;
  value: T;
  options: [T, string][];
  onChange: (v: T) => void;
}) {
  return (
    <select
      className={styles.select}
      {...tid(id)}
      value={String(value)}
      onChange={(e) => onChange(options.find(([v]) => String(v) === e.target.value)![0])}
    >
      {options.map(([v, label]) => (
        <option key={String(v)} value={String(v)}>
          {label}
        </option>
      ))}
    </select>
  );
}

export default function SettingsPage() {
  const { dev, prefs } = useSettings();
  const uid = useSession()!.uid;
  const navigate = useNavigate();
  const snackbar = useSnackbar();
  const [params] = useSearchParams();
  // "default" = entri pertama riwayat (tidak ada halaman sebelumnya di app).
  const firstEntry = useLocation().key === "default";
  const [confirmReset, setConfirmReset] = useState(false);
  const hooked = hasUrlHooks(params);

  // DEV-02: parameter URL disimpan lalu kembali ke halaman sebelumnya tanpa UI.
  useEffect(() => {
    if (!hooked) return;
    applyUrlHooks(params);
    if (firstEntry) navigate("/", { replace: true });
    else navigate(-1);
  }, [hooked, params, navigate, firstEntry]);
  if (hooked) return null;

  const toggleNotifications = (on: boolean) => {
    writePreferences({ orderNotifications: on });
    if (on && typeof Notification !== "undefined" && Notification.permission === "default") void Notification.requestPermission();
  };

  return (
    <div className={styles.layout}>
      <AccountNav />
      <div className={styles.content}>
        <h1 {...tid("dev_txt_settings_title")}>Pengaturan</h1>

        <section className={styles.group} aria-labelledby="h_general">
          <div className={styles.groupHead}>
            <h2 data-testid="dev_txt_general_title" id="h_general">Umum</h2>
            <span className={styles.scope}>Browser ini</span>
          </div>
          <Setting id="acc_spn_language" label="Bahasa">
            <Select id="acc_spn_language" value={prefs.language} options={[["id", "Indonesia"], ["en", "English"]]} onChange={(language) => writePreferences({ language })} />
          </Setting>
          <Setting id="acc_spn_theme" label="Tema">
            <Select id="acc_spn_theme" value={prefs.theme} options={[["system", "Sistem"], ["light", "Terang"], ["dark", "Gelap"]]} onChange={(theme) => writePreferences({ theme })} />
          </Setting>
          <Setting id="acc_sw_notification" label="Notifikasi pesanan" sub="Notifikasi browser saat pesanan dibuat">
            <Switch id="acc_sw_notification" checked={prefs.orderNotifications} onChange={toggleNotifications} />
          </Setting>
        </section>

        <section className={styles.group} aria-labelledby="h_dev">
          <div className={styles.groupHead}>
            <h2 data-testid="dev_txt_developer_title" id="h_dev">Developer Options</h2>
            <span className={styles.dev}>DEV</span>
            <span className={styles.scope}>Browser ini (localStorage)</span>
          </div>
          <Setting id="dev_sw_deterministic" label="Mode deterministik" sub="Tanggal app 2026-01-15, urutan acak tetap">
            <Switch id="dev_sw_deterministic" checked={dev.deterministic} onChange={(deterministic) => writeDevSettings({ deterministic })} />
          </Setting>
          <Setting id="dev_spn_latency" label="Network latency" sub="Mengalikan delay buatan, bukan jaringan sungguhan">
            <Select id="dev_spn_latency" value={dev.latency} options={[[0, "0×"], [1, "1×"], [2, "2×"], [3, "3×"]]} onChange={(latency) => writeDevSettings({ latency })} />
          </Setting>
          <Setting id="dev_sw_animations" label="Animasi">
            <Switch id="dev_sw_animations" checked={dev.animations} onChange={(animations) => writeDevSettings({ animations })} />
          </Setting>
          <Setting id="dev_spn_error_rate" label="Peluang error server" sub="Untuk latihan retry">
            <Select id="dev_spn_error_rate" value={dev.errorRate} options={[[0, "0%"], [30, "30%"], [50, "50%"]]} onChange={(errorRate) => writeDevSettings({ errorRate })} />
          </Setting>
          <Setting id="dev_spn_va_timeout" label="Batas waktu VA">
            <Select id="dev_spn_va_timeout" value={dev.vaTimeout} options={[["30s", "30 detik"], ["2m", "2 menit"], ["15m", "15 menit"]]} onChange={(vaTimeout) => writeDevSettings({ vaTimeout })} />
          </Setting>
          <Setting id="dev_spn_order_interval" label="Update status pesanan">
            <Select
              id="dev_spn_order_interval"
              value={dev.orderInterval}
              options={[["3", "3 detik"], ["10", "10 detik"], ["30", "30 detik"], ["manual", "Manual"]]}
              onChange={(orderInterval) => writeDevSettings({ orderInterval })}
            />
          </Setting>
          <Setting id="dev_sw_locator_hint" label="Locator Hint Overlay" sub="Tampilkan data-testid di atas elemen">
            <Switch id="dev_sw_locator_hint" checked={dev.locatorHint} onChange={(locatorHint) => writeDevSettings({ locatorHint })} />
          </Setting>
          <div className={styles.groupBody}>
            <span>Hanya mengubah pengaturan di browser ini; data akun di cloud tidak tersentuh.</span>
            <button type="button" className={shop.outlineBtn} style={{ alignSelf: "flex-start" }} {...tid("dev_btn_reset_settings")} onClick={() => setConfirmReset(true)}>
              Reset pengaturan
            </button>
          </div>
        </section>

        <section className={styles.group} aria-labelledby="h_about">
          <div className={styles.groupHead}>
            <h2 data-testid="dev_txt_about_title" id="h_about">Tentang</h2>
          </div>
          <dl className={styles.about}>
            <dt>Versi web</dt>
            <dd {...tid("dev_txt_version")}>{__APP_VERSION__}</dd>
            <dt>Commit</dt>
            <dd {...tid("dev_txt_commit")}>{__COMMIT_SHA__}</dd>
            <dt>Tanggal build</dt>
            <dd {...tid("dev_txt_build_date")}>{__BUILD_DATE__}</dd>
            <dt>Kontrak bersama</dt>
            <dd {...tid("dev_txt_contract_version")}>{CONTRACT_VERSION}</dd>
            <dt>Kontrak locator</dt>
            <dd {...tid("dev_txt_locator_version")}>{LOCATOR_CONTRACT_VERSION}</dd>
            <dt>Project Firebase</dt>
            <dd {...tid("dev_txt_firebase_project")}>{import.meta.env.VITE_FIREBASE_PROJECT_ID ?? "-"}</dd>
            <dt>ID akun</dt>
            <dd {...tid("dev_txt_uid")}>{uid}</dd>
          </dl>
        </section>
      </div>

      {confirmReset && (
        <ConfirmDialog
          title="Reset pengaturan?"
          message="Bahasa, tema, notifikasi, dan Developer Options di browser ini kembali ke awal. Data akun tidak berubah."
          confirmLabel="Reset"
          testid="dev_dialog_reset"
          danger
          onCancel={() => setConfirmReset(false)}
          onConfirm={() => {
            setConfirmReset(false);
            resetSettings();
            snackbar({ text: "Pengaturan dikembalikan ke awal" });
          }}
        />
      )}
    </div>
  );
}
