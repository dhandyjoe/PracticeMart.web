import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { useAccount } from "../app/account";
import { tid } from "../components/testid";
import { categoryName, productById, stockOf, variantKey, variants, type Product } from "../data/catalog";
import { MAX_QTY_TEXT, maxQty } from "../domain/cartRules";
import { formatRating, formatRupiah } from "../domain/money";
import { Icon } from "../features/shop/icons";
import { ImageViewer } from "../features/shop/ImageViewer";
import { OldPrice } from "../features/shop/ProductCard";
import { IMAGE_COUNT, ProductImage } from "../features/shop/ProductImage";
import styles from "../features/shop/shop.module.css";
import { useAddToCart, useWishlist } from "../features/shop/useShopActions";
import NotFoundPage from "./NotFoundPage";

function Gallery({ product }: { product: Product }) {
  const [index, setIndex] = useState(0);
  const [viewer, setViewer] = useState(false);
  const go = (i: number) => setIndex((i + IMAGE_COUNT) % IMAGE_COUNT);

  return (
    <div className={styles.gallery}>
      <div className={styles.mainImageWrap}>
        <ProductImage
          product={product}
          index={index}
          iconSize={140}
          className={styles.mainImage}
          label={`${product.name}, gambar ${index + 1}`}
          testid="shop_img_product_main"
        />
        <button type="button" className={`${styles.iconBtn} ${styles.galleryArrow} ${styles.galleryPrev}`} aria-label="Gambar sebelumnya" {...tid("shop_btn_gallery_prev")} onClick={() => go(index - 1)}>
          <Icon name="chevronLeft" />
        </button>
        <button type="button" className={`${styles.iconBtn} ${styles.galleryArrow} ${styles.galleryNext}`} aria-label="Gambar berikutnya" {...tid("shop_btn_gallery_next")} onClick={() => go(index + 1)}>
          <Icon name="chevronRight" />
        </button>
        <span className={styles.galleryIndicator} {...tid("shop_txt_gallery_indicator")}>
          {index + 1}/{IMAGE_COUNT}
        </span>
        <button type="button" className={`${styles.iconBtn} ${styles.zoomBtn}`} aria-label="Perbesar gambar" {...tid("shop_btn_open_viewer")} onClick={() => setViewer(true)}>
          <Icon name="expand" />
        </button>
      </div>
      <div role="tablist" aria-label="Pilih gambar" className={styles.thumbs}>
        {Array.from({ length: IMAGE_COUNT }, (_, i) => (
          <button
            key={i}
            type="button"
            role="tab"
            aria-selected={i === index}
            aria-label={`Gambar ${i + 1}`}
            className={styles.thumb}
            {...tid.list("shop_btn_gallery_thumb")}
            onClick={() => setIndex(i)}
          >
            <ProductImage product={product} index={i} iconSize={28} />
          </button>
        ))}
      </div>
      {viewer && (
        <ImageViewer
          product={product}
          start={index}
          onClose={(i) => {
            setIndex(i);
            setViewer(false);
          }}
        />
      )}
    </div>
  );
}

