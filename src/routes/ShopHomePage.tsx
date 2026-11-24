import { useEffect, useState, type CSSProperties } from "react";
import { Link, useNavigate } from "react-router";
import { useAccount } from "../app/account";
import { tid } from "../components/testid";
import { CATEGORIES, firstAvailable, PRODUCTS } from "../data/catalog";
import { recommendations } from "../domain/catalogQuery";
import { formatRupiah } from "../domain/money";
import { Icon } from "../features/shop/icons";
import { ProductCard } from "../features/shop/ProductCard";
import { ProductImage } from "../features/shop/ProductImage";
import styles from "../features/shop/shop.module.css";
import { useAddToCart } from "../features/shop/useShopActions";
import { isDeterministic } from "../sim/settings";

// PRD FR-SHOP-01: carousel auto-slide 4 dtk.
export const BANNER_MS = 4_000;
const BANNERS = [
  { kicker: "VOUCHER", title: "HEMAT10", text: "Diskon 10% subtotal, maksimal Rp50.000.", bg: "var(--pm-dark-surface)", accent: "var(--pm-dark-accent)" },
  { kicker: "PRACTICEPAY", title: "Cashback 5%", text: "Bayar belanja dengan PracticePay, cashback maks Rp10.000.", bg: "var(--pm-primary)", accent: "var(--pm-primary-container)" },
  { kicker: "ONGKIR", title: "Gratis ongkir s/d Rp20.000", text: "Pakai kode ONGKIR saat checkout.", bg: "var(--pm-info-strong)", accent: "var(--pm-info-container)" },
];

// Kontrak §2: durasi awal flash sale 02:14:37.
export const FLASH_SECONDS = 2 * 3600 + 14 * 60 + 37;
// Produk diskon di katalog (punya harga coret); kontrak belum menetapkan harga flash khusus.
const FLASH_PRODUCTS = PRODUCTS.filter((p) => p.orig).slice(0, 4);

const two = (n: number) => String(n).padStart(2, "0");

function Carousel() {
  const [index, setIndex] = useState(0);
  const go = (i: number) => setIndex((i + BANNERS.length) % BANNERS.length);

  // Interval di-reset setiap pindah manual agar banner tidak langsung berganti lagi.
  useEffect(() => {
    const t = setInterval(() => setIndex((i) => (i + 1) % BANNERS.length), BANNER_MS);
    return () => clearInterval(t);
  }, [index]);

  const b = BANNERS[index];
  return (
    <section
      aria-roledescription="carousel"
      aria-label="Promo"
      className={styles.banner}
      style={{ "--banner-bg": b.bg, "--banner-accent": b.accent } as CSSProperties}
      {...tid("shop_carousel_banner")}
    >
      <div className={styles.bannerBody} aria-live="polite" {...tid("shop_txt_banner_title")}>
        <span className={styles.bannerKicker}>{b.kicker}</span>
        <h1 className={styles.bannerTitle}>{b.title}</h1>
        <p className={styles.bannerText}>{b.text}</p>
      </div>
      <button type="button" className={`${styles.bannerArrow} ${styles.bannerPrev}`} aria-label="Banner sebelumnya" {...tid("shop_btn_banner_prev")} onClick={() => go(index - 1)}>
        <Icon name="chevronLeft" />
      </button>
      <button type="button" className={`${styles.bannerArrow} ${styles.bannerNext}`} aria-label="Banner berikutnya" {...tid("shop_btn_banner_next")} onClick={() => go(index + 1)}>
        <Icon name="chevronRight" />
      </button>
      <div role="tablist" aria-label="Pilih banner" className={styles.dots}>
        {BANNERS.map((_, i) => (
          <button
            key={i}
            type="button"
            role="tab"
            aria-selected={i === index}
            aria-label={`Banner ${i + 1}`}
            className={styles.dot}
            {...tid.list("shop_btn_banner_dot")}
            onClick={() => go(i)}
          />
        ))}
      </div>
    </section>
  );
}

