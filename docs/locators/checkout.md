# Locator — W-SHOP-11 Checkout + 3DS (`/checkout`, `/checkout/result/{orderId}`)

Elemen unik: `id` = `data-testid`. *(list)* = berulang, `data-testid` saja. Pilihan alamat, kurir, asuransi, dan metode tersimpan di `sessionStorage` `pm.checkout` (data kartu tidak).

## Checkout
| `data-testid` / `id` | Elemen | Catatan |
|---|---|---|
| `shop_link_back_to_cart` | "‹ Kembali ke keranjang" | – |
| `shop_txt_offline` | banner `role="alert"` | `"Tidak ada koneksi"`; Bayar disabled |
| `shop_txt_checkout_error` | banner `role="alert"` | `"Stok tidak cukup untuk <nama>"`, `"Saldo tidak cukup"`, `"Gagal memuat, coba lagi"`, `"Tidak ada koneksi"` |
| `shop_txt_checkout_address` | alamat terpilih | default alamat utama |
| `shop_txt_no_address` | tanpa alamat | Bayar disabled |
| `shop_btn_change_address` | "Ubah" | tampil bila alamat > 1 |
| `shop_rdo_address` *(list)* | pilihan alamat | – |
| `shop_link_add_address` | ke `/account#alamat` | – |
| `shop_rdo_courier_reguler`, `shop_rdo_courier_express`, `shop_rdo_courier_sameday` | kurir | Same Day disabled di luar DKI Jakarta: `"Tidak tersedia untuk kota ini"` |
| `shop_input_delivery_time` | `<input type="time">` | wajib untuk Same Day, 09:00–17:00 |
| `shop_txt_delivery_time_error` | error | `"Pilih jam kirim antara 09:00 dan 17:00"` |
| `shop_chk_insurance` | asuransi Rp2.000 | default OFF |
| `shop_rdo_pay_card`, `shop_rdo_pay_va`, `shop_rdo_pay_wallet`, `shop_rdo_pay_cod` | metode bayar | – |
| `shop_txt_pay_<method>_note` | keterangan | PracticePay: `"Saldo tidak cukup"`; COD: `"Untuk total maksimal Rp1.000.000"` (opsi disabled) |
| `shop_list_va_bank` | pilihan bank VA (`role="radiogroup"`) | tampil bila Virtual Account dipilih |
| `shop_rdo_va_bank` *(list)* | radio bank | `value` = `BCA` / `BNI` / `Mandiri`; default BCA; tersimpan di draf |
| `shop_form_card` | form kartu | – |
| `shop_input_card_number` | nomor kartu | format per 4 digit |
| `shop_txt_card_number_error` | error | `"Nomor kartu tidak valid"` (Luhn) |
| `shop_input_card_exp` | MM/YY | – |
| `shop_txt_card_exp_error` | error | `"Kartu sudah kedaluwarsa"`, `"Format MM/YY tidak valid"` |
| `shop_input_card_cvv` | CVV | – |
| `shop_txt_card_cvv_error` | error | `"CVV harus 3 digit"` |
| `shop_item_checkout_line` *(list)* | baris ringkasan | – |
| `shop_txt_checkout_subtotal`, `shop_txt_checkout_discount`, `shop_txt_checkout_shipping`, `shop_txt_checkout_shipping_discount`, `shop_txt_checkout_insurance`, `shop_txt_checkout_service_fee` | rincian | kontrak §2 |
| `shop_txt_checkout_total` | total | contoh kontrak `Rp158.000` |
| `shop_btn_pay` | "Bayar Rp…" | disabled sampai valid; disabled saat diproses (anti double submit) |
| `shop_overlay_processing` | overlay | `"Memproses pembayaran…"` ±2 dtk × latency |

Kartu uji (kontrak §4.3): `4111 1111 1111 1111` → 3DS → `Pembayaran Berhasil`; `4000 0000 0000 0002` → `Pembayaran Gagal` (tanpa order); `4000 0000 0000 0119` → `Menunggu Pembayaran`.

## 3D Secure (modal + iframe lintas origin)
| Locator | Elemen | Catatan |
|---|---|---|
| `shop_modal_3ds` | dialog | tidak tertutup dengan Esc/klik luar |
| `shop_btn_3ds_close` | tutup | membatalkan |
| `shop_frame_3ds` | `<iframe>` | origin bank (`VITE_BANK_ORIGIN`, dev `http://localhost:5174`) |
| di dalam iframe: `otp` | input OTP | `123456` sukses |
| di dalam iframe: `otp-error` | error | `"Kode OTP salah"` |
| di dalam iframe: `btn-submit` | Submit | – |
| di dalam iframe: `btn-cancel` | Batal | memicu `confirm("Batalkan transaksi?")` |
| di dalam iframe: `amount`, `card` | info transaksi | `IDR 158.000`, `**** 1111` |

## PIN PracticePay (modal)
| `data-testid` / `id` | Elemen | Catatan |
|---|---|---|
| `pay_dialog_pin` | dialog | – |
| `pay_ind_pin` | 6 indikator | `aria-label` `"N dari 6 digit"` |
| `pay_btn_pin_digit` *(list)* | tombol `0`–`9` | locator by text; juga ketikan keyboard |
| `pay_btn_pin_delete` | hapus | `aria-label` `"Hapus"`; juga Backspace |
| `pay_txt_pin_error` | error | `"PIN salah. Sisa N percobaan."`, `"PracticePay terkunci. Coba lagi dalam N detik"` |
| `pay_btn_pin_close` | tutup | – |

## Hasil (`/checkout/result/{orderId}`)
| `data-testid` / `id` | Elemen | Catatan |
|---|---|---|
| `shop_txt_payment_status` | judul | `"Pembayaran Berhasil"` / `"Menunggu Pembayaran"` / `"Pembayaran Gagal"` |
| `shop_txt_order_id` | Order ID | `PM-YYYYMMDD-XXXX` |
| `shop_btn_copy_order_id` | "Salin" | toast `"Order ID disalin"` |
| `shop_txt_result_total` | total | – |
| `shop_txt_va_deadline` | batas bayar VA | `"Bayar sebelum pukul HH.MM.SS WIB."` |
| `shop_panel_va` | panel Virtual Account | hanya pesanan VA berstatus Menunggu Pembayaran |
| `shop_txt_va_number` | nomor VA | per 4 digit. BCA deterministik `8077 0000 1234 5678`; lainnya prefix bank (BCA 8077, BNI 8808, Mandiri 8900) + digit Order ID |
| `shop_btn_copy_va` | "Salin" | `aria-label` `"Salin nomor VA"`; toast `"Nomor VA disalin"` (gagal: `"Gagal menyalin"`) |
| `shop_txt_va_countdown` | sisa waktu (`role="timer"`) | `mm:ss`, berhenti di `00:00` |
| `shop_item_va_howto` *(list)* | accordion cara bayar (`<details>`) | ATM, Mobile banking, Internet banking |
| `shop_btn_va_check_status` | "Cek Status" | gagal sesuai "Peluang error server" → `shop_txt_va_error` `"Gagal memuat, coba lagi"`; masih menunggu → toast `"Pembayaran belum diterima"` |
| `shop_link_order_detail` | "Lihat pesanan" | hanya saat Menunggu Pembayaran |
| `shop_btn_continue_shopping` | "Lanjut belanja" | – |
| `shop_btn_back_to_cart` | (gagal) "Kembali ke keranjang" | – |
| `shop_snackbar` → `shop_txt_snackbar` | toast | `"Pesanan PM-… berhasil dibuat"` (+ notifikasi browser bila diizinkan) |
