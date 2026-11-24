import { useState, type KeyboardEvent } from "react";
import { Link } from "react-router";
import { useAccount } from "../app/account";
import { useSnackbar } from "../components/Snackbar";
import { tid } from "../components/testid";
import { productById } from "../data/catalog";
import { formatRupiah } from "../domain/money";
import account from "../features/account/account.module.css";
import { AccountNav } from "../features/account/AccountNav";
import { Icon } from "../features/shop/icons";
import { ProductImage } from "../features/shop/ProductImage";
import shop from "../features/shop/shop.module.css";

const moveTo = (list: string[], id: string, to: number) => {
  const next = list.filter((x) => x !== id);
  next.splice(to, 0, id);
  return next;
};

// PRD FR-SHOP-12: daftar wishlist, hapus, atur urutan dengan drag & drop (alternatif keyboard: Spasi pilih, panah pindah, Esc batal).
export default function WishlistPage() {
  const { account: acc, update } = useAccount();
  const snackbar = useSnackbar();
  // Urutan sementara selama mengangkat item dengan keyboard; disimpan ke cloud sekali saat ditaruh.
  const [draft, setDraft] = useState<string[] | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const [live, setLive] = useState("");

  // Produk yang tidak ada di katalog hanya disembunyikan, tidak dibuang saat urutan disimpan.
  const full = draft ?? acc.state.wishlist;
  const ids = full.filter((id) => productById(id));
  const name = (id: string) => productById(id)!.name;
  const save = (order: string[]) => void update("wishlist", () => order);
  const remove = (id: string) => {
    void update("wishlist", (list) => list.filter((x) => x !== id));
    snackbar({ text: "Dihapus dari wishlist" });
  };

  const onHandleKey = (e: KeyboardEvent, id: string) => {
    if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      if (picked) {
        save(full);
        setLive(`${name(picked)} ditaruh di posisi ${ids.indexOf(picked) + 1}`);
        setPicked(null);
        setDraft(null);
      } else {
        setPicked(id);
        setDraft(full);
        setLive(`${name(id)} diangkat. Gunakan panah atas/bawah, Spasi untuk menaruh, Esc untuk batal`);
      }
    } else if (picked && (e.key === "ArrowUp" || e.key === "ArrowDown")) {
      e.preventDefault();
      const to = Math.min(Math.max(ids.indexOf(picked) + (e.key === "ArrowUp" ? -1 : 1), 0), ids.length - 1);
      setDraft(moveTo(full, picked, full.indexOf(ids[to])));
      setLive(`${name(picked)} posisi ${to + 1} dari ${ids.length}`);
    } else if (picked && e.key === "Escape") {
      setPicked(null);
      setDraft(null);
      setLive("Pemindahan dibatalkan");
    }
  };

  return (
    <div className={account.layout}>
      <AccountNav />
      <div className={account.content}>
        <h1 {...tid("shop_txt_wishlist_title")}>Wishlist</h1>
        {!ids.length ? (
          <div className={shop.empty}>
            <Icon name="heart" size={40} />
            <p {...tid("shop_txt_wishlist_empty")}>Wishlist masih kosong</p>
            <Link to="/" className={shop.primaryBtn} {...tid("shop_btn_start_shopping")}>
              Mulai belanja
            </Link>
          </div>
        ) : (
          <ol className={shop.listView} {...tid("shop_list_wishlist")}>
            {ids.map((id) => {
              const p = productById(id)!;
              return (
                <li
                  key={id}
                  className={shop.row}
                  draggable
                  data-picked={picked === id || dragging === id}
                  {...tid.list("shop_item_wishlist")}
                  onDragStart={(e) => {
                    e.dataTransfer?.setData("text/plain", id);
                    setDragging(id);
                  }}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    // dataTransfer, bukan state: drop bisa datang sebelum render dari dragstart selesai.
                    const from = e.dataTransfer?.getData("text/plain") || dragging;
                    if (from && from !== id && full.includes(from)) save(moveTo(full, from, full.indexOf(id)));
                    setDragging(null);
                  }}
                  onDragEnd={() => setDragging(null)}
                >
                  <button
                    type="button"
                    className={shop.iconBtn}
                    aria-label={`Pindahkan ${p.name}`}
                    aria-pressed={picked === id}
                    data-handle={id}
                    {...tid.list("shop_btn_wishlist_drag")}
                    onKeyDown={(e) => onHandleKey(e, id)}
                  >
                    <Icon name="grip" strokeWidth={3.5} />
                  </button>
                  <Link to={`/shop/product/${id}`} className={shop.rowLink} {...tid.list("shop_link_wishlist_product")}>
                    <ProductImage product={p} className={shop.rowImage} iconSize={32} />
                    <span className={shop.cardBody}>
                      <span className={shop.cardName}>{p.name}</span>
                      <span className={shop.price}>{formatRupiah(p.price)}</span>
                    </span>
                  </Link>
                  <button type="button" className={shop.iconBtn} aria-label="Hapus dari wishlist" {...tid.list("shop_btn_wishlist_remove")} onClick={() => remove(id)}>
                    <Icon name="trash" />
                  </button>
                </li>
              );
            })}
          </ol>
        )}
        <p aria-live="assertive" className={account.srOnly} {...tid("shop_txt_wishlist_live")}>
          {live}
        </p>
      </div>
    </div>
  );
}
