import { useEffect, useRef } from "react";
import { Dialog } from "../../components/Dialog";
import { tid } from "../../components/testid";
import { Icon } from "../shop/icons";
import styles from "./checkout.module.css";

// Architecture §10.1: halaman OTP ada di site bank (origin lain), hasilnya lewat postMessage.
export const BANK_ORIGIN = import.meta.env.VITE_BANK_ORIGIN ?? "http://localhost:5174";

export type ThreeDSResult = "success" | "cancelled";

export function ThreeDSDialog({ amount, last4, onResult }: { amount: number; last4: string; onResult: (r: ThreeDSResult) => void }) {
  const frame = useRef<HTMLIFrameElement>(null);
  const handler = useRef(onResult);
  useEffect(() => {
    handler.current = onResult;
  });

  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      // Tolak pesan dari origin/jendela lain (architecture §10.1).
      if (e.origin !== BANK_ORIGIN || e.source !== frame.current?.contentWindow) return;
      const data = e.data as { type?: string; status?: string } | null;
      if (data?.type === "3ds-result" && (data.status === "success" || data.status === "cancelled")) {
        handler.current(data.status);
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  // Hanya 4 digit terakhir yang dikirim ke bank, bukan nomor kartu lengkap.
  const src = `${BANK_ORIGIN}/3ds.html?${new URLSearchParams({ parent: location.origin, amount: String(amount), card: last4 })}`;

  return (
    <Dialog label="Verifikasi kartu" testid="shop_modal_3ds" wide persistent onClose={() => onResult("cancelled")}>
      <div className={styles.dialogHead}>
        <h2 {...tid("shop_txt_3ds_title")}>Verifikasi kartu</h2>
        <button type="button" className={styles.closeBtn} aria-label="Tutup" {...tid("shop_btn_3ds_close")} onClick={() => onResult("cancelled")}>
          <Icon name="close" />
        </button>
      </div>
      <p className={styles.frameSource}>Halaman bank penerbit kartu</p>
      <iframe ref={frame} className={styles.frame} title="3D Secure PracticeBank" src={src} {...tid("shop_frame_3ds")} />
    </Dialog>
  );
}