function ProductDetail({ product }: { product: Product }) {
  const { account, refreshStock } = useAccount();
  const addToCart = useAddToCart();
  const navigate = useNavigate();
  const wishlist = useWishlist(product.id);
  const all = variants(product);
  const left = (color: string, size: string) => stockOf(account.stock, product.id, variantKey(color, size));
  const initial = all.find((v) => left(v.color, v.size) > 0) ?? all[0];
  const [color, setColor] = useState(initial.color);
  const [size, setSize] = useState(initial.size);
  const [qty, setQty] = useState(1);
  const [qtyError, setQtyError] = useState(false);
  const [tip, setTip] = useState<string>();

  // Architecture §13: Detail Produk membaca ulang stok agar segar.
  useEffect(() => {
    void refreshStock().catch(() => {});
  }, [product.id, refreshStock]);

  const stock = left(color, size);
  const max = maxQty(stock);
  const colorAvailable = (c: string) => all.some((v) => v.color === c && left(c, v.size) > 0);

  const changeQty = (next: number) => {
    setQtyError(next > max);
    setQty(Math.max(1, Math.min(next, Math.max(max, 1))));
  };

  const pickColor = (c: string) => {
    setColor(c);
    // Ukuran yang habis untuk warna baru → pindah ke ukuran pertama yang tersedia.
    if (product.sizes.length && left(c, size) === 0) {
      setSize(product.sizes.find((s) => left(c, s) > 0) ?? size);
    }
    setQty(1);
    setQtyError(false);
  };

  return (
    <div className={styles.productLayout}>
      <Gallery product={product} />

      <div className={styles.info}>
        <div className={styles.titleRow}>
          <h1 className={styles.productTitle} {...tid("shop_txt_product_name")}>
            {product.name}
          </h1>
          <button
            type="button"
            className={`${styles.iconBtn} ${styles.wish}`}
            aria-pressed={wishlist.on}
            aria-label={wishlist.on ? "Hapus dari wishlist" : "Tambah ke wishlist"}
            {...tid("shop_btn_wishlist")}
            onClick={() => void wishlist.toggle()}
          >
            <Icon name="heart" fill={wishlist.on ? "currentColor" : "none"} />
          </button>
        </div>
        <span className={styles.rating}>
          ★ {formatRating(product.rating)} · {categoryName(product.cat)}
        </span>
        <span className={styles.productPrice} {...tid("shop_txt_product_price")}>
          {formatRupiah(product.price)}
        </span>
        <OldPrice product={product} />

        {product.colors.length > 0 && (
          <div className={styles.variantGroup}>
            <span className={styles.variantLabel}>
              Warna: <strong {...tid("shop_txt_selected_color")}>{color}</strong>
            </span>
            <div role="radiogroup" aria-label="Warna" className={styles.chipsRow}>
              {product.colors.map((c) => {
                const off = !colorAvailable(c);
                return (
                  <button
                    key={c}
                    type="button"
                    role="radio"
                    aria-checked={c === color}
                    aria-disabled={off}
                    className={styles.variantChip}
                    {...tid.list("shop_chip_color")}
                    onClick={() => !off && pickColor(c)}
                  >
                    {c}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {product.sizes.length > 0 && (
          <div className={styles.variantGroup}>
            <span className={styles.variantLabel}>
              Ukuran: <strong {...tid("shop_txt_selected_size")}>{size}</strong>
            </span>
            <div role="radiogroup" aria-label="Ukuran" className={styles.chipsRow}>
              {product.sizes.map((s) => {
                const off = left(color, s) === 0;
                const tipText = `Stok habis untuk ${[color, s].filter(Boolean).join(" · ")}`;
                const tipId = `tip_size_${s}`;
                return (
                  <span key={s} className={styles.chipWrap}>
                    <button
                      type="button"
                      role="radio"
                      aria-checked={s === size}
                      aria-disabled={off}
                      aria-describedby={off ? tipId : undefined}
                      className={styles.variantChip}
                      {...tid.list("shop_chip_size")}
                      onClick={() => {
                        if (off) return;
                        setSize(s);
                        setQty(1);
                        setQtyError(false);
                      }}
                      onMouseEnter={() => off && setTip(s)}
                      onMouseLeave={() => setTip(undefined)}
                      onFocus={() => off && setTip(s)}
                      onBlur={() => setTip(undefined)}
                    >
                      {s}
                    </button>
                    {/* Selalu ada di DOM agar aria-describedby valid; terlihat saat hover/fokus. */}
                    {off && (
                      <span role="tooltip" id={tipId} className={styles.tooltip} hidden={tip !== s} {...tid.list("shop_txt_variant_tooltip")}>
                        {tipText}
                      </span>
                    )}
                  </span>
                );
              })}
            </div>
          </div>
        )}

        <div className={styles.variantGroup}>
          <label htmlFor="shop_input_qty" className={styles.variantLabel}>
            Jumlah
          </label>
          <div className={styles.stepper}>
            <button type="button" className={styles.iconBtn} aria-label="Kurangi jumlah" {...tid("shop_btn_qty_minus")} disabled={qty <= 1 || !stock} onClick={() => changeQty(qty - 1)}>
              <Icon name="minus" />
            </button>
            <input
              className={styles.qtyInput}
              {...tid("shop_input_qty")}
              type="number"
              inputMode="numeric"
              min={1}
              max={max}
              value={qty}
              disabled={!stock}
              onChange={(e) => changeQty(Math.trunc(Number(e.target.value)) || 1)}
            />
            <button type="button" className={styles.iconBtn} aria-label="Tambah jumlah" {...tid("shop_btn_qty_plus")} disabled={!stock} onClick={() => changeQty(qty + 1)}>
              <Icon name="plus" />
            </button>
            <span className={styles.muted} {...tid("shop_txt_stock_left")}>
              Stok {stock}
            </span>
          </div>
          {qtyError && (
            <span role="alert" className={styles.inlineError} {...tid("shop_txt_qty_error")}>
              {MAX_QTY_TEXT}
            </span>
          )}
        </div>

        <div className={styles.buyRow}>
          <button
            type="button"
            className={styles.outlineBtn}
            {...tid("shop_btn_buy_now")}
            disabled={!stock}
            onClick={() => navigate("/checkout", { state: { buyNow: { productId: product.id, color, size, qty, selected: true, saved: false } } })}
          >
            Beli Sekarang
          </button>
          {stock > 0 ? (
            <button
              type="button"
              className={styles.primaryBtn}
              {...tid("shop_btn_add_to_cart")}
              onClick={() => void addToCart(product, { color, size, key: variantKey(color, size) }, qty)}
            >
              + Keranjang
            </button>
          ) : (
            <button type="button" className={styles.primaryBtn} {...tid("shop_btn_add_to_cart")} disabled>
              Stok Habis
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ProductPage() {
  const product = productById(useParams().id ?? "");
  if (!product) return <NotFoundPage />;

  return (
    <div className={styles.pageTight}>
      <nav {...tid("shop_nav_breadcrumb")} aria-label="Breadcrumb" className={styles.breadcrumb}>
        <ol {...tid("shop_list_breadcrumb")}>
          <li>
            <Link {...tid("shop_link_breadcrumb_home")} to="/">Beranda</Link>
          </li>
          <li>
            <Link {...tid("shop_link_breadcrumb_category")} to={`/shop/search?cat=${product.cat}`}>{categoryName(product.cat)}</Link>
          </li>
          <li aria-current="page">{product.name}</li>
        </ol>
      </nav>
      {/* key: ganti produk = state varian & qty mulai ulang. */}
      <ProductDetail key={product.id} product={product} />
    </div>
  );
}
