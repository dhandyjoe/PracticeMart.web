import { useEffect, useRef, useState } from "react";
import { useAccount } from "../../app/account";
import { Dialog } from "../../components/Dialog";
import { tid } from "../../components/testid";
import { MAX_PIN_FAILURES, PIN_LOCK_MS, verifyPin } from "../../domain/pinHash";
import { Icon } from "../shop/icons";
import styles from "./checkout.module.css";

export const PIN_LENGTH = 6;
const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "del"];

// PRD FR-PAY-06 / FR-PAYM-10: PIN pad 0–9, "Hapus", ketikan keyboard, 6 indikator; salah → "PIN salah. Sisa N percobaan.";
// 3× salah → terkunci 30 dtk. Hitungan & kunci disimpan di Firestore (berlaku juga di Android).
export function PinDialog({ onSuccess, onClose }: { onSuccess: () => void; onClose: () => void }) {
  const { account, update } = useAccount();
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(false);
  const [now, setNow] = useState(Date.now);
  const lockLeft = Math.ceil((account.state.pinLockedUntil - now) / 1000);
  const locked = lockLeft > 0;

  useEffect(() => {
    if (!locked) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [locked]);

  const check = async (value: string) => {
    setChecking(true);
    if (await verifyPin(value, account.state.pinHash)) {
      await update("pinFailures", () => 0);
      onSuccess();
      return;
    }
    const state = await update("pinFailures", (f) => f + 1);
    if (state.pinFailures >= MAX_PIN_FAILURES) {
      const until = Date.now() + PIN_LOCK_MS;
      await update("pinFailures", () => 0);
      await update("pinLockedUntil", () => until);
      setNow(Date.now());
      setError("");
    } else {
      setError(`PIN salah. Sisa ${MAX_PIN_FAILURES - state.pinFailures} percobaan.`);
    }
    setPin("");
    setChecking(false);
  };

  const press = (key: string) => {
    if (locked || checking) return;
    if (key === "del") {
      setPin((p) => p.slice(0, -1));
      return;
    }
    if (pin.length >= PIN_LENGTH) return;
    const next = pin + key;
    setPin(next);
    setError("");
    if (next.length === PIN_LENGTH) void check(next);
  };

  // Ketikan keyboard (angka & Backspace) di mana pun fokusnya di dalam halaman.
  const pressRef = useRef(press);
  useEffect(() => {
    pressRef.current = press;
  });
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (/^\d$/.test(e.key)) pressRef.current(e.key);
      else if (e.key === "Backspace") pressRef.current("del");
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  return (
    <Dialog label="Masukkan PIN PracticePay" testid="pay_dialog_pin" onClose={onClose}>
      <div className={styles.dialogHeadPlain}>
        <h2 {...tid("pay_txt_pin_title")}>Masukkan PIN PracticePay</h2>
        <button type="button" className={styles.closeBtn} aria-label="Tutup" {...tid("pay_btn_pin_close")} onClick={onClose}>
          <Icon name="close" />
        </button>
      </div>
      <div
        className={styles.pinDots}
        role="img"
        aria-label={`${pin.length} dari ${PIN_LENGTH} digit`}
        {...tid("pay_ind_pin")}
      >
        {Array.from({ length: PIN_LENGTH }, (_, i) => (
          <span key={i} className={styles.pinDot} data-filled={i < pin.length} />
        ))}
      </div>
      {locked ? (
        <p role="alert" className={styles.pinError} {...tid("pay_txt_pin_error")}>
          PracticePay terkunci. Coba lagi dalam {lockLeft} detik
        </p>
      ) : (
        error && (
          <p role="alert" className={styles.pinError} {...tid("pay_txt_pin_error")}>
            {error}
          </p>
        )
      )}
      <div className={styles.pad}>
        {KEYS.map((k, i) =>
          k === "" ? (
            <span key={i} />
          ) : k === "del" ? (
            <button key={i} type="button" aria-label="Hapus" {...tid("pay_btn_pin_delete")} disabled={locked || checking} onClick={() => press("del")}>
              <Icon name="chevronLeft" />
            </button>
          ) : (
            <button key={i} type="button" {...tid.list("pay_btn_pin_digit")} disabled={locked || checking} onClick={() => press(k)}>
              {k}
            </button>
          ),
        )}
      </div>
    </Dialog>
  );
}
