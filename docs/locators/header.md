# Locator — Header aplikasi (semua halaman setelah login)

Elemen unik: `id` = `data-testid`. Item berulang: `data-testid` saja (architecture §11.1).

| `data-testid` / `id` | Elemen | Catatan |
|---|---|---|
| `shop_tab_home` | logo (link) | ke `/`; `aria-label` `"PracticeMart, Beranda"` |
| `shop_tab_category` | tombol "Kategori" | buka mega menu (klik, Enter, hover 150 ms); `aria-expanded` |
| `shop_menu_category` | mega menu `role="menu"` | Esc / klik luar / mouse keluar menutup |
| `shop_item_mega_category` *(list)* | item kategori `role="menuitem"` | ke `/shop/search?cat=<slug>` |
| `shop_input_search` | combobox cari | saran ≥ 2 karakter, ↑/↓, Enter → `/shop/search?q=<q>` + riwayat |
| `shop_list_suggestion` | `role="listbox"` | – |
| `shop_item_suggestion` *(list)* | saran produk `role="option"` | maks 5; klik → detail produk |
| `shop_item_search_history` *(list)* | riwayat `role="option"` | tampil saat fokus & isian < 2 karakter; maks 5 |
| `shop_btn_history_remove` *(list)* | × pada riwayat | `aria-label` `Hapus "<q>" dari riwayat` |
| `shop_btn_history_context_remove` | menu klik kanan "Hapus" | – |
| `shop_btn_history_clear` | "Hapus semua" | – |
| `shop_txt_suggestion_empty` | teks kosong | `Tidak ada saran untuk "<q>"` |
| `shop_opt_search_<n>` | `id` opsi (tanpa `data-testid`) | untuk `aria-activedescendant` |
| `shop_tab_pay` | chip saldo (link) | ke `/pay` |
| `pay_txt_header_balance` | teks saldo | `Rp500.000` |
| `shop_tab_cart` | link keranjang | `aria-label` `"Keranjang, N item"` |
| `shop_badge_cart` | badge jumlah | jumlah qty keranjang aktif (tanpa "Simpan untuk nanti"); tidak tampil bila 0 |
| `shop_tab_account` | tombol menu akun | `aria-label` `"Menu akun"` |
| `acc_menu` | dropdown `role="menu"` | – |
| `acc_txt_display_name` | nama tampilan | "Masuk sebagai …" |
| `acc_link_orders`, `acc_link_wishlist`, `acc_link_pay`, `acc_link_profile`, `acc_link_settings`, `acc_link_help` | item menu | – |
| `acc_badge_menu_orders` | badge di "Pesanan Saya" | sama dengan `acc_badge_orders`; tidak tampil bila 0 |
| `acc_btn_logout` | "Keluar" | modal konfirmasi `acc_dialog_logout` → `/login` |

Komponen bersama lain:

| `data-testid` / `id` | Elemen | Catatan |
|---|---|---|
| `shop_snackbar` / `shop_bar_undo` | snackbar `role="status"` | 4 dtk; `shop_bar_undo` untuk hapus item keranjang |
| `shop_txt_snackbar` | teks snackbar | `"Ditambahkan ke keranjang"`, `"Maksimal pembelian 10 pcs"`, `"<nama> dihapus dari keranjang"` |
| `shop_btn_snackbar_view` | aksi "Lihat" | ke `/shop/cart` |
| `shop_btn_undo` | aksi "Urungkan" | – |
| `shop_txt_load_error` + `shop_btn_retry` | gagal memuat data akun | `"Gagal memuat, coba lagi"` + "Coba lagi" |
| `shop_txt_not_found` + `shop_btn_back_home` | SYS-01 | `"Halaman tidak ditemukan"` |
