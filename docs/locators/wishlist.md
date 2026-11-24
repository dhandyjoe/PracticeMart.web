# Locator — Wishlist (`/shop/wishlist`)

Elemen unik: `id` = `data-testid`. *(list)* = berulang, `data-testid` saja. PRD FR-SHOP-12.

| `data-testid` / `id` | Elemen | Catatan |
|---|---|---|
| `shop_list_wishlist` | daftar (`<ol>`) | urutan = `states/{uid}.wishlist`; produk yang tidak ada di katalog disembunyikan (tetap tersimpan) |
| `shop_item_wishlist` *(list)* | baris | `draggable`; drop di baris lain memindahkan item, disimpan sekali |
| `shop_btn_wishlist_drag` *(list)* | handle | `aria-label` `"Pindahkan <nama>"`, `aria-pressed` saat diangkat. Keyboard: Spasi/Enter angkat & taruh, ↑/↓ pindah, Esc batal |
| `shop_link_wishlist_product` *(list)* | gambar, nama, harga | ke `/shop/product/<id>` |
| `shop_btn_wishlist_remove` *(list)* | hapus | `aria-label` `"Hapus dari wishlist"`; toast `"Dihapus dari wishlist"` |
| `shop_txt_wishlist_live` | pengumuman (`aria-live`) | mis. `"<nama> posisi 2 dari 4"` |
| `shop_txt_wishlist_empty`, `shop_btn_start_shopping` | empty state | `"Wishlist masih kosong"` + "Mulai belanja" |
