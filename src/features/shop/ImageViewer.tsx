import { useEffect, useRef, useState, type WheelEvent } from "react";
import { tid } from "../../components/testid";
import type { Product } from "../../data/catalog";
import styles from "./ImageViewer.module.css";
import { Icon } from "./icons";
import { IMAGE_COUNT, ProductImage } from "./ProductImage";

// PRD FR-SHOP-13: zoom 50–300% (+/−, Ctrl + scroll), double click 2×, indikator "2,0×",
// panah keyboard antar gambar, "3/5", thumbnail, Esc menutup.
export const ZOOM_MIN = 0.5;
export const ZOOM_MAX = 3;
const ZOOM_STEP = 0.5;

const clampZoom = (z: number) => Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Math.round(z * 10) / 10));
export const formatZoom = (z: number) => `${z.toFixed(1).replace(".", ",")}×`;

export function ImageViewer({ product, start, onClose }: { product: Product; start: number; onClose: (index: number) => void }) {
  const [index, setIndex] = useState(start);
  const [zoom, setZoom] = useState(1);
  const dialog = useRef<HTMLDivElement>(null);
  const closeBtn = useRef<HTMLButtonElement>(null);

  const go = (i: number) => {
    setIndex((i + IMAGE_COUNT) % IMAGE_COUNT);
    setZoom(1);
  };
  const close = () => onClose(index);

  useEffect(() => {
    closeBtn.current?.focus();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = overflow;
    };
  }, []);

  // Di document, bukan di dialog: klik/double click pada gambar memindah fokus ke body.
  const onKeyDown = (e: globalThis.KeyboardEvent) => {
    if (e.key === "Escape") close();
    else if (e.key === "ArrowLeft") go(index - 1);
    else if (e.key === "ArrowRight") go(index + 1);
    else if (e.key === "Tab") {
      // Fokus terkunci di dalam dialog.
      const items = [...dialog.current!.querySelectorAll<HTMLElement>("button:not(:disabled)")];
      const first = items[0];
      const last = items[items.length - 1];
      const inside = items.includes(document.activeElement as HTMLElement);
      if (e.shiftKey && (!inside || document.activeElement === first)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (!inside || document.activeElement === last)) {
        e.preventDefault();
        first.focus();
      }
    }
  };

  const keyHandler = useRef(onKeyDown);
  useEffect(() => {
    keyHandler.current = onKeyDown;
  });
  useEffect(() => {
    const listener = (e: globalThis.KeyboardEvent) => keyHandler.current(e);
    document.addEventListener("keydown", listener);
    return () => document.removeEventListener("keydown", listener);
  }, []);

  const onWheel = (e: WheelEvent) => {
    if (!e.ctrlKey) return;
    e.preventDefault();
    setZoom((z) => clampZoom(z + (e.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP)));
  };

  return (
    <div className={styles.scrim} onMouseDown={(e) => e.target === e.currentTarget && close()}>
      <div
        ref={dialog}
        role="dialog"
        aria-modal="true"
        aria-label={`Gambar ${product.name}`}
        className={styles.dialog}
        {...tid("shop_dialog_image_viewer")}
      >
        <div className={styles.toolbar}>
          <span className={styles.counter} {...tid("shop_txt_viewer_indicator")}>
            {index + 1}/{IMAGE_COUNT}
          </span>
          {zoom !== 1 && (
            <span className={styles.zoomLevel} {...tid("shop_txt_zoom_level")}>
              {formatZoom(zoom)}
            </span>
          )}
          <div className={styles.actions}>
            <button type="button" aria-label="Perkecil" {...tid("shop_btn_zoom_out")} disabled={zoom <= ZOOM_MIN} onClick={() => setZoom((z) => clampZoom(z - ZOOM_STEP))}>
              <Icon name="minus" />
            </button>
            <button type="button" aria-label="Perbesar" {...tid("shop_btn_zoom_in")} disabled={zoom >= ZOOM_MAX} onClick={() => setZoom((z) => clampZoom(z + ZOOM_STEP))}>
              <Icon name="plus" />
            </button>
            <button ref={closeBtn} type="button" aria-label="Tutup" {...tid("shop_btn_viewer_close")} onClick={close}>
              <Icon name="close" />
            </button>
          </div>
        </div>

        <div className={styles.stage} onWheel={onWheel} onDoubleClick={() => setZoom((z) => (z === 1 ? 2 : 1))}>
          <div className={styles.zoomBox} style={{ transform: `scale(${zoom})` }}>
            <ProductImage product={product} index={index} iconSize={120} className={styles.image} label={`${product.name}, gambar ${index + 1}`} />
          </div>
          <button type="button" className={`${styles.arrow} ${styles.prev}`} aria-label="Gambar sebelumnya" {...tid("shop_btn_viewer_prev")} onClick={() => go(index - 1)}>
            <Icon name="chevronLeft" />
          </button>
          <button type="button" className={`${styles.arrow} ${styles.next}`} aria-label="Gambar berikutnya" {...tid("shop_btn_viewer_next")} onClick={() => go(index + 1)}>
            <Icon name="chevronRight" />
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
              {...tid.list("shop_btn_viewer_thumb")}
              onClick={() => go(i)}
            >
              <ProductImage product={product} index={i} iconSize={28} />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