function FlashSale() {
  const { account } = useAccount();
  const addToCart = useAddToCart();
  const navigate = useNavigate();
  const [left, setLeft] = useState(FLASH_SECONDS);

  useEffect(() => {
    const t = setInterval(() => setLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, []);

  // PRD FR-SHOP-15: "Beli" hanya aktif selama countdown. Checkout belum ada → masuk keranjang.
  const buy = async (id: string) => {
    const product = FLASH_PRODUCTS.find((p) => p.id === id)!;
    const variant = firstAvailable(account.stock, product)!;
    if (await addToCart(product, variant)) navigate("/shop/cart");
  };

  return (
    <section aria-labelledby="h_flash" className={`${styles.section} ${styles.flash}`}>
      <div className={styles.flashHead}>
        <Icon name="bolt" size={22} />
        <h2 data-testid="shop_txt_flash_title" id="h_flash" className={styles.h2}>
          Flash Sale
        </h2>
        <span>berakhir dalam</span>
        <span role="timer" aria-label="Sisa waktu flash sale" className={styles.countdown} {...tid("shop_txt_flash_countdown")}>
          <span>{two(Math.floor(left / 3600))}</span>:<span>{two(Math.floor((left % 3600) / 60))}</span>:<span>{two(left % 60)}</span>
        </span>
      </div>
      <ul {...tid("shop_grid_flash")} className={styles.grid}>
        {FLASH_PRODUCTS.map((p) => (
          <li key={p.id} className={styles.card} {...tid.list("shop_card_flash")}>
            <Link {...tid.list("shop_link_flash_product")} to={`/shop/product/${p.id}`} className={styles.cardLink}>
              <ProductImage product={p} className={styles.cardImage} />
              <span className={styles.cardBody}>
                <span className={styles.cardName}>{p.name}</span>
                <span className={styles.flashPrice}>{formatRupiah(p.price)}</span>
                <span className={`${styles.oldPrice} ${styles.strike}`}>{formatRupiah(p.orig!)}</span>
              </span>
            </Link>
            <div className={styles.cardAction}>
              <button
                type="button"
                className={styles.flashBuy}
                {...tid.list("shop_btn_flash_buy")}
                disabled={left === 0 || !firstAvailable(account.stock, p)}
                onClick={() => void buy(p.id)}
              >
                Beli
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default function ShopHomePage() {
  const { account } = useAccount();
  // PRD FR-SHOP-02: diacak setiap Beranda dibuka, tetap bila mode deterministik.
  const [recommended] = useState(() => recommendations(PRODUCTS, isDeterministic()));

  return (
    <div className={styles.page}>
      <p className={styles.greeting} {...tid("shop_txt_greeting")}>
        Halo, <strong>{account.name}</strong>
      </p>

      <Carousel />

      <section aria-labelledby="h_cat" className={styles.section}>
        <h2 data-testid="shop_txt_category_title" id="h_cat" className={styles.h2}>
          Kategori
        </h2>
        <div className={styles.categories}>
          {CATEGORIES.map((c) => (
            <Link
              key={c.slug}
              to={`/shop/search?cat=${c.slug}`}
              className={styles.category}
              style={{ "--img-fg": `var(--pm-cat-${c.slug}-fg)` } as CSSProperties}
              {...tid.list("shop_item_category")}
            >
              <span className={styles.categoryDot} aria-hidden="true" />
              {c.name}
            </Link>
          ))}
        </div>
      </section>

      <FlashSale />

      <section aria-labelledby="h_rec" className={styles.section}>
        <div className={styles.sectionHead}>
          <h2 data-testid="shop_txt_recommendation_title" id="h_rec" className={styles.h2}>
            Rekomendasi untukmu
          </h2>
          <Link to="/shop/search" className={styles.linkStrong} {...tid("shop_link_see_all")}>
            Lihat semua
          </Link>
        </div>
        <ul className={styles.grid} {...tid("shop_grid_recommendation")}>
          {recommended.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </ul>
      </section>
    </div>
  );
}
