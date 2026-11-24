import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { useAccount } from "../app/account";
import { useSession } from "../app/session";
import { tid } from "../components/testid";
import type { TransactionDoc } from "../data/schema";
import { listTransactions } from "../data/walletRepository";
import { formatStamp } from "../domain/dateFormat";
import { formatRupiah } from "../domain/money";
import { parseQr, recentContacts, viewTransactions, type TxFilter, type TxSort } from "../domain/payRules";
import { AccountNav } from "../features/account/AccountNav";
import account from "../features/account/account.module.css";
import orders from "../features/orders/orders.module.css";
import styles from "../features/pay/pay.module.css";
import { TopUpDialog } from "../features/pay/TopUpDialog";
import { TransferDialog } from "../features/pay/TransferDialog";
import { Icon } from "../features/shop/icons";
import shop from "../features/shop/shop.module.css";

const FILTERS: { key: TxFilter; label: string }[] = [
  { key: "all", label: "Semua" },
  { key: "in", label: "Masuk" },
  { key: "out", label: "Keluar" },
];

type QrDetector = { detect: (img: ImageBitmap) => Promise<{ rawValue: string }[]> };
declare global {
  // eslint-disable-next-line no-var
  var BarcodeDetector: (new (o: { formats: string[] }) => QrDetector) | undefined;
}

// shortcut: QR hanya dari unggah gambar lewat BarcodeDetector bawaan browser (tanpa pemindaian kamera langsung);
// upgrade ke getUserMedia + dekoder JS bila FR-PAY-09 (kamera) dibutuhkan.
async function readQr(file: File): Promise<string> {
  if (!globalThis.BarcodeDetector) throw new Error("unsupported");
  const [code] = await new globalThis.BarcodeDetector({ formats: ["qr_code"] }).detect(await createImageBitmap(file));
  if (!code) throw new Error("empty");
  return code.rawValue;
}

