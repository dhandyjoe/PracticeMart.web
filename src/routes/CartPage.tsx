import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router";
import { useAccount } from "../app/account";
import { useSnackbar } from "../components/Snackbar";
import { tid } from "../components/testid";
import { productById, stockOf, variantKey, type Product } from "../data/catalog";
import type { CartLine } from "../data/schema";
import { maxQty, sameLine, selectAllState, selectedSubtotal } from "../domain/cartRules";
import { formatRupiah } from "../domain/money";
import { normalizeCode, voucherDiscount, voucherError } from "../domain/voucherRules";
import { Icon } from "../features/shop/icons";
import { ProductImage } from "../features/shop/ProductImage";
import styles from "../features/shop/shop.module.css";

type Row = { line: CartLine; product: Product; left: number };

const variantLabel = (l: CartLine) => [l.color, l.size].filter(Boolean).join(" · ");

function SelectAll({ state, onToggle }: { state: ReturnType<typeof selectAllState>; onToggle: () => void }) {
  const ref = useRef<HTMLInputElement>(null);
  // PRD FR-SHOP-16: Pilih Semua tri-state (indeterminate hanya bisa diset lewat DOM).
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = state === "some";
  }, [state]);
  return (
    <input
      ref={ref}
      type="checkbox"
      aria-label="Pilih semua"
      {...tid("shop_chk_select_all")}
      checked={state === "all"}
      onChange={onToggle}
    />
  );
}

function VoucherBox({ subtotal }: { subtotal: number }) {
  const { account, update } = useAccount();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const applied = account.state.voucher;
  // Voucher terpasang yang tidak lagi memenuhi syarat (mis. MIN100K setelah item dikurangi).
  const appliedError = applied ? voucherError(applied, subtotal) : "";

  const apply = (e: FormEvent) => {
    e.preventDefault();
    const err = voucherError(code, subtotal);
    setError(err);
    if (err) return;
    setCode("");
    void update("voucher", () => normalizeCode(code));
  };

  if (applied) {
    return (
      <div className={styles.section}>
        <div className={styles.voucherApplied}>
          <span {...tid("shop_txt_voucher_applied")}>
            Voucher <strong>{applied}</strong> terpasang
          </span>
          <button type="button" className={styles.ghostBtn} {...tid("shop_btn_voucher_remove")} onClick={() => void update("voucher", () => null)}>
            Lepas
          </button>
        </div>
        {appliedError && (
          <span role="alert" className={styles.inlineError} {...tid("shop_txt_voucher_error")}>
            {appliedError}
          </span>
        )}
      </div>
    );
  }

  return (
    <form {...tid("shop_form_voucher")} className={styles.section} onSubmit={apply} noValidate>
      <label htmlFor="shop_input_voucher_code" className={styles.variantLabel}>
        Kode voucher
      </label>
      <div className={styles.voucherForm}>
        <input
          className={styles.voucherInput}
          {...tid("shop_input_voucher_code")}
          autoComplete="off"
          value={code}
          aria-invalid={!!error}
          aria-describedby={error ? "shop_txt_voucher_error" : undefined}
          onChange={(e) => {
            setCode(e.target.value.toUpperCase());
            setError("");
          }}
        />
        <button type="submit" className={styles.outlineBtn} {...tid("shop_btn_voucher_apply")} disabled={!code.trim()}>
          Pakai
        </button>
      </div>
      {error && (
        <span role="alert" className={styles.inlineError} {...tid("shop_txt_voucher_error")}>
          {error}
        </span>
      )}
    </form>
  );
}

