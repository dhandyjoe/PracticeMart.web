import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent, type RefObject } from "react";
import { Link, useNavigate } from "react-router";
import { useAccount } from "../app/account";
import { CATEGORIES, PRODUCTS } from "../data/catalog";
import { cartCount } from "../domain/cartRules";
import { pushHistory, suggest } from "../domain/catalogQuery";
import { formatRupiah } from "../domain/money";
import { initials } from "../features/account/AccountNav";
import { Icon } from "../features/shop/icons";
import styles from "./AppHeader.module.css";
import { tid } from "./testid";
import { useLogoutConfirm } from "./useLogoutConfirm";

const CATEGORY_HINT: Record<string, string> = {
  fashion: "Kaos, kemeja, celana",
  elektronik: "Audio, jam pintar",
  "rumah-tangga": "Dapur, dekorasi",
  olahraga: "Sepatu, perlengkapan",
  buku: "Catatan, novel",
  kecantikan: "Perawatan kulit",
};

// Tutup popup saat klik di luar atau Esc (design §14.3).
function useDismiss(open: boolean, ref: RefObject<HTMLElement | null>, close: () => void) {
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) close();
    };
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, ref, close]);
}

function CategoryMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const hover = useRef<ReturnType<typeof setTimeout>>(undefined);
  useDismiss(open, ref, () => setOpen(false));
  useEffect(() => () => clearTimeout(hover.current), []);

  return (
    <div
      ref={ref}
      className={styles.popupWrap}
      onMouseEnter={() => {
        hover.current = setTimeout(() => setOpen(true), 150);
      }}
      onMouseLeave={() => {
        clearTimeout(hover.current);
        setOpen(false);
      }}
    >
      <button
        type="button"
        className={styles.categoryBtn}
        {...tid("shop_tab_category")}
        aria-haspopup="true"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <Icon name="menu" size={18} />
        Kategori
      </button>
      {open && (
        <div role="menu" aria-label="Kategori" className={styles.mega} {...tid("shop_menu_category")}>
          {CATEGORIES.map((c) => (
            <Link
              key={c.slug}
              role="menuitem"
              to={`/shop/search?cat=${c.slug}`}
              className={styles.megaItem}
              {...tid.list("shop_item_mega_category")}
              onClick={() => setOpen(false)}
            >
              <span className={styles.megaName}>{c.name}</span>
              <span className={styles.megaHint}>{CATEGORY_HINT[c.slug]}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

type Option = { kind: "product"; id: string; label: string } | { kind: "history"; label: string };

// PRD FR-SHOP-04: saran ≥ 2 karakter, Enter → hasil, riwayat 5 terakhir (hapus per item / klik kanan / semua).
function SearchBox() {
  const { account, update } = useAccount();
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [contextFor, setContextFor] = useState<string>();

  const history = account.state.history;
  const typed = q.trim().length >= 2;
  const suggestions = typed ? suggest(PRODUCTS, q) : [];
  const options: Option[] = typed
    ? suggestions.map((p) => ({ kind: "product", id: p.id, label: p.name }))
    : history.map((h) => ({ kind: "history", label: h }));
  const showList = open && (typed || history.length > 0);

  const close = () => {
    setOpen(false);
    setActive(-1);
    setContextFor(undefined);
  };

  const submit = (text: string) => {
    const t = text.trim();
    if (!t) return;
    close();
    navigate(`/shop/search?q=${encodeURIComponent(t)}`);
    void update("history", (h) => pushHistory(h, t));
  };

  const choose = (o: Option) => {
    if (o.kind === "product") {
      close();
      setQ("");
      navigate(`/shop/product/${o.id}`);
    } else {
      setQ(o.label);
      submit(o.label);
    }
  };

  const removeHistory = (h: string) => {
    setContextFor(undefined);
    setActive(-1);
    void update("history", (list) => list.filter((x) => x !== h));
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      setOpen(true);
      if (!options.length) return;
      const step = e.key === "ArrowDown" ? 1 : -1;
      setActive((a) => (a + step + options.length) % options.length);
    } else if (e.key === "Escape") {
      close();
    } else if (e.key === "Enter" && active >= 0 && options[active]) {
      e.preventDefault();
      choose(options[active]);
    }
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    submit(q);
  };

  return (
    <form {...tid("shop_form_search")} role="search" className={styles.search} onSubmit={onSubmit}>
      <label htmlFor="shop_input_search" className={styles.srOnly}>
        Cari produk
      </label>
      <div className={styles.searchField}>
        <Icon name="search" size={18} />
        <input
          {...tid("shop_input_search")}
          type="search"
          role="combobox"
          autoComplete="off"
          placeholder="Cari di PracticeMart"
          aria-expanded={showList}
          aria-controls="shop_list_suggestion"
          aria-autocomplete="list"
          aria-activedescendant={showList && active >= 0 ? `shop_opt_search_${active}` : undefined}
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
            setActive(-1);
          }}
          onFocus={() => setOpen(true)}
          onBlur={close}
          onKeyDown={onKeyDown}
        />
      </div>
      {showList && (
        // mousedown dicegah agar fokus tetap di input saat memilih/menghapus.
        <div className={styles.suggestPanel} onMouseDown={(e) => e.preventDefault()}>
          {!typed && <p className={styles.suggestTitle}>Pencarian terakhir</p>}
          <ul role="listbox" aria-label={typed ? "Saran produk" : "Pencarian terakhir"} {...tid("shop_list_suggestion")}>
            {options.map((o, i) => (
              <li
                key={o.kind === "product" ? o.id : o.label}
                id={`shop_opt_search_${i}`}
                role="option"
                aria-selected={i === active}
                className={styles.option}
                {...tid.list(o.kind === "product" ? "shop_item_suggestion" : "shop_item_search_history")}
                onClick={() => choose(o)}
                onContextMenu={
                  o.kind === "history"
                    ? (e) => {
                        e.preventDefault();
                        setContextFor(o.label);
                      }
                    : undefined
                }
              >
                {o.kind === "history" && <Icon name="clock" size={16} />}
                <span className={styles.optionLabel}>{o.label}</span>
                {o.kind === "history" && (
                  <button
                    type="button"
                    className={styles.optionRemove}
                    aria-label={`Hapus "${o.label}" dari riwayat`}
                    {...tid.list("shop_btn_history_remove")}
                    onClick={(e) => {
                      e.stopPropagation();
                      removeHistory(o.label);
                    }}
                  >
                    <Icon name="close" size={14} />
                  </button>
                )}
                {contextFor === o.label && (
                  <div role="menu" className={styles.contextMenu}>
                    <button
                      type="button"
                      role="menuitem"
                      {...tid("shop_btn_history_context_remove")}
                      onClick={(e) => {
                        e.stopPropagation();
                        removeHistory(o.label);
                      }}
                    >
                      Hapus
                    </button>
                  </div>
                )}
              </li>
            ))}
            {typed && !suggestions.length && (
              <li role="presentation" className={styles.suggestEmpty} {...tid("shop_txt_suggestion_empty")}>
                Tidak ada saran untuk "{q.trim()}"
              </li>
            )}
          </ul>
          {!typed && (
            <button
              type="button"
              className={styles.clearHistory}
              {...tid("shop_btn_history_clear")}
              onClick={() => void update("history", () => [])}
            >
              Hapus semua
            </button>
          )}
        </div>
      )}
    </form>
  );
}

const ACCOUNT_LINKS = [
  { label: "Pesanan Saya", to: "/shop/orders", testid: "acc_link_orders" },
  { label: "Wishlist", to: "/shop/wishlist", testid: "acc_link_wishlist" },
  { label: "PracticePay", to: "/pay", testid: "acc_link_pay" },
  { label: "Profil & Alamat", to: "/account", testid: "acc_link_profile" },
  { label: "Pengaturan", to: "/settings", testid: "acc_link_settings" },
  { label: "Pusat Bantuan", to: "/help", testid: "acc_link_help" },
];

function AccountMenu() {
  const { account } = useAccount();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const logout = useLogoutConfirm();
  useDismiss(open, ref, () => setOpen(false));

  return (
    <div ref={ref} className={styles.popupWrap}>
      {logout.dialog}
      <button
        type="button"
        className={styles.accountBtn}
        {...tid("shop_tab_account")}
        aria-label="Menu akun"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <span className={styles.avatar} aria-hidden="true">
          {initials(account.name)}
        </span>
        <Icon name="chevronDown" size={16} />
      </button>
      {open && (
        <div role="menu" aria-label="Menu akun" className={styles.accountMenu} {...tid("acc_menu")}>
          <p className={styles.signedIn}>
            Masuk sebagai <strong {...tid("acc_txt_display_name")}>{account.name}</strong>
          </p>
          {ACCOUNT_LINKS.map((l) => (
            <Link key={l.to} role="menuitem" to={l.to} className={styles.menuItem} {...tid(l.testid)} onClick={() => setOpen(false)}>
              {l.label}
              {l.to === "/shop/orders" && account.activeOrders > 0 && (
                <span className={styles.menuBadge} {...tid("acc_badge_menu_orders")}>
                  {account.activeOrders}
                </span>
              )}
            </Link>
          ))}
          <button
            type="button"
            role="menuitem"
            className={styles.logout}
            {...tid("acc_btn_logout")}
            onClick={() => {
              setOpen(false);
              logout.ask();
            }}
          >
            Keluar
          </button>
        </div>
      )}
    </div>
  );
}

export function AppHeader() {
  const { account } = useAccount();
  const count = cartCount(account.state.cart);

  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <Link to="/" className={styles.logo} {...tid("shop_tab_home")} aria-label="PracticeMart, Beranda">
          <span className={styles.mark} aria-hidden="true">
            <Icon name="bag" size={20} />
          </span>
          <span className={styles.brand} aria-hidden="true">
            PracticeMart
          </span>
        </Link>
        <CategoryMenu />
        <SearchBox />
        <nav {...tid("shop_nav_account")} aria-label="Akun dan keranjang" className={styles.nav}>
          <Link to="/pay" className={styles.balance} {...tid("shop_tab_pay")}>
            <Icon name="wallet" size={18} />
            <span {...tid("pay_txt_header_balance")}>{formatRupiah(account.state.balance)}</span>
          </Link>
          <Link to="/shop/cart" className={styles.cart} {...tid("shop_tab_cart")} aria-label={`Keranjang, ${count} item`}>
            <Icon name="cart" size={22} />
            {count > 0 && (
              <span className={styles.badge} aria-hidden="true" {...tid("shop_badge_cart")}>
                {count > 99 ? "99+" : count}
              </span>
            )}
          </Link>
          <AccountMenu />
        </nav>
      </div>
    </header>
  );
}
