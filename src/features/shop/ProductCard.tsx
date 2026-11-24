import { Link } from "react-router";
import { useAccount } from "../../app/account";
import { tid } from "../../components/testid";
import { discountPercent, firstAvailable, type Product } from "../../data/catalog";
import { formatRating, formatRupiah } from "../../domain/money";
import { Icon } from "./icons";
import { ProductImage } from "./ProductImage";
import styles from "./shop.module.css";
import { useAddToCart } from "./useShopActions";

export function OldPrice({ product }: { product: Product }) {
  if (!product.orig) return null;
  return (
    <span className={styles.oldPrice}>
      <span className={styles.strike}>{formatRupiah(product.orig)}</span>
      <span className={styles.discount}>−{discountPercent(product)}%</span>
    </span>
  );
}

// PRD FR-SHOP-07a: "+ Keranjang" di setiap kartu (teks kembar disengaja → locator relatif);
// list: tombol ikon dengan aria-label; stok 0 → "Stok Habis" disabled.
export function ProductCard({ product, view = "grid" }: { product: Product; view?: "grid" | "list" }) {
  const { account } = useAccount();
  const addToCart = useAddToCart();
  const variant = firstAvailable(account.stock, product);
  const href = `/shop/product/${product.id}`;
  const add = () => variant && void addToCart(product, variant);

  const body = (
    <>
      <span className={styles.cardName} {...tid.list("shop_txt_product_name")}>
        {product.name}
      </span>
      <span className={styles.price} {...tid.list("shop_txt_product_price")}>
        {formatRupiah(product.price)}
      </span>
      <OldPrice product={product} />
      <span className={styles.rating}>★ {formatRating(product.rating)}</span>
    </>
  );

  if (view === "list") {
    return (
      <li className={styles.row} {...tid.list("shop_card_product")}>
        <Link {...tid.list("shop_link_product")} to={href} className={styles.rowLink}>
          <ProductImage product={product} className={styles.rowImage} iconSize={32} />
          <span className={styles.cardBody}>{body}</span>
        </Link>
        <button
          type="button"
          className={styles.rowAdd}
          {...tid.list("shop_btn_add_to_cart")}
          aria-label={variant ? `Tambah ${product.name} ke keranjang` : `${product.name} stok habis`}
          disabled={!variant}
          onClick={add}
        >
          <Icon name={variant ? "plus" : "close"} />
        </button>
      </li>
    );
  }

  return (
    <li className={styles.card} {...tid.list("shop_card_product")}>
      <Link {...tid.list("shop_link_product")} to={href} className={styles.cardLink}>
        <ProductImage product={product} className={styles.cardImage} />
        <span className={styles.cardBody}>{body}</span>
      </Link>
      <div className={styles.cardAction}>
        {variant ? (
          <button type="button" className={styles.outlineBtn} {...tid.list("shop_btn_add_to_cart")} onClick={add}>
            + Keranjang
          </button>
        ) : (
          <button type="button" className={styles.outlineBtn} {...tid.list("shop_btn_add_to_cart")} disabled>
            Stok Habis
          </button>
        )}
      </div>
    </li>
  );
}