// PRD FR-PAY-01/05/07/11 / design W-PAY-01.
export default function PayPage() {
  const { account: acc } = useAccount();
  const uid = useSession()!.uid;
  const navigate = useNavigate();
  const [txs, setTxs] = useState<TransactionDoc[]>();
  const [failed, setFailed] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [filter, setFilter] = useState<TxFilter>("all");
  const [sort, setSort] = useState<TxSort>({ by: "date", dir: "desc" });
  const [transfer, setTransfer] = useState(false);
  const [topUp, setTopUp] = useState(false);
  const [qrError, setQrError] = useState("");

  const load = useCallback(async () => {
    setFailed(false);
    try {
      setTxs(await listTransactions(uid));
    } catch {
      setFailed(true);
    }
  }, [uid]);
  useEffect(() => {
    void load();
  }, [load]);

  const toggleSort = (by: TxSort["by"]) => setSort((s) => ({ by, dir: s.by === by && s.dir === "desc" ? "asc" : "desc" }));
  const ariaSort = (by: TxSort["by"]) => (sort.by !== by ? "none" : sort.dir === "asc" ? "ascending" : "descending");
  const arrow = (by: TxSort["by"]) => (sort.by === by ? (sort.dir === "asc" ? "↑" : "↓") : "");

  const onQr = async (file: File | undefined) => {
    if (!file) return;
    setQrError("");
    try {
      const qr = parseQr(await readQr(file));
      if (!qr) return setQrError("QR tidak valid");
      navigate(`/pay/qr?merchant=${qr.merchant}${qr.amount ? `&amount=${qr.amount}` : ""}`);
    } catch {
      setQrError("QR tidak terbaca");
    }
  };

  const rows = txs ? viewTransactions([...txs], filter, sort) : [];

  return (
    <div className={account.layout}>
      <AccountNav />
      <div className={account.content}>
        <h1 {...tid("pay_txt_title")} className={account.srOnly}>PracticePay</h1>
        <section className={styles.hero}>
          <div className={styles.heroBalance}>
            <span className={styles.heroLabel}>
              PracticePay · Saldo kamu <span className={styles.badge}>Terverifikasi</span>
            </span>
            <span className={styles.balance}>
              <strong {...tid("pay_txt_balance")}>{hidden ? "Rp••••••" : formatRupiah(acc.state.balance)}</strong>
              <button
                type="button"
                className={styles.eye}
                aria-label={hidden ? "Tampilkan saldo" : "Sembunyikan saldo"}
                {...tid("pay_btn_toggle_balance")}
                onClick={() => setHidden((h) => !h)}
              >
                <Icon name="eye" />
              </button>
            </span>
          </div>
          <div className={styles.actions}>
            <button type="button" className={styles.action} data-primary="true" {...tid("pay_btn_topup")} onClick={() => setTopUp(true)}>
              Top Up
            </button>
            <button type="button" className={styles.action} data-primary="true" {...tid("pay_btn_transfer")} onClick={() => setTransfer(true)}>
              Transfer
            </button>
            <label className={styles.action}>
              Bayar dengan QR
              <input type="file" accept="image/*" className={account.srOnly} {...tid("pay_input_qr_upload")} onChange={(e) => void onQr(e.target.files?.[0])} />
            </label>
          </div>
        </section>
        {qrError && (
          <p role="alert" className={shop.inlineError} {...tid("pay_txt_qr_error")}>
            {qrError}
          </p>
        )}

        <section className={orders.card}>
          <div className={styles.headRow}>
            <h2 {...tid("pay_txt_history_title")} style={{ letterSpacing: 0, color: "var(--pm-ink)", fontSize: 17 }}>Riwayat transaksi</h2>
            <div role="radiogroup" aria-label="Jenis transaksi" className={styles.chips}>
              {FILTERS.map((f) => (
                <button key={f.key} type="button" role="radio" aria-checked={filter === f.key} className={styles.chip} {...tid(`pay_chip_${f.key}`)} onClick={() => setFilter(f.key)}>
                  {f.label}
                </button>
              ))}
            </div>
            <button type="button" className={shop.iconBtn} aria-label="Muat ulang" {...tid("pay_btn_history_reload")} onClick={() => void load()}>
              <Icon name="refresh" />
            </button>
          </div>
          {failed ? (
            <div className={orders.empty} role="alert">
              <strong {...tid("pay_txt_history_error")}>Gagal memuat, coba lagi</strong>
              <div>
                <button type="button" className={shop.outlineBtn} {...tid("pay_btn_history_retry")} onClick={() => void load()}>
                  Coba lagi
                </button>
              </div>
            </div>
          ) : (
            txs && (
              <>
                <div style={{ overflowX: "auto" }}>
                  <table className={orders.table} style={{ minWidth: 560 }} {...tid("pay_table_history")}>
                    <thead>
                      <tr>
                        <th scope="col" aria-sort={ariaSort("date")}>
                          <button type="button" className={styles.sortBtn} {...tid("pay_btn_sort_date")} onClick={() => toggleSort("date")}>
                            Tanggal {arrow("date")}
                          </button>
                        </th>
                        <th scope="col">Keterangan</th>
                        <th scope="col" className={orders.num} aria-sort={ariaSort("amount")}>
                          <button type="button" className={styles.sortBtn} {...tid("pay_btn_sort_amount")} onClick={() => toggleSort("amount")}>
                            Nominal {arrow("amount")}
                          </button>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((t) => (
                        <tr key={t.id} {...tid.list("pay_item_history_row")}>
                          <td style={{ whiteSpace: "nowrap" }}>{formatStamp(t.at)}</td>
                          <td>{t.title}</td>
                          <td className={`${orders.num} ${t.amount > 0 ? styles.in : ""}`} {...tid.list("pay_txt_history_amount")}>
                            {t.amount > 0 ? "+" : "−"}
                            {formatRupiah(Math.abs(t.amount))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {!rows.length && <p className={shop.muted} {...tid("pay_txt_history_empty")}>Belum ada transaksi</p>}
                <span className={shop.muted} style={{ fontSize: 13 }} {...tid("pay_txt_history_count")}>
                  Menampilkan {rows.length} transaksi
                </span>
              </>
            )
          )}
        </section>
      </div>
      {transfer && <TransferDialog onClose={() => setTransfer(false)} onDone={() => void load()} recent={recentContacts(txs ?? [])} />}
      {topUp && <TopUpDialog onClose={() => setTopUp(false)} onDone={() => void load()} />}
    </div>
  );
}
