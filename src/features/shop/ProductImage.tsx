import type { CSSProperties } from "react";
import { tid } from "../../components/testid";
import type { Product } from "../../data/catalog";
import { categoryIcon, Icon } from "./icons";
import styles from "./shop.module.css";

export const IMAGE_COUNT = 5;

// shortcut: placeholder warna kategori + ikon (design §4.18); ganti dengan WebP produk bila aset sudah ada.
export function ProductImage({ product, index = 0, iconSize = 56, className = "", label, testid }: {
  product: Product;
  index?: number;
  iconSize?: number;
  className?: string;
  // Tanpa label = dekoratif (nama produk sudah ada di teks sekitar).
  label?: string;
  testid?: string;
}) {
  const style = {
    "--img-bg": `var(--pm-cat-${product.cat}-bg)`,
    "--img-fg": `var(--pm-cat-${product.cat}-fg)`,
    // Lima "gambar" dibedakan dengan sudut ikon.
    "--img-rotate": `${index * 12}deg`,
  } as CSSProperties;
  return (
    <div
      className={`${styles.image} ${className}`}
      style={style}
      {...(label ? { role: "img", "aria-label": label } : { "aria-hidden": true })}
      {...(testid ? tid(testid) : {})}
    >
      <Icon name={categoryIcon(product.cat)} size={iconSize} strokeWidth={1.4} />
    </div>
  );
}
