import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router";
import { useAccount } from "../app/account";
import { tid } from "../components/testid";
import { CATEGORIES, PRODUCTS, totalStock } from "../data/catalog";
import { RATINGS, searchProducts, SORTS, type SearchQuery, type SortKey } from "../domain/catalogQuery";
import { Icon } from "../features/shop/icons";
import { ProductCard } from "../features/shop/ProductCard";
import { activeFilterCount, filterChips, readSearch, writeSearch, type View } from "../features/shop/searchParams";
import styles from "../features/shop/shop.module.css";

// PRD FR-SHOP-07: infinite scroll 20 produk per halaman.
export const PAGE_SIZE = 20;
const PRICE_SLIDER_MAX = 2_000_000;

type Applied = SearchQuery & { view: View };

const testidSlug = (slug: string) => slug.replace(/-/g, "_");
const ratingTestid = (value: number) => `shop_rad_rating_${value ? String(value).replace(".", "_") : "all"}`;

// Sidebar filter (artboard W-SHOP-04): draf lokal, berlaku setelah "Terapkan".
function FilterPanel({ applied, onApply }: { applied: Applied; onApply: (patch: Partial<SearchQuery>) => void }) {
  const [draft, setDraft] = useState(applied);
  const set = (patch: Partial<SearchQuery>) => setDraft((d) => ({ ...d, ...patch }));
  const count = activeFilterCount(draft);
  const priceValue = (v: string) => (v === "" ? null : Math.max(0, Math.trunc(Number(v))));

  const submit = (e: FormEvent) => {
    e.preventDefault();
    onApply({ cats: draft.cats, min: draft.min, max: draft.max, rating: draft.rating, inStock: draft.inStock });
  };

  return (
    <form aria-label="Filter" className={styles.filter} {...tid("shop_panel_filter")} onSubmit={submit}>
      <div className={styles.filterHead}>
        <h2 {...tid("shop_txt_filter_title")}>Filter</h2>
        <button
          type="button"
          className={styles.ghostBtn}
          {...tid("shop_btn_filter_reset")}
          onClick={() => onApply({ cats: [], min: null, max: null, rating: 0, inStock: false })}
        >
          Reset
        </button>
      </div>

      <fieldset className={styles.fieldset}>
        <legend className={styles.legend}>Kategori</legend>
        {CATEGORIES.map((c) => (
          <label key={c.slug} className={styles.choice}>
            <input
              type="checkbox"
              {...tid(`shop_chk_category_${testidSlug(c.slug)}`)}
              checked={draft.cats.includes(c.slug)}
              onChange={(e) =>
                set({ cats: e.target.checked ? [...draft.cats, c.slug] : draft.cats.filter((x) => x !== c.slug) })
              }
            />
            {c.name}
          </label>
        ))}
      </fieldset>

      <fieldset className={styles.fieldset}>
        <legend className={styles.legend}>Harga (Rp)</legend>
        <div className={styles.priceRow}>
          <label className={styles.smallField}>
            Minimum
            <input
              className={styles.smallInput}
              {...tid("shop_input_price_min")}
              type="number"
              min={0}
              step={1000}
              value={draft.min ?? ""}
              onChange={(e) => set({ min: priceValue(e.target.value) })}
            />
          </label>
          <label className={styles.smallField}>
            Maksimum
            <input
              className={styles.smallInput}
              {...tid("shop_input_price_max")}
              type="number"
              min={0}
              step={1000}
              value={draft.max ?? ""}
              onChange={(e) => set({ max: priceValue(e.target.value) })}
            />
          </label>
        </div>
        <input
          className={styles.range}
          {...tid("shop_sld_price_max")}
          type="range"
          aria-label="Harga maksimum"
          min={0}
          max={PRICE_SLIDER_MAX}
          step={10_000}
          value={draft.max ?? PRICE_SLIDER_MAX}
          onChange={(e) => set({ max: Number(e.target.value) })}
        />
      </fieldset>

      <fieldset className={styles.fieldset}>
        <legend className={styles.legend}>Rating minimal</legend>
        {RATINGS.map((r) => (
          <label key={r.value} className={styles.choice}>
            <input
              type="radio"
              name="rating"
              {...tid(ratingTestid(r.value))}
              checked={draft.rating === r.value}
              onChange={() => set({ rating: r.value })}
            />
            {r.label}
          </label>
        ))}
      </fieldset>

      <label className={styles.choice}>
        <input
          type="checkbox"
          role="switch"
          {...tid("shop_chk_in_stock")}
          checked={draft.inStock}
          onChange={(e) => set({ inStock: e.target.checked })}
        />
        Hanya stok tersedia
      </label>

      <button type="submit" className={styles.primaryBtn} {...tid("shop_btn_filter_apply")}>
        Terapkan
        {count > 0 && (
          <span className={styles.applyBadge} {...tid("shop_badge_filter_count")}>
            {count}
          </span>
        )}
      </button>
    </form>
  );
}

