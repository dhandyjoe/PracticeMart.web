# Locator — W-ORD-01 Pesanan Saya (`/shop/orders`), W-ORD-02 Detail & Tracking (`/shop/order/{orderId}`)

Elemen unik: `id` = `data-testid`. *(list)* = berulang, `data-testid` saja.

## Pesanan Saya
| `data-testid` / `id` | Elemen | Catatan |
|---|---|---|
| `shop_tab_order_semua`, `_menunggu`, `_diproses`, `_dikirim`, `_selesai`, `_dibatalkan` | tab (`role="tab"`) | klik atau panah kiri/kanan; Diproses = Dibayar + Dikemas |
| `shop_btn_orders_reload` | muat ulang | `aria-label` `"Muat ulang"` |
| `shop_input_order_search` | cari Order ID | tanpa beda huruf besar/kecil |
| `shop_input_order_date_from`, `shop_input_order_date_to` | `<input type="date">` | rentang inklusif, tanggal Asia/Jakarta |
| `shop_table_orders` | tabel | – |
| `shop_item_order_row` *(list)* | baris | urut terbaru dulu |
| `shop_txt_order_id` *(list)*, `shop_txt_order_status` *(list)* | Order ID, status | status: `Menunggu Pembayaran`, `Dibayar`, `Dikemas`, `Dikirim`, `Selesai`, `Dibatalkan` |
| `shop_link_order_detail` *(list)* | "Lihat" | ke `/shop/order/{id}` |
| `shop_txt_orders_empty` | empty state | `"Belum ada pesanan"` |
| `shop_txt_orders_error`, `shop_btn_orders_retry` | gagal muat | `"Gagal memuat, coba lagi"` |

## Detail pesanan
| `data-testid` / `id` | Elemen | Catatan |
|---|---|---|
| `shop_link_back_to_orders` | breadcrumb | – |
| `shop_txt_order_id`, `shop_btn_copy_order_id` | Order ID + salin | toast `"Order ID disalin"` |
| `shop_txt_order_total` | total | – |
| `shop_txt_order_status` | status saat ini | – |
| `shop_list_order_timeline`, `shop_item_timeline_step` *(list)* | timeline 5 langkah | langkah aktif `aria-current="step"`; waktu `HH:mm:ss` |
| `shop_btn_confirm_paid` | "Saya sudah bayar" | hanya status Menunggu Pembayaran |
| `shop_panel_va` | panel VA | sama dengan halaman hasil checkout (lihat `checkout.md`) |
| `shop_btn_next_status` | "Status berikutnya" | hanya mode Manual (Developer Options) |
| `shop_btn_cancel_order` | "Batalkan Pesanan" | status ≤ Dikemas |
| `shop_txt_cannot_cancel` | teks | status Dikirim: `"Pesanan yang sudah dikirim tidak bisa dibatalkan"` |
| `shop_txt_cancel_reason` | alasan | pesanan Dibatalkan |
| `shop_txt_order_error` | error `role="alert"` | pesan server / `"Gagal memuat, coba lagi"` / `"Tidak ada koneksi"` |
| `shop_item_order_line` *(list)* | baris produk | – |

## Modal batal
| `shop_modal_cancel` | dialog | – |
|---|---|---|
| `shop_rdo_cancel_reason` *(list)* | 4 alasan | "Lainnya" memunculkan `shop_input_cancel_other` |
| `shop_btn_confirm_cancel` | "Batalkan" | disabled sampai alasan (dan teks untuk "Lainnya") terisi |
| `shop_btn_cancel_back` | "Kembali" | – |

Status maju otomatis tiap interval Developer Options (default 10 dtk; Menunggu Pembayaran menunggu "Saya sudah bayar"). VA lewat batas bayar → Dibatalkan otomatis (`"Waktu pembayaran habis"`). Cashback PracticePay masuk saat Selesai (kontrak §2).
