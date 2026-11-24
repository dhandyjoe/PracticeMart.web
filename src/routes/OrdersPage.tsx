import { useCallback, useEffect, useState, type KeyboardEvent } from "react";
import { Link } from "react-router";
import { useSession } from "../app/session";
import { tid } from "../components/testid";
import { productById } from "../data/catalog";
import { listOrders } from "../data/orderRepository";
import type { OrderDoc } from "../data/schema";
import { formatDay } from "../domain/dateFormat";
import { formatRupiah } from "../domain/money";
import { filterOrders, STATUS_LABEL, TABS, type TabKey } from "../domain/orderRules";
import { AccountNav } from "../features/account/AccountNav";
import account from "../features/account/account.module.css";
import styles from "../features/orders/orders.module.css";
import { Icon } from "../features/shop/icons";
import shop from "../features/shop/shop.module.css";

// Ringkasan produk satu baris: "Kaos Polos Basic ×2" atau "Kaos Polos Basic +1 lainnya".
export function itemSummary(o: OrderDoc) {
  const [first, ...rest] = o.lines;
  if (!first) return "–";
  const name = productById(first.productId)?.name ?? first.productId;
  return rest.length ? `${name} +${rest.length} lainnya` : first.qty > 1 ? `${name} ×${first.qty}` : name;
}

// PRD FR-ORD-01 / design W-ORD-01.
export default function OrdersPage() {
  const uid = useSession()!.uid;
  const [orders, setOrders] = useState<OrderDoc[]>();
  const [failed, setFailed] = useState(false);
  const [tab, setTab] = useState<TabKey>("semua");
  const [query, setQuery] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const load = useCallback(async () => {
    setFailed(false);
    try {
      setOrders(await listOrders(uid));
    } catch {
      setFailed(true);
    }
  }, [uid]);
  useEffect(() => {
    void load();
  }, [load]);

  // Panah kiri/kanan memindahkan tab (FR-ORD-01).
  const onTabKey = (e: KeyboardEvent, i: number) => {
    const step = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    const next = TABS[(i + step + TABS.length) % TABS.length];
    setTab(next.key);
    document.getElementById(`shop_tab_order_${next.key}`)?.focus();
  };

  const rows = orders ? filterOrders(orders, { tab, query, from, to }) : [];

  return (
    <div className={account.layout}>
      <AccountNav />
      <div className={account.content}>
        <div className={styles.titleRow}>
          <h1 {...tid("shop_txt_orders_title")}>Pesanan Saya</h1>
          <button type="button" className={shop.iconBtn} aria-label="Muat ulang" {...tid("shop_btn_orders_reload")} onClick={() => void load()}>
            <Icon name="refresh" />
          </button>
        </div>

        <div role="tablist" aria-label="Status pesanan" className={styles.tabs}>
          {TABS.map((t, i) => (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={t.key === tab}
              tabIndex={t.key === tab ? 0 : -1}
              className={styles.tab}
              {...tid(`shop_tab_order_${t.key}`)}
              onClick={() => setTab(t.key)}
              onKeyDown={(e) => onTabKey(e, i)}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className={styles.filters}>
          <div className={styles.grow}>
            <label htmlFor="shop_input_order_search" className={account.label}>
              Cari Order ID
            </label>
            <input
              type="search"
              className={`${account.input} ${styles.mono}`}
              placeholder="PM-20260115-0001"
              {...tid("shop_input_order_search")}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="shop_input_order_date_from" className={account.label}>
              Dari tanggal
            </label>
            <input type="date" className={account.input} {...tid("shop_input_order_date_from")} value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div>
            <label htmlFor="shop_input_order_date_to" className={account.label}>
              Sampai tanggal
            </label>
            <input type="date" className={account.input} {...tid("shop_input_order_date_to")} value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} />
          </div>
        </div>

        {failed ? (
          <div className={styles.tableWrap}>
            <div className={styles.empty} role="alert">
              <strong {...tid("shop_txt_orders_error")}>Gagal memuat, coba lagi</strong>
              <div>
                <button type="button" className={shop.outlineBtn} {...tid("shop_btn_orders_retry")} onClick={() => void load()}>
                  Coba lagi
                </button>
              </div>
            </div>
          </div>
        ) : (
          orders && (
            <div className={styles.tableWrap}>
              <table className={styles.table} {...tid("shop_table_orders")}>
                <thead>
                  <tr>
                    <th scope="col">Order ID</th>
                    <th scope="col">Tanggal</th>
                    <th scope="col">Produk</th>
                    <th scope="col" className={styles.num}>
                      Total
                    </th>
                    <th scope="col">Status</th>
                    <th scope="col">
                      <span className={account.srOnly}>Aksi</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((o) => (
                    <tr key={o.id} {...tid.list("shop_item_order_row")}>
                      <td className={styles.mono} {...tid.list("shop_txt_order_id")}>
                        {o.id}
                      </td>
                      <td>{formatDay(o.createdAt)}</td>
                      <td>{itemSummary(o)}</td>
                      <td className={styles.num}>{formatRupiah(o.total)}</td>
                      <td>
                        <span className={styles.pill} data-status={o.status} {...tid.list("shop_txt_order_status")}>
                          {STATUS_LABEL[o.status]}
                        </span>
                      </td>
                      <td>
                        <Link to={`/shop/order/${o.id}`} className={shop.linkStrong} {...tid.list("shop_link_order_detail")}>
                          Lihat
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!rows.length && (
                <div className={styles.empty} {...tid("shop_txt_orders_empty")}>
                  <strong>Belum ada pesanan</strong>
                  <span>Pesanan dengan status ini akan muncul di sini.</span>
                </div>
              )}
            </div>
          )
        )}
      </div>
    </div>
  );
}
