# Locator — Struktur halaman (judul, form, nav, daftar, tautan)

Elemen unik: `id` = `data-testid`. *(list)* = berulang, `data-testid` saja. Judul yang sudah punya `id="h_*"` (untuk `aria-labelledby`) hanya ditambah `data-testid`; `id` lama tidak diubah.

## Judul (heading)

| `data-testid` | Halaman / elemen |
|---|---|
| `shop_txt_login_brand_title`, `shop_txt_login_title` | Login: judul brand (h1), "Masuk" (h2) |
| `shop_txt_register_title` | Register: "Buat akun" |
| `shop_txt_flash_title`, `shop_txt_category_title`, `shop_txt_recommendation_title` | Beranda: section (`id` lama `h_flash`/`h_cat`/`h_rec`) |
| `shop_txt_filter_title`, `shop_txt_search_title` | Pencarian: panel filter, judul hasil |
| `shop_txt_cart_title`, `shop_txt_cart_saved_title`, `shop_txt_cart_summary_title` | Keranjang (judul sama untuk keranjang kosong & berisi, tidak tampil bersamaan) |
| `shop_txt_checkout_title`, `shop_txt_checkout_address_title`, `shop_txt_checkout_summary_title` | Checkout |
| `shop_txt_orders_title` | Pesanan Saya |
| `shop_txt_order_status_head`, `shop_txt_order_products_head`, `shop_txt_order_payment_head`, `shop_txt_cancel_order_title` | Detail pesanan + dialog batal |
| `shop_txt_wishlist_title` | Wishlist |
| `acc_txt_page_title`, `acc_txt_profile_title`, `acc_txt_address_title` | Profil & Alamat |
| `pay_txt_title`, `pay_txt_history_title`, `pay_txt_qr_title` | Pay, riwayat, bayar QR |
| `pay_txt_pin_title`, `pay_txt_topup_title`, `pay_txt_transfer_title` | Judul dialog PIN / Top Up / Transfer |
| `shop_txt_3ds_title` | Judul dialog 3DS |
| `<testid dialog>_title` | Judul `ConfirmDialog` (testid dialog + `_title`) |
| `dev_txt_settings_title`, `dev_txt_general_title`, `dev_txt_developer_title`, `dev_txt_about_title` | Pengaturan |
| `help_txt_title`, `help_txt_chat_title`, `help_txt_contact_title` | Bantuan |
| `terms_txt_account_head`, `terms_txt_data_head`, `terms_txt_stock_head` | Syarat |

## Form

`shop_form_search` (header), `shop_form_login`, `shop_form_register`, `shop_form_voucher` (keranjang), `acc_form_profile`, `help_form_chat`.

## Navigasi & daftar

| `data-testid` | Elemen |
|---|---|
| `shop_nav_account` | nav header (akun & keranjang) |
| `acc_nav_menu` | menu akun (sidebar) |
| `shop_nav_breadcrumb`, `shop_list_breadcrumb` | breadcrumb (Produk, Pencarian, Detail pesanan) |
| `shop_link_breadcrumb_home`, `shop_link_breadcrumb_category` | tautan breadcrumb (Produk, Pencarian) |
| `shop_grid_flash` | grid flash sale |
| `shop_list_login_chips` | chip fitur di Login |
| `shop_list_checkout_steps` | langkah checkout |
| `acc_list_address` | daftar alamat |
| `shop_list_active_filter` | chip filter aktif |
| `help_list_chat` | isi chat CS |
| `shop_list_va_steps` *(list)* | langkah bayar VA |
| `pay_list_contact_group` *(list)* | grup kontak per huruf (Transfer) |

## Tautan & tombol di dalam item list *(list)*

`shop_link_product` (kartu/baris produk), `shop_link_flash_product` (kartu flash), `shop_link_order_line_product` (baris pesanan), `shop_btn_remove_filter` (hapus satu chip filter aktif; `aria-label` `"Hapus filter <label>"`).
