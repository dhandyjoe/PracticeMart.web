import { useEffect, useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router";
import { useAccount } from "../app/account";
import { useSession } from "../app/session";
import { useSnackbar } from "../components/Snackbar";
import { tid } from "../components/testid";
import { productById, stockOf, variantKey } from "../data/catalog";
import { CheckoutError, placeOrder } from "../data/orderRepository";
import type { CartLine } from "../data/schema";
import { formatAddress } from "../domain/address";
import { formatRupiah } from "../domain/money";
import {
  cardErrors,
  cardOutcome,
  COD_LIMIT,
  courierAvailable,
  COURIERS,
  digitsOnly,
  formatCardNumber,
  formatExpiry,
  isDeliveryTimeValid,
  METHODS,
  priceSummary,
  SAME_DAY_UNAVAILABLE,
  VA_BANKS,
  type Courier,
  type Method,
  type VaBank,
} from "../domain/payment";
import { PinDialog } from "../features/checkout/PinDialog";
import { ThreeDSDialog, type ThreeDSResult } from "../features/checkout/ThreeDSDialog";
import { useOnline } from "../features/checkout/useOnline";
import styles from "../features/checkout/checkout.module.css";
import { ProductImage } from "../features/shop/ProductImage";
import shop from "../features/shop/shop.module.css";
import { isDeterministic, notify, processingDelayMs, readDevSettings, VA_TIMEOUT_MS } from "../sim/settings";

// FR-PAYM-04: pilihan checkout tahan reload & pindah tab. Data kartu sengaja TIDAK disimpan.
export const DRAFT_KEY = "pm.checkout";
type Draft = { addressId: string; courier: Courier; insurance: boolean; method: Method; vaBank: VaBank; deliveryTime: string };

function readDraft(): Partial<Draft> {
  try {
    const d = JSON.parse(sessionStorage.getItem(DRAFT_KEY) ?? "{}");
    return d && typeof d === "object" ? d : {};
  } catch {
    return {};
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function notifyOrder(id: string, snackbar: ReturnType<typeof useSnackbar>) {
  // FR-PAYM-14: toast + notifikasi browser (bila diizinkan & preferensi aktif).
  const text = `Pesanan ${id} berhasil dibuat`;
  snackbar({ text });
  notify(text);
}

export default function CheckoutPage() {
  const { account } = useAccount();
  const uid = useSession()!.uid;
  const navigate = useNavigate();
  const snackbar = useSnackbar();
  const online = useOnline();
  const { state } = account;

  // FR-SHOP-11: "Beli Sekarang" membawa satu baris lewat history state (tahan reload), keranjang tidak dipakai.
  const buyNow = (useLocation().state as { buyNow?: CartLine } | null)?.buyNow;
  const lines: CartLine[] = (buyNow ? [buyNow] : state.cart).filter(
    (l) => l.selected && !l.saved && productById(l.productId) && stockOf(account.stock, l.productId, variantKey(l.color, l.size)) > 0,
  );

  const primary = state.addresses.find((a) => a.isPrimary) ?? state.addresses[0];
  const [draft, setDraft] = useState<Draft>(() => {
    const d = readDraft();
    return {
      addressId: d.addressId ?? primary?.id ?? "",
      courier: d.courier && d.courier in COURIERS ? d.courier : "express",
      insurance: d.insurance ?? true,
      method: d.method && d.method in METHODS ? d.method : "card",
      vaBank: VA_BANKS.includes(d.vaBank as VaBank) ? (d.vaBank as VaBank) : "BCA",
      deliveryTime: d.deliveryTime ?? "",
    };
  });
  useEffect(() => sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft)), [draft]);
  const set = (patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch }));

  const [card, setCard] = useState({ number: "", expiry: "", cvv: "" });
  const [touched, setTouched] = useState({ number: false, expiry: false, cvv: false });
  const [pickAddress, setPickAddress] = useState(false);
  const [busy, setBusy] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [threeDS, setThreeDS] = useState(false);
  const [pin, setPin] = useState(false);
  const [error, setError] = useState("");
  // Setelah order dibuat jangan alihkan ke keranjang walau keranjang sudah kosong.
  const [done, setDone] = useState(false);
  // Tanggal untuk cek kedaluwarsa kartu (jam asli, kontrak §5).
  const [today] = useState(() => new Date());

  if (!lines.length && !done) return <Navigate to="/shop/cart" replace />;

  const address = state.addresses.find((a) => a.id === draft.addressId) ?? primary;
  const province = address?.province ?? "";
  const courier = courierAvailable(draft.courier, province) ? draft.courier : "express";
  const subtotal = lines.reduce((sum, l) => sum + productById(l.productId)!.price * l.qty, 0);
  const summary = priceSummary(subtotal, state.voucher, courier, draft.insurance);
  const total = summary.total;

  const methodDisabled: Partial<Record<Method, string>> = {
    ...(state.balance < total ? { wallet: "Saldo tidak cukup" } : {}),
    ...(total > COD_LIMIT ? { cod: "Untuk total maksimal Rp1.000.000" } : {}),
  };
  const method = methodDisabled[draft.method] ? null : draft.method;
  const errors = cardErrors(card, today);
  const timeOk = courier !== "sameday" || isDeliveryTimeValid(draft.deliveryTime);
  const cardOk = method !== "card" || !Object.keys(errors).length;
  const canPay = online && !!address && !!method && timeOk && cardOk && !busy;

  const finalize = async (status: "PAID" | "WAITING") => {
    try {
      const order = await placeOrder({
        uid,
        lines,
        method: method!,
        status,
        total,
        vaTimeoutMs: method === "va" ? VA_TIMEOUT_MS[readDevSettings().vaTimeout] : undefined,
        vaBank: method === "va" ? draft.vaBank : undefined,
        keepCart: !!buyNow,
        deterministic: isDeterministic(),
      });
      setDone(true);
      sessionStorage.removeItem(DRAFT_KEY);
      notifyOrder(order.id, snackbar);
      navigate(`/checkout/result/${order.id}`, { replace: true });
    } catch (e) {
      setError(
        e instanceof CheckoutError ? e.message : navigator.onLine ? "Gagal memuat, coba lagi" : "Tidak ada koneksi",
      );
      setBusy(false);
    }
  };

  const process = async () => {
    setProcessing(true);
    await sleep(processingDelayMs());
    setProcessing(false);
    if (method === "card") {
      const outcome = cardOutcome(card.number);
      if (outcome === "declined") {
        // Kontrak N-05: tidak ada order, keranjang utuh.
        navigate("/checkout/result", { state: { failed: true } });
        return;
      }
      if (outcome === "success") {
        setThreeDS(true);
        return;
      }
    }
    await finalize(method === "va" || method === "card" ? "WAITING" : "PAID");
  };

  const pay = () => {
    if (!canPay) return;
    setBusy(true);
    setError("");
    if (method === "wallet") setPin(true);
    else void process();
  };

  const on3DS = (result: ThreeDSResult) => {
    setThreeDS(false);
    if (result === "success") void finalize("PAID");
    else setBusy(false);
  };

  const stepDone = [!!address, timeOk];
  const current = stepDone.indexOf(false) === -1 ? 2 : stepDone.indexOf(false);

  return (
    <div className={shop.pageTight}>
      <div className={styles.head}>
        <Link to="/shop/cart" className={styles.back} {...tid("shop_link_back_to_cart")}>
          ‹ Kembali ke keranjang
        </Link>
        <h1 {...tid("shop_txt_checkout_title")}>Checkout</h1>
        <ol {...tid("shop_list_checkout_steps")} aria-label="Langkah" className={styles.steps}>
          {["Alamat", "Pengiriman", "Pembayaran"].map((s, i) => (
            <li key={s} data-done={i < current} aria-current={i === current ? "step" : undefined}>
              {i + 1} {s}
            </li>
          ))}
        </ol>
      </div>

      {!online && (
        <div role="alert" className={styles.alert} {...tid("shop_txt_offline")}>
          Tidak ada koneksi
        </div>
      )}
      {error && (
        <div role="alert" className={styles.alert} {...tid("shop_txt_checkout_error")}>
          {error}
        </div>
      )}

      <div className={styles.layout}>
        <div className={styles.column}>
          <section aria-labelledby="h_addr" className={styles.card}>
            <h2 data-testid="shop_txt_checkout_address_title" id="h_addr" className={styles.cardTitle}>
              ALAMAT PENGIRIMAN
            </h2>
            {address ? (
              <div className={styles.addressRow}>
                <div className={styles.addressText}>
                  <strong>
                    {address.label}
                    {address.isPrimary && <span className={styles.tag}>Utama</span>}
                  </strong>
                  <span {...tid("shop_txt_checkout_address")}>{formatAddress(address)}</span>
                </div>
                {state.addresses.length > 1 && (
                  <button
                    type="button"
                    className={shop.outlineBtn}
                    aria-expanded={pickAddress}
                    {...tid("shop_btn_change_address")}
                    onClick={() => setPickAddress((v) => !v)}
                  >
                    Ubah
                  </button>
                )}
              </div>
            ) : (
              <p className={styles.addressText} {...tid("shop_txt_no_address")}>
                Belum ada alamat pengiriman.
              </p>
            )}
            {pickAddress && (
              <fieldset className={styles.card} style={{ padding: 0, border: 0 }}>
                <legend className={styles.label}>Pilih alamat</legend>
                {state.addresses.map((a) => (
                  <label key={a.id} className={styles.option}>
                    <input
                      type="radio"
                      name="address"
                      {...tid.list("shop_rdo_address")}
                      checked={a.id === address?.id}
                      onChange={() => {
                        set({ addressId: a.id });
                        setPickAddress(false);
                      }}
                    />
                    <span className={styles.optionText}>
                      {a.label}
                      <span className={styles.optionNote}>{formatAddress(a)}</span>
                    </span>
                  </label>
                ))}
              </fieldset>
            )}
            <Link to="/account#alamat" className={styles.back} {...tid("shop_link_add_address")}>
              + Tambah atau ubah alamat
            </Link>
          </section>

          <fieldset className={styles.card}>
            <legend className={styles.legend}>KURIR</legend>
            {(Object.keys(COURIERS) as Courier[]).map((c) => {
              const available = courierAvailable(c, province);
              return (
                <label key={c} className={styles.option}>
                  <input
                    type="radio"
                    name="courier"
                    {...tid(`shop_rdo_courier_${c}`)}
                    checked={c === courier}
                    disabled={!available}
                    onChange={() => set({ courier: c })}
                  />
                  <span className={styles.optionText}>
                    {COURIERS[c].name}
                    <span className={styles.optionNote}>{available ? COURIERS[c].note : SAME_DAY_UNAVAILABLE}</span>
                  </span>
                  <span className={styles.mono}>{formatRupiah(COURIERS[c].fee)}</span>
                </label>
              );
            })}
            {courier === "sameday" && (
              <div className={styles.field}>
                <label htmlFor="shop_input_delivery_time" className={styles.label}>
                  Jam kirim (09:00–17:00)
                </label>
                <input
                  className={styles.input}
                  {...tid("shop_input_delivery_time")}
                  type="time"
                  min="09:00"
                  max="17:00"
                  step={1800}
                  value={draft.deliveryTime}
                  aria-invalid={!!draft.deliveryTime && !timeOk}
                  onChange={(e) => set({ deliveryTime: e.target.value })}
                />
                {!timeOk && (
                  <span className={styles.error} {...tid("shop_txt_delivery_time_error")}>
                    Pilih jam kirim antara 09:00 dan 17:00
                  </span>
                )}
              </div>
            )}
            <label className={styles.inline}>
              <input
                type="checkbox"
                {...tid("shop_chk_insurance")}
                checked={draft.insurance}
                onChange={(e) => set({ insurance: e.target.checked })}
              />
              Asuransi pengiriman (Rp2.000)
            </label>
          </fieldset>

          <fieldset className={styles.card}>
            <legend className={styles.legend}>METODE PEMBAYARAN</legend>
            {(Object.keys(METHODS) as Method[]).map((m) => (
              <label key={m} className={styles.option}>
                <input
                  type="radio"
                  name="method"
                  {...tid(`shop_rdo_pay_${m}`)}
                  checked={m === method}
                  disabled={!!methodDisabled[m]}
                  onChange={() => set({ method: m })}
                />
                <span className={styles.optionText}>{METHODS[m]}</span>
                <span className={styles.optionNote} {...tid(`shop_txt_pay_${m}_note`)}>
                  {methodDisabled[m] ??
                    { card: "VISA · Mastercard", va: "BCA · BNI · Mandiri", wallet: `Saldo ${formatRupiah(state.balance)}`, cod: "Maks Rp1.000.000" }[m]}
                </span>
              </label>
            ))}

            {method === "va" && (
              <div role="radiogroup" aria-label="Bank Virtual Account" className={styles.cardForm} {...tid("shop_list_va_bank")}>
                {VA_BANKS.map((b) => (
                  <label key={b} className={styles.option}>
                    <input type="radio" name="vaBank" {...tid.list("shop_rdo_va_bank")} value={b} checked={draft.vaBank === b} onChange={() => set({ vaBank: b })} />
                    <span className={styles.optionText}>{b}</span>
                  </label>
                ))}
              </div>
            )}

            {method === "card" && (
              <div className={styles.cardForm} {...tid("shop_form_card")}>
                <div className={`${styles.field} ${styles.full}`}>
                  <label htmlFor="shop_input_card_number" className={styles.label}>
                    Nomor kartu
                  </label>
                  <input
                    className={styles.input}
                    {...tid("shop_input_card_number")}
                    inputMode="numeric"
                    autoComplete="cc-number"
                    placeholder="1234 5678 9012 3456"
                    value={card.number}
                    aria-invalid={touched.number && !!errors.number}
                    onChange={(e) => setCard((c) => ({ ...c, number: formatCardNumber(e.target.value) }))}
                    onBlur={() => setTouched((t) => ({ ...t, number: true }))}
                  />
                  {(touched.number || digitsOnly(card.number).length === 16) && errors.number && (
                    <span role="alert" className={styles.error} {...tid("shop_txt_card_number_error")}>
                      {errors.number}
                    </span>
                  )}
                </div>
                <div className={styles.field}>
                  <label htmlFor="shop_input_card_exp" className={styles.label}>
                    Berlaku s/d (MM/YY)
                  </label>
                  <input
                    className={styles.input}
                    {...tid("shop_input_card_exp")}
                    inputMode="numeric"
                    autoComplete="cc-exp"
                    placeholder="MM/YY"
                    value={card.expiry}
                    aria-invalid={touched.expiry && !!errors.expiry}
                    onChange={(e) => setCard((c) => ({ ...c, expiry: formatExpiry(e.target.value) }))}
                    onBlur={() => setTouched((t) => ({ ...t, expiry: true }))}
                  />
                  {touched.expiry && errors.expiry && (
                    <span role="alert" className={styles.error} {...tid("shop_txt_card_exp_error")}>
                      {errors.expiry}
                    </span>
                  )}
                </div>
                <div className={styles.field}>
                  <label htmlFor="shop_input_card_cvv" className={styles.label}>
                    CVV
                  </label>
                  <input
                    className={styles.input}
                    {...tid("shop_input_card_cvv")}
                    type="password"
                    inputMode="numeric"
                    autoComplete="cc-csc"
                    maxLength={3}
                    value={card.cvv}
                    aria-invalid={touched.cvv && !!errors.cvv}
                    onChange={(e) => setCard((c) => ({ ...c, cvv: digitsOnly(e.target.value).slice(0, 3) }))}
                    onBlur={() => setTouched((t) => ({ ...t, cvv: true }))}
                  />
                  {touched.cvv && errors.cvv && (
                    <span role="alert" className={styles.error} {...tid("shop_txt_card_cvv_error")}>
                      {errors.cvv}
                    </span>
                  )}
                </div>
              </div>
            )}
          </fieldset>
        </div>

        <aside className={`${styles.card} ${styles.summary}`} aria-labelledby="h_summary">
          <h2 data-testid="shop_txt_checkout_summary_title" id="h_summary" className={styles.cardTitle}>
            RINGKASAN
          </h2>
          {lines.map((l) => {
            const p = productById(l.productId)!;
            return (
              <div key={`${l.productId}|${l.color}|${l.size}`} className={styles.item} {...tid.list("shop_item_checkout_line")}>
                <ProductImage product={p} className={styles.itemThumb} iconSize={24} />
                <span className={styles.itemText}>
                  {p.name}
                  <span>
                    {[l.color, l.size].filter(Boolean).join(" · ")}
                    {l.color || l.size ? " · " : ""}
                    {l.qty} × {formatRupiah(p.price)}
                  </span>
                </span>
              </div>
            );
          })}
          <dl className={styles.lines}>
            <dt>Subtotal</dt>
            <dd {...tid("shop_txt_checkout_subtotal")}>{formatRupiah(summary.subtotal)}</dd>
            {summary.discount > 0 && (
              <>
                <dt>Diskon voucher {state.voucher}</dt>
                <dd className={styles.minus} {...tid("shop_txt_checkout_discount")}>
                  −{formatRupiah(summary.discount)}
                </dd>
              </>
            )}
            <dt>Ongkir</dt>
            <dd {...tid("shop_txt_checkout_shipping")}>{formatRupiah(summary.shipping)}</dd>
            {summary.shippingDiscount > 0 && (
              <>
                <dt>Potongan ongkir {state.voucher}</dt>
                <dd className={styles.minus} {...tid("shop_txt_checkout_shipping_discount")}>
                  −{formatRupiah(summary.shippingDiscount)}
                </dd>
              </>
            )}
            <dt>Asuransi</dt>
            <dd {...tid("shop_txt_checkout_insurance")}>{formatRupiah(summary.insurance)}</dd>
            <dt>Biaya layanan</dt>
            <dd {...tid("shop_txt_checkout_service_fee")}>{formatRupiah(summary.serviceFee)}</dd>
          </dl>
          <div className={styles.total}>
            <span>Total</span>
            <strong {...tid("shop_txt_checkout_total")}>{formatRupiah(total)}</strong>
          </div>
          <button
            type="button"
            className={`${shop.primaryBtn} ${styles.payBtn}`}
            {...tid("shop_btn_pay")}
            disabled={!canPay}
            aria-busy={busy}
            onClick={pay}
          >
            Bayar {formatRupiah(total)}
          </button>
        </aside>
      </div>

      {processing && (
        <div className={styles.overlay} role="status" aria-live="assertive" {...tid("shop_overlay_processing")}>
          <div className={styles.overlayBox}>
            <span className={styles.spinner} aria-hidden="true" />
            Memproses pembayaran…
          </div>
        </div>
      )}
      {threeDS && <ThreeDSDialog amount={total} last4={digitsOnly(card.number).slice(-4)} onResult={on3DS} />}
      {pin && (
        <PinDialog
          onClose={() => {
            setPin(false);
            setBusy(false);
          }}
          onSuccess={() => {
            setPin(false);
            void process();
          }}
        />
      )}
    </div>
  );
}
