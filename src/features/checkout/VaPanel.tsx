import { useEffect, useState } from "react";
import { useSession } from "../../app/session";
import { useSnackbar } from "../../components/Snackbar";
import { tid } from "../../components/testid";
import { getOrder } from "../../data/orderRepository";
import type { OrderDoc } from "../../data/schema";
import { vaBankOf, vaNumber } from "../../domain/payment";
import { serverFails } from "../../sim/settings";
import { errorText } from "../pay/TransferDialog";
import shop from "../shop/shop.module.css";
import styles from "./checkout.module.css";
import { useOnline } from "./useOnline";

const STEPS: [string, string[]][] = [
  ["ATM", ["Masukkan kartu ATM dan PIN", "Pilih Transfer → Virtual Account", "Masukkan nomor VA di atas", "Periksa nominal lalu konfirmasi"]],
  ["Mobile banking", ["Buka aplikasi mobile banking", "Pilih Bayar → Virtual Account", "Tempel nomor VA", "Konfirmasi dengan PIN"]],
  ["Internet banking", ["Masuk ke internet banking", "Pilih Pembayaran → Virtual Account", "Masukkan nomor VA", "Konfirmasi dengan token"]],
];

const mmss = (ms: number) => {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
};

// PRD FR-PAYM-08/09: nomor VA + Salin, countdown, cara bayar, "Cek Status" yang bisa gagal sesuai "Peluang error server".
export function VaPanel({ order, onStatus }: { order: OrderDoc; onStatus: (order: OrderDoc) => void }) {
  const uid = useSession()!.uid;
  const snackbar = useSnackbar();
  const online = useOnline();
  const [now, setNow] = useState(Date.now);
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(false);
  const bank = vaBankOf(order.methodLabel);
  const number = vaNumber(order.id, bank);
  const left = order.vaDeadline - now;
  const running = left > 0;

  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [running]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(number.replace(/ /g, ""));
      snackbar({ text: "Nomor VA disalin" });
    } catch {
      snackbar({ text: "Gagal menyalin" });
    }
  };

  const check = async () => {
    setError("");
    setChecking(true);
    try {
      if (serverFails()) throw new Error("server");
      const fresh = await getOrder(uid, order.id);
      if (!fresh) throw new Error("gone");
      if (fresh.status === "WAITING") snackbar({ text: "Pembayaran belum diterima" });
      onStatus(fresh);
    } catch (e) {
      setError(errorText(e));
    }
    setChecking(false);
  };

  return (
    <div className={styles.va} {...tid("shop_panel_va")}>
      <span className={styles.label}>Nomor Virtual Account {bank}</span>
      <div className={styles.orderId}>
        <span {...tid("shop_txt_va_number")}>{number}</span>
        <button type="button" aria-label="Salin nomor VA" {...tid("shop_btn_copy_va")} onClick={() => void copy()}>
          Salin
        </button>
      </div>
      <p>
        Sisa waktu bayar{" "}
        <strong role="timer" className={styles.mono} {...tid("shop_txt_va_countdown")}>
          {mmss(left)}
        </strong>
      </p>
      {STEPS.map(([title, steps]) => (
        <details key={title} className={styles.vaHow} {...tid.list("shop_item_va_howto")}>
          <summary>Cara bayar lewat {title}</summary>
          <ol {...tid.list("shop_list_va_steps")}>
            {steps.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ol>
        </details>
      ))}
      {error && (
        <p role="alert" className={styles.error} {...tid("shop_txt_va_error")}>
          {error}
        </p>
      )}
      <button type="button" className={shop.outlineBtn} {...tid("shop_btn_va_check_status")} disabled={!online || checking} onClick={() => void check()}>
        Cek Status
      </button>
    </div>
  );
}
