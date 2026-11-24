# Locator — W-SHOP-09 Keranjang (`/shop/cart`)

Elemen unik: `id` = `data-testid`. *(list)* = per baris, `data-testid` saja. Teks error voucher mengikuti kontrak §2.

| `data-testid` / `id` | Elemen | Catatan |
|---|---|---|
| `shop_txt_cart_empty` | empty state | `"Keranjangmu masih kosong"` |
| `shop_btn_start_shopping` | "Mulai belanja" | ke `/` |
| `shop_table_cart` | tabel keranjang aktif | – |
| `shop_chk_select_all` | Pilih Semua | tri-state (`indeterminate`) |
| `shop_item_cart_row` *(list)* | baris | – |
| `shop_chk_cart_item` *(list)* | checkbox baris | `aria-label` `"Pilih <nama>"`; stok 0 → disabled |
| `shop_txt_cart_item_name` *(list)* | nama (link) | – |
| `shop_txt_cart_item_variant` *(list)* | varian | `"Hitam · S"` |
| `shop_txt_cart_item_out` *(list)* | stok habis | `"Stok habis"` |
| `shop_txt_cart_item_price` *(list)* | harga satuan | – |
| `shop_spn_cart_qty` *(list)* | `<select>` qty | 1 … min(stok, 10) |
| `shop_txt_cart_item_subtotal` *(list)* | subtotal baris | – |
| `shop_btn_cart_save` *(list)* | "Simpan untuk nanti" | – |
| `shop_btn_cart_remove` *(list)* | hapus | muncul saat hover/fokus baris; `aria-label` `"Hapus <nama>"`; snackbar `shop_bar_undo` + `shop_btn_undo` |
| `shop_table_saved` | tabel "Disimpan untuk nanti" | – |
| `shop_item_saved_row` *(list)* | baris tersimpan | – |
| `shop_btn_cart_move` *(list)* | "Pindahkan ke keranjang" | – |
| `shop_txt_cart_subtotal` | subtotal terpilih | – |
| `shop_input_voucher_code` | kode voucher | huruf besar otomatis |
| `shop_btn_voucher_apply` | "Pakai" | disabled bila kosong |
| `shop_txt_voucher_error` | `role="alert"` | `"Voucher tidak ditemukan"`, `"Voucher sudah kedaluwarsa"`, `"Minimal belanja Rp100.000"` |
| `shop_txt_voucher_applied` | voucher terpasang | `"Voucher HEMAT10 terpasang"` |
| `shop_btn_voucher_remove` | "Lepas" | – |
| `shop_txt_cart_discount` | diskon | `"−Rp15.000"`; tidak tampil bila 0 (ONGKIR dihitung di Checkout) |
| `shop_txt_cart_total` | total | subtotal − diskon |
| `shop_btn_checkout` | "Checkout (N)" | N = baris terpilih; ke `/checkout` (lihat `checkout.md`) |