export default function CartPage() {
  const { account, update, reloadState } = useAccount();
  const snackbar = useSnackbar();
  const navigate = useNavigate();

  // Kontrak §7: keranjang dari Android terlihat setelah halaman dibuka.
  useEffect(() => {
    void reloadState().catch(() => {});
  }, [reloadState]);

  const rows: Row[] = account.state.cart.flatMap((line) => {
    const product = productById(line.productId);
    return product ? [{ line, product, left: stockOf(account.stock, product.id, variantKey(line.color, line.size)) }] : [];
  });
  const active = rows.filter((r) => !r.line.saved);
  const saved = rows.filter((r) => r.line.saved);
  const buyable = active.filter((r) => r.left > 0).map((r) => r.line);
  const selected = buyable.filter((l) => l.selected);
  const subtotal = selectedSubtotal(buyable, (id) => productById(id)!.price);
  const voucher = account.state.voucher;
  const discount = voucher && !voucherError(voucher, subtotal) ? voucherDiscount(voucher, subtotal) : 0;
  const itemCount = selected.reduce((n, l) => n + l.qty, 0);
  const allState = selectAllState(buyable);

  const patch = (line: CartLine, change: Partial<CartLine>) =>
    void update("cart", (cart) => cart.map((l) => (sameLine(l, line) ? { ...l, ...change } : l)));

  const toggleAll = () =>
    void update("cart", (cart) =>
      cart.map((l) => (l.saved || !buyable.some((b) => sameLine(b, l)) ? l : { ...l, selected: allState !== "all" })),
    );

  const remove = ({ line, product }: Row) => {
    const index = account.state.cart.findIndex((l) => sameLine(l, line));
    void update("cart", (cart) => cart.filter((l) => !sameLine(l, line)));
    // PRD FR-SHOP-16: toast Undo 4 dtk.
    snackbar({
      text: `${product.name} dihapus dari keranjang`,
      testid: "shop_bar_undo",
      action: {
        label: "Urungkan",
        testid: "shop_btn_undo",
        onClick: () =>
          void update("cart", (cart) =>
            cart.some((l) => sameLine(l, line)) ? cart : [...cart.slice(0, index), line, ...cart.slice(index)],
          ),
      },
    });
  };

  if (!rows.length) {
    return (
      <div className={styles.pageTight}>
        <h1 {...tid("shop_txt_cart_title")} className={styles.h1}>Keranjang</h1>
        <div className={styles.empty}>
          <Icon name="cart" size={40} />
          <p {...tid("shop_txt_cart_empty")}>Keranjangmu masih kosong</p>
          <Link to="/" className={styles.primaryBtn} {...tid("shop_btn_start_shopping")}>
            Mulai belanja
          </Link>
        </div>
      </div>
    );
  }

  const productCell = ({ line, product, left }: Row) => (
    <div className={styles.cartProduct}>
      <ProductImage product={product} className={styles.cartThumb} iconSize={28} />
      <div>
        <Link to={`/shop/product/${product.id}`} className={styles.cartName} {...tid.list("shop_txt_cart_item_name")}>
          {product.name}
        </Link>
        <div className={styles.variantText} {...tid.list("shop_txt_cart_item_variant")}>
          {variantLabel(line)}
        </div>
        {left === 0 && (
          <div className={styles.outText} {...tid.list("shop_txt_cart_item_out")}>
            Stok habis
          </div>
        )}
      </div>
    </div>
  );

  const removeButton = (row: Row) => (
    <button
      type="button"
      className={`${styles.iconBtn} ${styles.removeBtn}`}
      aria-label={`Hapus ${row.product.name}`}
      {...tid.list("shop_btn_cart_remove")}
      onClick={() => remove(row)}
    >
      <Icon name="trash" size={18} />
    </button>
  );

  return (
    <div className={styles.pageTight}>
      <h1 {...tid("shop_txt_cart_title")} className={styles.h1}>Keranjang</h1>
      <div className={styles.cartLayout}>
        <div className={styles.panel}>
          {active.length > 0 && (
            <table className={styles.table} {...tid("shop_table_cart")}>
              <thead>
                <tr>
                  <th className={styles.checkCell}>
                    <SelectAll state={allState} onToggle={toggleAll} />
                  </th>
                  <th>Produk</th>
                  <th className={styles.num}>Harga</th>
                  <th>Jumlah</th>
                  <th className={styles.num}>Subtotal</th>
                  <th className={styles.num}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {active.map((row) => {
                  const { line, product, left } = row;
                  const options = Array.from({ length: Math.max(maxQty(left), line.qty) }, (_, i) => i + 1);
                  return (
                    <tr key={`${line.productId}|${line.color}|${line.size}`} {...tid.list("shop_item_cart_row")}>
                      <td className={styles.checkCell}>
                        <input
                          type="checkbox"
                          aria-label={`Pilih ${product.name}`}
                          {...tid.list("shop_chk_cart_item")}
                          checked={line.selected && left > 0}
                          disabled={left === 0}
                          onChange={(e) => patch(line, { selected: e.target.checked })}
                        />
                      </td>
                      <td>{productCell(row)}</td>
                      <td className={styles.num} {...tid.list("shop_txt_cart_item_price")}>
                        {formatRupiah(product.price)}
                      </td>
                      <td>
                        <select
                          className={styles.select}
                          aria-label={`Jumlah ${product.name}`}
                          {...tid.list("shop_spn_cart_qty")}
                          value={line.qty}
                          disabled={left === 0}
                          onChange={(e) => patch(line, { qty: Number(e.target.value) })}
                        >
                          {options.map((n) => (
                            <option key={n} value={n}>
                              {n}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className={styles.num} {...tid.list("shop_txt_cart_item_subtotal")}>
                        <strong>{formatRupiah(product.price * line.qty)}</strong>
                      </td>
                      <td>
                        <div className={styles.rowActions}>
                          <button
                            type="button"
                            className={styles.ghostBtn}
                            {...tid.list("shop_btn_cart_save")}
                            onClick={() => patch(line, { saved: true })}
                          >
                            Simpan untuk nanti
                          </button>
                          {removeButton(row)}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

          {saved.length > 0 && (
            <>
              <h2 {...tid("shop_txt_cart_saved_title")} className={styles.savedTitle}>Disimpan untuk nanti</h2>
              <table className={styles.table} {...tid("shop_table_saved")}>
                <tbody>
                  {saved.map((row) => (
                    <tr key={`${row.line.productId}|${row.line.color}|${row.line.size}`} {...tid.list("shop_item_saved_row")}>
                      <td>{productCell(row)}</td>
                      <td className={styles.num}>{formatRupiah(row.product.price)}</td>
                      <td>
                        <div className={styles.rowActions}>
                          <button
                            type="button"
                            className={styles.ghostBtn}
                            {...tid.list("shop_btn_cart_move")}
                            onClick={() => patch(row.line, { saved: false, selected: true })}
                          >
                            Pindahkan ke keranjang
                          </button>
                          {removeButton(row)}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </div>

        <aside className={`${styles.panel} ${styles.summary}`} aria-labelledby="h_summary">
          <h2 data-testid="shop_txt_cart_summary_title" id="h_summary">Ringkasan belanja</h2>
          <div className={styles.summaryRow}>
            <span>Subtotal ({itemCount} barang)</span>
            <strong {...tid("shop_txt_cart_subtotal")}>{formatRupiah(subtotal)}</strong>
          </div>
          <VoucherBox subtotal={subtotal} />
          {discount > 0 && (
            <div className={styles.summaryRow}>
              <span>Diskon voucher</span>
              <strong {...tid("shop_txt_cart_discount")}>−{formatRupiah(discount)}</strong>
            </div>
          )}
          <div className={styles.summaryTotal}>
            <span>Total belanja</span>
            <strong {...tid("shop_txt_cart_total")}>{formatRupiah(subtotal - discount)}</strong>
          </div>
          <p className={styles.note}>Ongkir dan biaya layanan dihitung saat checkout.</p>
          <button
            type="button"
            className={styles.primaryBtn}
            {...tid("shop_btn_checkout")}
            disabled={!selected.length}
            onClick={() => navigate("/checkout")}
          >
            Checkout ({selected.length})
          </button>
        </aside>
      </div>
    </div>
  );
}
