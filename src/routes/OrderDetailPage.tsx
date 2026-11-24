import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import { useAccount } from "../app/account";
import { useSession } from "../app/session";
import { Dialog } from "../components/Dialog";
import { useSnackbar } from "../components/Snackbar";
import { tid } from "../components/testid";
import { productById, variantKey } from "../data/catalog";
import { advanceOrder, cancelOrder, CheckoutError, getOrder } from "../data/orderRepository";
import type { OrderDoc } from "../data/schema";
import { formatClock, formatStamp } from "../domain/dateFormat";
import { formatRupiah } from "../domain/money";
import { CANCEL_REASONS, CANNOT_CANCEL_SHIPPED, canCancel, FLOW, nextStatus, STATUS_LABEL, VA_EXPIRED_REASON } from "../domain/orderRules";
import { useOnline } from "../features/checkout/useOnline";
import { VaPanel } from "../features/checkout/VaPanel";
import { Icon } from "../features/shop/icons";
import { ProductImage } from "../features/shop/ProductImage";
import shop from "../features/shop/shop.module.css";
import styles from "../features/orders/orders.module.css";
import { useSettings } from "../sim/useSettings";
import NotFoundPage from "./NotFoundPage";

const SUBTEXT: Partial<Record<(typeof FLOW)[number], string>> = { PACKED: "Sedang diproses penjual", SHIPPED: "Dalam perjalanan", DONE: "Pesanan diterima" };

function CancelDialog({ onConfirm, onClose }: { onConfirm: (reason: string) => Promise<void>; onClose: () => void }) {
  const [reason, setReason] = useState("");
  const [other, setOther] = useState("");
  const [busy, setBusy] = useState(false);
  // FR-ORD-03: tombol disabled sampai alasan dipilih; "Lainnya" meminta teks.
  const final = reason === "Lainnya" ? other.trim() : reason;
  return (
    <Dialog label="Batalkan pesanan" testid="shop_modal_cancel" onClose={onClose}>
      <h2 {...tid("shop_txt_cancel_order_title")} style={{ margin: 0, fontSize: 20 }}>Batalkan pesanan?</h2>
      <fieldset className={styles.reasons}>
        <legend>Pilih alasan</legend>
        {CANCEL_REASONS.map((r) => (
          <label key={r}>
            <input type="radio" name="shop_rdo_cancel_reason" {...tid.list("shop_rdo_cancel_reason")} checked={reason === r} onChange={() => setReason(r)} />
            {r}
          </label>
        ))}
      </fieldset>
      {reason === "Lainnya" && (
        <input
          className={styles.reasonText}
          aria-label="Alasan lainnya"
          placeholder="Tulis alasanmu"
          maxLength={100}
          {...tid("shop_input_cancel_other")}
          value={other}
          onChange={(e) => setOther(e.target.value)}
        />
      )}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
        <button type="button" className={shop.outlineBtn} {...tid("shop_btn_cancel_back")} onClick={onClose}>
          Kembali
        </button>
        <button
          type="button"
          className={styles.cancelBtn}
          {...tid("shop_btn_confirm_cancel")}
          disabled={!final || busy}
          onClick={async () => {
            setBusy(true);
            await onConfirm(final);
            setBusy(false);
          }}
        >
          Batalkan
        </button>
      </div>
    </Dialog>
  );
}