function Results({ products, view }: { products: ReturnType<typeof searchProducts>; view: View }) {
  const [pages, setPages] = useState(1);
  const sentinel = useRef<HTMLDivElement>(null);
  const shown = products.slice(0, pages * PAGE_SIZE);
  const hasMore = shown.length < products.length;

  useEffect(() => {
    const el = sentinel.current;
    if (!hasMore || !el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) setPages((p) => p + 1);
    });
    io.observe(el);
    return () => io.disconnect();
  }, [hasMore, pages]);

  if (!products.length) {
    return (
      <div className={styles.empty} {...tid("shop_txt_empty_result")}>
        <p>Produk tidak ditemukan</p>
        <span>Coba kata kunci lain atau kurangi filter.</span>
      </div>
    );
  }

  return (
    <>
      <ul className={view === "list" ? styles.listView : styles.grid} {...tid("shop_grid_result")}>
        {shown.map((p) => (
          <ProductCard key={p.id} product={p} view={view} />
        ))}
      </ul>
      <div ref={sentinel} className={styles.listFooter} role="status">
        {hasMore ? (
          <span {...tid("shop_txt_load_more")}>Memuat produk lainnya…</span>
        ) : (
          <span {...tid("shop_txt_list_end")}>Semua produk sudah ditampilkan</span>
        )}
      </div>
    </>
  );
}

export default function SearchPage() {
  const { account } = useAccount();
  const [params, setParams] = useSearchParams();
  const applied = readSearch(params);
  const update = (patch: Partial<Applied>) => setParams(writeSearch({ ...applied, ...patch }));
  const products = searchProducts(PRODUCTS, applied, (p) => totalStock(account.stock, p));
  // Daftar & panel filter mulai ulang setiap query/filter berubah (tidak untuk ganti tampilan).
  const resultKey = writeSearch({ ...applied, view: "grid" }).toString();
  const chips = filterChips(applied);

  return (
    <div className={styles.pageTight}>
      <nav {...tid("shop_nav_breadcrumb")} aria-label="Breadcrumb" className={styles.breadcrumb}>
        <ol {...tid("shop_list_breadcrumb")}>
          <li>
            <Link {...tid("shop_link_breadcrumb_home")} to="/">Beranda</Link>
          </li>
          <li aria-current="page">Hasil pencarian</li>
        </ol>
      </nav>

      <div className={styles.searchLayout}>
        <FilterPanel key={resultKey} applied={applied} onApply={update} />

        <section className={styles.pageTight} aria-label="Hasil pencarian">
          <div className={styles.resultHead}>
            <h1 {...tid("shop_txt_search_title")}>
              <span {...tid("shop_txt_result_count")}>
                {products.length} produk · {SORTS[applied.sort]}
              </span>
              {applied.q && <> untuk "{applied.q}"</>}
            </h1>
            <label htmlFor="shop_spn_sort" className={styles.muted}>
              Urutkan
            </label>
            <select
              className={styles.select}
              {...tid("shop_spn_sort")}
              value={applied.sort}
              onChange={(e) => update({ sort: e.target.value as SortKey })}
            >
              {Object.entries(SORTS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <div className={styles.toggle} role="group" aria-label="Tampilan">
              <button
                type="button"
                aria-label="Tampilan grid"
                aria-pressed={applied.view === "grid"}
                {...tid("shop_btn_view_grid")}
                onClick={() => update({ view: "grid" })}
              >
                <Icon name="grid" size={18} />
              </button>
              <button
                type="button"
                aria-label="Tampilan list"
                aria-pressed={applied.view === "list"}
                {...tid("shop_btn_view_list")}
                onClick={() => update({ view: "list" })}
              >
                <Icon name="list" size={18} />
              </button>
            </div>
          </div>

          {chips.length > 0 && (
          <ul {...tid("shop_list_active_filter")} className={styles.chips} aria-label="Filter aktif">
            {chips.map((c) => (
              <li key={c.label} className={styles.chip} {...tid.list("shop_chip_active_filter")}>
                {c.label}
                <button {...tid.list("shop_btn_remove_filter")} type="button" aria-label={`Hapus filter ${c.label}`} onClick={() => update(c.remove(applied))}>
                  <Icon name="close" size={14} strokeWidth={2.4} />
                </button>
              </li>
            ))}
          </ul>
          )}

          <Results key={resultKey} products={products} view={applied.view} />
        </section>
      </div>
    </div>
  );
}
