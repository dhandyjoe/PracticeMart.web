import { useEffect, useState } from "react";
import { Link, useLocation, useParams } from "react-router";
import { useAccount } from "../app/account";
import { useSession } from "../app/session";
import { useSnackbar } from "../components/Snackbar";
import { tid } from "../components/testid";
import { getOrder } from "../data/orderRepository";
import type { OrderDoc } from "../data/schema";
import { formatRupiah } from "../domain/money";
import { VaPanel } from "../features/checkout/VaPanel";
import styles from "../features/checkout/checkout.module.css";
import { Icon } from "../features/shop/icons";
import shop from "../features/shop/shop.module.css";
import NotFoundPage from "./NotFoundPage";

const formatTime = (ms: number) =>
  new Intl.DateTimeFormat("id-ID", { timeZone: "Asia/Jakarta", hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(ms);

// PRD FR-PAYM-13: "Pembayaran Berhasil" / "Pembayaran Gagal" / "Menunggu Pembayaran" + Order ID dengan tombol salin.
export default function CheckoutResultPage() {
  const { orderId } = useParams();
  const failed = (useLocation().state as { failed?: boolean } | null)?.failed;
  const uid = useSession()!.uid;
  const { reloadState } = useAccount();
  const snackbar = useSnackbar();
  const [order, setOrder] = useState<OrderDoc | null>();

  // Saldo, keranjang, dan badge berubah setelah transaksi checkout.
  useEffect(() => {
    void reloadState().catch(() => {});
  }, [reloadState]);

  useEffect(() => {
    if (orderId) getOrder(uid, orderId).then(setOrder, () => setOrder(null));
  }, [uid, orderId]);

  if (!orderId) {
    if (!failed) return <NotFoundPage />;
    return (
      <section className={styles.result}>
        <span className={styles.resultIcon} data-tone="error" aria-hidden="true">
          <Icon name="close" size={34} />
        </span>
        <h1 {...tid("shop_txt_payment_status")}>Pembayaran Gagal</h1>
        <p>Kartu ditolak oleh bank penerbit. Keranjangmu tetap utuh, silakan coba metode lain.</p>
        <Link to="/shop/cart" className={shop.primaryBtn} {...tid("shop_btn_back_to_cart")}>
          Kembali ke keranjang
        </Link>
      </section>
    );
  }
  if (order === undefined) return null;
  if (order === null) return <NotFoundPage />;

  const waiting = order.status === "WAITING";
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(order.id);
      snackbar({ text: "Order ID disalin" });
    } catch {
      snackbar({ text: "Gagal menyalin" });
    }
  };

  return (
    <section className={styles.result}>
      <span className={styles.resultIcon} data-tone={waiting ? "warning" : "success"} aria-hidden="true">
        <Icon name={waiting ? "clock" : "bag"} size={34} />
      </span>
      <h1 {...tid("shop_txt_payment_status")}>{waiting ? "Menunggu Pembayaran" : "Pembayaran Berhasil"}</h1>
      <div className={styles.orderId}>
        <span {...tid("shop_txt_order_id")}>{order.id}</span>
        <button type="button" aria-label="Salin Order ID" {...tid("shop_btn_copy_order_id")} onClick={() => void copy()}>
          Salin
        </button>
      </div>
      <p>
        Total <strong {...tid("shop_txt_result_total")}>{formatRupiah(order.total)}</strong> · {order.methodLabel}
      </p>
      {order.vaDeadline > 0 && waiting && (
        <>
          <p {...tid("shop_txt_va_deadline")}>Bayar sebelum pukul {formatTime(order.vaDeadline)} WIB.</p>
          <VaPanel order={order} onStatus={setOrder} />
        </>
      )}
      <div className={styles.resultActions}>
        {waiting && (
          <Link to={`/shop/order/${order.id}`} className={shop.outlineBtn} {...tid("shop_link_order_detail")}>
            Lihat pesanan
          </Link>
        )}
        <Link to="/" className={shop.primaryBtn} {...tid("shop_btn_continue_shopping")}>
          Lanjut belanja
        </Link>
      </div>
    </section>
  );
}
