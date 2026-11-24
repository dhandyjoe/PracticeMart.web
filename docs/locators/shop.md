# Locator — Belanja

Elemen unik: `id` = `data-testid`. *(list)* = berulang, `data-testid` saja. Teks "+ Keranjang" sengaja kembar (latihan locator relatif).

## W-SHOP-01 Beranda (`/`, `/shop`)
| `data-testid` / `id` | Elemen | Catatan |
|---|---|---|
| `shop_txt_greeting` | sapaan | `"Halo, <Nama Tampilan>"` |
| `shop_carousel_banner` | carousel | auto-slide 4 dtk |
| `shop_txt_banner_title` | isi banner aktif | `HEMAT10` / `Cashback 5%` / `Gratis ongkir s/d Rp20.000` |
| `shop_btn_banner_prev`, `shop_btn_banner_next` | panah | – |
| `shop_btn_banner_dot` *(list)* | indikator `role="tab"` | `aria-selected` |
| `shop_item_category` *(list)* | 6 kategori | ke `/shop/search?cat=<slug>` |
| `shop_txt_flash_countdown` | countdown `role="timer"` | mulai `02:14:37` saat halaman dibuka |
| `shop_card_flash` *(list)* | kartu flash sale | produk berharga coret |
| `shop_btn_flash_buy` *(list)* | "Beli" | disabled saat `00:00:00`/stok 0; masuk keranjang → `/shop/cart` |
| `shop_grid_recommendation` | grid rekomendasi | 5 produk; deterministik `P001, P002, P010, P020, P060` |
| `shop_link_see_all` | "Lihat semua" | ke `/shop/search` |

Kartu produk (Beranda & hasil pencarian):

| `data-testid` | Elemen | Catatan |
|---|---|---|
| `shop_card_product` *(list)* | kartu | – |
| `shop_txt_product_name` *(list)* | nama | – |
| `shop_txt_product_price` *(list)* | harga | `Rp75.000` |
| `shop_btn_add_to_cart` *(list)* | "+ Keranjang" | varian pertama yang ada stok; stok 0 → `"Stok Habis"` disabled. Tampilan list: tombol ikon `aria-label` `"Tambah <nama> ke keranjang"` |

## W-SHOP-04 Hasil pencarian (`/shop/search`)
URL: `q`, `cat` (boleh berulang), `min`, `max`, `rating` (`3`/`4`/`4.5`), `stock=1`, `sort` (`relevan`/`murah`/`mahal`/`rating`/`baru`), `view=list`.

| `data-testid` / `id` | Elemen | Catatan |
|---|---|---|
| `shop_panel_filter` | form filter | berlaku setelah "Terapkan" |
| `shop_chk_category_<slug>` | checkbox kategori | `fashion`, `elektronik`, `rumah_tangga`, `olahraga`, `buku`, `kecantikan` |
| `shop_input_price_min`, `shop_input_price_max` | harga | – |
| `shop_sld_price_max` | range harga maks | 0–2.000.000, langkah 10.000 |
| `shop_rad_rating_all`, `shop_rad_rating_3`, `shop_rad_rating_4`, `shop_rad_rating_4_5` | radio rating | – |
| `shop_chk_in_stock` | `role="switch"` | "Hanya stok tersedia" |
| `shop_btn_filter_apply` | "Terapkan" | – |
| `shop_badge_filter_count` | badge jumlah filter di draf | – |
| `shop_btn_filter_reset` | "Reset" | langsung berlaku |
| `shop_txt_result_count` | jumlah + urutan | `"12 produk · Harga Terendah"` |
| `shop_spn_sort` | `<select>` urutkan | – |
| `shop_btn_view_grid`, `shop_btn_view_list` | toggle tampilan | `aria-pressed` |
| `shop_chip_active_filter` *(list)* | chip filter aktif | tombol × `aria-label` `"Hapus filter <label>"` |
| `shop_grid_result` | daftar hasil | 20 per halaman, infinite scroll |
| `shop_txt_load_more` | footer | `"Memuat produk lainnya…"` |
| `shop_txt_list_end` | akhir daftar | `"Semua produk sudah ditampilkan"` |
| `shop_txt_empty_result` | kosong | `"Produk tidak ditemukan"` |

## W-SHOP-05 Detail produk (`/shop/product/{id}`)
| `data-testid` / `id` | Elemen | Catatan |
|---|---|---|
| `shop_img_product_main` | gambar utama `role="img"` | `"<nama>, gambar N"` |
| `shop_btn_gallery_prev`, `shop_btn_gallery_next` | panah galeri | – |
| `shop_btn_gallery_thumb` *(list)* | thumbnail `role="tab"` | – |
| `shop_txt_gallery_indicator` | indikator | `"2/5"` |
| `shop_btn_open_viewer` | "Perbesar gambar" | buka Image Viewer |
| `shop_txt_product_name`, `shop_txt_product_price` | nama, harga | – |
| `shop_btn_wishlist` | wishlist | `aria-label` `"Tambah ke wishlist"` / `"Hapus dari wishlist"`, `aria-pressed` |
| `shop_txt_selected_color`, `shop_txt_selected_size` | varian terpilih | – |
| `shop_chip_color` *(list)*, `shop_chip_size` *(list)* | chip `role="radio"` | stok 0 → `aria-disabled="true"` |
| `shop_txt_variant_tooltip` *(list)* | `role="tooltip"` | `"Stok habis untuk Hitam · XL"` saat hover/fokus |
| `shop_btn_qty_minus`, `shop_input_qty`, `shop_btn_qty_plus` | stepper | maks min(stok, 10) |
| `shop_txt_stock_left` | stok varian | `"Stok 10"` |
| `shop_txt_qty_error` | `role="alert"` | `"Maksimal pembelian 10 pcs"` |
| `shop_btn_buy_now` | "Beli Sekarang" | ke `/checkout` hanya dengan varian & qty ini (history state, tahan reload); keranjang tidak berubah; disabled bila stok 0 |
| `shop_btn_add_to_cart` | "+ Keranjang" / `"Stok Habis"` | – |

Image Viewer (modal `role="dialog"`):

| `data-testid` / `id` | Elemen | Catatan |
|---|---|---|
| `shop_dialog_image_viewer` | dialog | Esc, klik scrim, × menutup; fokus terkunci |
| `shop_txt_viewer_indicator` | indikator | `"3/5"` |
| `shop_txt_zoom_level` | zoom | `"2,0×"`; tidak tampil saat 1× |
| `shop_btn_zoom_in`, `shop_btn_zoom_out` | zoom ±0,5 | 50–300%; juga Ctrl + scroll, double click 2× |
| `shop_btn_viewer_prev`, `shop_btn_viewer_next` | panah | juga ← / → |
| `shop_btn_viewer_thumb` *(list)* | thumbnail | – |
| `shop_btn_viewer_close` | tutup | – |
