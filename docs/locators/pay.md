# Locator — W-PAY-01 PracticePay (`/pay`, `/pay/qr?merchant=<id>&amount=<n>`)

Elemen unik: `id` = `data-testid`. *(list)* = berulang, `data-testid` saja.

## Beranda & riwayat
| `data-testid` / `id` | Elemen | Catatan |
|---|---|---|
| `pay_txt_balance` | saldo | `"Rp••••••"` bila disembunyikan |
| `pay_btn_toggle_balance` | mata | `aria-label` `"Sembunyikan saldo"` / `"Tampilkan saldo"` |
| `pay_btn_topup` | Top Up | membuka modal Top Up |
| `pay_btn_transfer` | Transfer | membuka modal |
| `pay_input_qr_upload` | `<input type="file">` | gambar QR; isi QR = URL `/pay/qr?merchant=…` |
| `pay_txt_qr_error` | error | `"QR tidak terbaca"`, `"QR tidak valid"` |
| `pay_chip_all`, `pay_chip_in`, `pay_chip_out` | chip (`role="radio"`) | Semua / Masuk / Keluar |
| `pay_btn_history_reload` | muat ulang | `aria-label` `"Muat ulang"` |
| `pay_table_history` | tabel | – |
| `pay_btn_sort_date`, `pay_btn_sort_amount` | urut kolom | `aria-sort` pada `<th>`; klik kedua membalik arah |
| `pay_item_history_row` *(list)*, `pay_txt_history_amount` *(list)* | baris, nominal | `+Rp300.000` / `−Rp86.000`; tanggal `yyyy-MM-dd HH:mm` WIB |
| `pay_txt_history_count`, `pay_txt_history_empty` | teks | `"Menampilkan N transaksi"` |
| `pay_txt_history_error`, `pay_btn_history_retry` | gagal muat | `"Gagal memuat, coba lagi"` |

## Modal transfer
| `pay_modal_transfer` | dialog | – |
|---|---|---|
| `pay_input_recipient` | combobox kontak | cari nama/nomor |
| `pay_list_recent_contacts`, `pay_chip_recent_contact` *(list)* | deretan "Terakhir" | maks 3 penerima transfer terbaru dari riwayat; klik = pilih penerima |
| `pay_list_contacts`, `pay_item_contact` *(list)*, `pay_txt_no_contact` | daftar (terbuka sampai penerima dipilih) | dikelompokkan A–Z (`role="group"` `aria-label` huruf); `"Kontak tidak ditemukan"` |
| `pay_txt_contact_letter` *(list)* | header huruf | `position: sticky` saat daftar di-scroll |
| `pay_input_amount`, `pay_chip_amount` *(list)* | nominal, chip Rp50.000/100.000/200.000 | auto-format Rupiah |
| `pay_txt_amount_error` | error | `"Minimal transfer Rp10.000"`, `"Saldo tidak cukup"` |
| `pay_input_transfer_note`, `pay_txt_transfer_note_count` | catatan opsional | `maxlength` 50, penghitung `"n/50"`; masuk judul transaksi `"Transfer ke <nama> · <catatan>"` |
| `pay_txt_transfer_error` | error server | – |
| `pay_btn_transfer_next` | "Lanjut" | disabled sampai valid |
| `pay_btn_transfer_close`, `pay_btn_transfer_done` | tutup, "Selesai" | – |
| `pay_txt_transfer_result`, `pay_txt_transfer_note` | hasil | `"Transfer berhasil"`, `"Catatan: …"`; notifikasi browser `"Transfer Rp… ke <nama> berhasil"` bila diizinkan |
| PIN | – | modal PIN sama dengan checkout (`pay_dialog_pin`, lihat `checkout.md`); PIN `123456` |

## Modal Top Up
| `data-testid` / `id` | Elemen | Catatan |
|---|---|---|
| `pay_modal_topup` | modal | – |
| `pay_input_topup_amount` | nominal | auto-format Rupiah, maks 9 digit |
| `pay_txt_topup_amount_error` | error nominal | `"Minimal top up Rp10.000"` / `"Maksimal top up Rp10.000.000"` |
| `pay_btn_topup_submit` | "Top Up Rp…" | disabled bila kosong/tidak valid |
| `pay_txt_topup_error` | error server | `"Gagal memuat, coba lagi"` sesuai "Peluang error server" |
| `pay_txt_topup_result`, `pay_btn_topup_done` | hasil | `"Top up berhasil"`; transaksi `"Top Up Saldo"` |
| `pay_btn_topup_close` | tutup | `aria-label` `"Tutup"` |

## Bayar QR (`/pay/qr`)
| `pay_txt_merchant` | nama merchant | `KOPIPAGI` = Kopi Pagi (nominal bebas), `TOKOBUKU` = Toko Buku (Rp45.000 tetap) |
|---|---|---|
| `pay_input_qr_amount` | nominal | readonly untuk nominal tetap |
| `pay_btn_qr_pay` | "Bayar Rp…" | disabled bila kosong / melebihi saldo |
| `pay_txt_qr_result` | hasil | `"Pembayaran berhasil"` |
| `pay_txt_qr_invalid` | merchant tak dikenal | `"QR tidak valid"` |
| `pay_txt_qr_error`, `pay_link_back` | error server, kembali | – |