// PRD FR-ORD-02…05 / design W-ORD-02. Status maju otomatis tiap interval (Developer Options) atau manual.
export default function OrderDetailPage() {
  const { orderId = "" } = useParams();
  const uid = useSession()!.uid;
  const { reloadState, refreshStock } = useAccount();
  const snackbar = useSnackbar();
  const online = useOnline();
  const { dev } = useSettings();
  const [order, setOrder] = useState<OrderDoc | null>();
  const [error, setError] = useState("");
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    getOrder(uid, orderId).then(setOrder, () => setOrder(null));
  }, [uid, orderId]);

  // Saldo (cashback) & stok (batal) ikut berubah setelah transaksi status.
  const apply = useCallback(
    async (run: () => Promise<OrderDoc>) => {
      setError("");
      try {
        setOrder(await run());
        await Promise.all([reloadState(), refreshStock()]).catch(() => {});
      } catch (e) {
        setError(e instanceof CheckoutError ? e.message : navigator.onLine ? "Gagal memuat, coba lagi" : "Tidak ada koneksi");
      }
    },
    [reloadState, refreshStock],
  );

  const status = order?.status;
  const advance = useCallback(
    () => status && apply(() => advanceOrder(uid, orderId, status)),
    [apply, uid, orderId, status],
  );

  // FR-ORD-02: maju otomatis (Menunggu Pembayaran menunggu konfirmasi bayar; Manual = tombol).
  const auto = dev.orderInterval !== "manual" && status && status !== "WAITING" && nextStatus(status) !== null;
  useEffect(() => {
    if (!auto || !online) return;
    const t = setInterval(() => void advance(), Number(dev.orderInterval) * 1000);
    return () => clearInterval(t);
  }, [auto, online, advance, dev.orderInterval]);

  // FR-PAYM-08: VA melewati batas bayar → Dibatalkan.
  const deadline = order && order.status === "WAITING" ? order.vaDeadline : 0;
  useEffect(() => {
    if (!deadline || !online) return;
    const expire = () => void apply(() => cancelOrder(uid, orderId, VA_EXPIRED_REASON));
    if (Date.now() >= deadline) return expire();
    const t = setTimeout(expire, deadline - Date.now());
    return () => clearTimeout(t);
  }, [deadline, online, apply, uid, orderId]);

  if (order === undefined) return null;
  if (order === null) return <NotFoundPage />;

  const cancelled = order.status === "CANCELLED";
  const subtotal = order.lines.reduce((n, l) => n + (productById(l.productId)?.price ?? 0) * l.qty, 0);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(order.id);
      snackbar({ text: "Order ID disalin" });
    } catch {
      snackbar({ text: "Gagal menyalin" });
    }
  };
  const doCancel = async (reason: string) => {
    await apply(() => cancelOrder(uid, order.id, reason));
    setCancelling(false);
  };

  return (
    <div className={shop.pageTight}>
      <nav {...tid("shop_nav_breadcrumb")} aria-label="Breadcrumb" className={shop.breadcrumb}>
        <ol {...tid("shop_list_breadcrumb")}>
          <li>
            <Link to="/shop/orders" {...tid("shop_link_back_to_orders")}>
              Pesanan Saya
            </Link>
          </li>
          <li aria-current="page">Detail pesanan</li>
        </ol>
      </nav>

      {error && (
        <p role="alert" className={shop.inlineError} {...tid("shop_txt_order_error")}>
          {error}
        </p>
      )}

      <section className={styles.hero}>
        <div className={styles.heroId}>
          <small>ORDER ID</small>
          <span className={styles.mono}>
            <span {...tid("shop_txt_order_id")}>{order.id}</span>
            <button type="button" className={styles.copyBtn} aria-label="Salin Order ID" {...tid("shop_btn_copy_order_id")} onClick={() => void copy()}>
              <Icon name="copy" size={16} />
            </button>
          </span>
        </div>
        <div className={styles.heroMeta}>
          <span>{formatStamp(order.createdAt)}</span>
          <span>{order.methodLabel}</span>
        </div>
        <span className={styles.heroTotal} {...tid("shop_txt_order_total")}>
          {formatRupiah(order.total)}
        </span>
      </section>

      <section className={styles.card} aria-labelledby="shop_txt_order_status_head">
        <div className={styles.statusHead}>
          <h2 {...tid("shop_txt_order_status_head")}>
            Status pesanan: <span {...tid("shop_txt_order_status")}>{STATUS_LABEL[order.status]}</span>
          </h2>
          {order.status === "WAITING" && (
            <button type="button" className={shop.primaryBtn} {...tid("shop_btn_confirm_paid")} disabled={!online} onClick={() => void advance()}>
              Saya sudah bayar
            </button>
          )}
          {dev.orderInterval === "manual" && order.status !== "WAITING" && nextStatus(order.status) && (
            <button type="button" className={shop.outlineBtn} {...tid("shop_btn_next_status")} disabled={!online} onClick={() => void advance()}>
              Status berikutnya
            </button>
          )}
        </div>
        {order.status === "WAITING" && order.vaDeadline > 0 && <VaPanel order={order} onStatus={setOrder} />}
        {cancelled && order.cancelReason && (
          <p className={shop.muted} {...tid("shop_txt_cancel_reason")}>
            Alasan: {order.cancelReason}
          </p>
        )}
        <ol className={styles.timeline} {...tid("shop_list_order_timeline")}>
          {FLOW.map((s, i) => {
            const at = order.stamps[s];
            const done = !cancelled && at !== undefined;
            return (
              <li key={s} data-done={done} data-last={i === FLOW.length - 1} aria-current={!cancelled && order.status === s ? "step" : undefined} {...tid.list("shop_item_timeline_step")}>
                <span className={styles.track}>
                  <span className={styles.dot} />
                  <span className={styles.bar} />
                </span>
                {STATUS_LABEL[s]}
                <span className={styles.sub}>{done ? (s === order.status ? (SUBTEXT[s] ?? formatClock(at)) : formatClock(at)) : "Belum"}</span>
              </li>
            );
          })}
        </ol>
      </section>

      <div className={styles.cols}>
        <section className={styles.card}>
          <h2 {...tid("shop_txt_order_products_head")}>PRODUK</h2>
          {order.lines.map((l) => {
            const p = productById(l.productId);
            return (
              <div key={`${l.productId}|${variantKey(l.color, l.size)}`} className={styles.item} {...tid.list("shop_item_order_line")}>
                {p && <ProductImage product={p} iconSize={28} />}
                <span className={styles.itemBody}>
                  <Link {...tid.list("shop_link_order_line_product")} to={`/shop/product/${l.productId}`}>{p?.name ?? l.productId}</Link>
                  <span className={styles.sub}>
                    {[l.color, l.size].filter(Boolean).join(" · ")}
                    {l.color || l.size ? " · " : ""}
                    {l.qty} × {formatRupiah(p?.price ?? 0)}
                  </span>
                </span>
                <strong>{formatRupiah((p?.price ?? 0) * l.qty)}</strong>
              </div>
            );
          })}
        </section>

        <section className={styles.card}>
          <h2 {...tid("shop_txt_order_payment_head")}>RINCIAN PEMBAYARAN</h2>
          {/* shortcut: dokumen order (kontrak §8.2) tidak menyimpan rincian ongkir/diskon; selisih ke total ditampilkan satu baris. */}
          <dl className={styles.sums}>
            <dt>Subtotal produk</dt>
            <dd>{formatRupiah(subtotal)}</dd>
            <dt>Ongkir, biaya & diskon</dt>
            <dd>{formatRupiah(order.total - subtotal)}</dd>
            <dt className={styles.strong}>Total</dt>
            <dd className={styles.strong}>{formatRupiah(order.total)}</dd>
          </dl>
          {canCancel(order.status) && (
            <button type="button" className={styles.dangerBtn} {...tid("shop_btn_cancel_order")} disabled={!online} onClick={() => setCancelling(true)}>
              Batalkan Pesanan
            </button>
          )}
          {order.status === "SHIPPED" && (
            <span className={styles.sub} {...tid("shop_txt_cannot_cancel")}>
              {CANNOT_CANCEL_SHIPPED}
            </span>
          )}
        </section>
      </div>

      {cancelling && <CancelDialog onConfirm={doCancel} onClose={() => setCancelling(false)} />}
    </div>
  );
}
