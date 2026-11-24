# Locator — Akun, Pengaturan & Bantuan

Elemen unik: `id` = `data-testid`. *(list)* = berulang, `data-testid` saja.

## Navigasi akun (sidebar `/account`, `/settings`)
| `data-testid` / `id` | Elemen | Catatan |
|---|---|---|
| `acc_txt_nav_name` | nama tampilan | – |
| `acc_nav_orders`, `acc_nav_wishlist`, `acc_nav_pay`, `acc_nav_profile`, `acc_nav_settings`, `acc_nav_help` | link | aktif: `aria-current="page"` |
| `acc_badge_orders` | badge di "Pesanan Saya" | jumlah pesanan Menunggu Pembayaran s/d Dikirim; tidak tampil bila 0 |
| `acc_nav_logout` | "Keluar" | modal konfirmasi `acc_dialog_logout` |
| `acc_dialog_logout` | `role="alertdialog"` | `acc_dialog_logout_cancel`, `acc_dialog_logout_confirm` (juga dari header) |

## W-ACC-01 Profil & Alamat (`/account`)
| `data-testid` / `id` | Elemen | Catatan |
|---|---|---|
| `acc_drop_photo` | area foto (drag-and-drop) | – |
| `acc_input_photo` | `<input type="file">` | PNG/JPG ≤ 2 MB; disimpan lokal di browser ini |
| `acc_img_photo` | pratinjau | – |
| `acc_txt_photo_error` | error | `"Format harus PNG atau JPG"`, `"Ukuran maksimal 2 MB"` |
| `acc_input_name` | nama | `acc_txt_name_error` `"Nama wajib diisi"` |
| `acc_input_email` | email | disabled |
| `acc_input_birthdate` | `<input type="date">` | `YYYY-MM-DD` |
| `acc_rdo_gender_male`, `acc_rdo_gender_female` | jenis kelamin | – |
| `acc_btn_save_profile` | "Simpan" | toast `acc_txt_profile_saved` `"Profil tersimpan"` |
| `addr_btn_add` | "+ Tambah alamat" / "Batal" | – |
| `addr_card` *(list)* | kartu alamat | alamat utama: `data-primary="true"` |
| `addr_btn_edit` *(list)*, `addr_btn_set_default` *(list)* | "Ubah", "Jadikan utama" | – |
| `addr_txt_empty` | belum ada alamat | – |
| `addr_form` | form | – |
| `addr_btn_use_location` | "Gunakan lokasi saat ini" | koordinat uji -6.2088, 106.8228 → DKI Jakarta, Jakarta Pusat |
| `addr_txt_location_status` | status | `"Lokasi ditemukan: …"`, `"Lokasi di luar area layanan"`, `"Izin lokasi ditolak"` |
| `addr_rdo_label_home`, `addr_rdo_label_office`, `addr_rdo_label_other` | label | Rumah/Kantor/Lainnya |
| `addr_input_recipient`, `addr_input_phone`, `addr_input_street` | field | error `addr_txt_*_error` |
| `addr_spn_province` | `<select>` | – |
| `addr_spn_city` | combobox (input + datalist) | `"Pilih kota dari daftar"` |
| `addr_input_postal` | kode pos | `addr_txt_postal_error` `"Kode pos harus 5 digit"` |
| `addr_sw_primary` | `role="switch"` | – |
| `addr_btn_save`, `addr_btn_cancel` | "Simpan Alamat", "Batal" | toast `"Alamat tersimpan"` |

## W-ACC-04 Pengaturan & Developer Options (`/settings`)
Semua disimpan di `localStorage` browser ini (kontrak §5).

| `data-testid` / `id` | Elemen | Opsi |
|---|---|---|
| `acc_spn_language` | Bahasa | `id`, `en` |
| `acc_spn_theme` | Tema | `system`, `light`, `dark` |
| `acc_sw_notification` | Notifikasi pesanan | switch; ON meminta izin browser |
| `dev_sw_deterministic` | Mode deterministik | switch |
| `dev_spn_latency` | Network latency | `0`–`3` |
| `dev_sw_animations` | Animasi | switch |
| `dev_spn_error_rate` | Peluang error server | `0`, `30`, `50` |
| `dev_spn_va_timeout` | Batas waktu VA | `30s`, `2m`, `15m` |
| `dev_spn_order_interval` | Update status pesanan | `3`, `10`, `30`, `manual` |
| `dev_sw_locator_hint` | Locator Hint Overlay | switch |
| `dev_btn_reset_settings` | Reset pengaturan | dialog `dev_dialog_reset` (`_cancel`, `_confirm`) |
| `dev_txt_version`, `dev_txt_commit`, `dev_txt_build_date`, `dev_txt_contract_version`, `dev_txt_locator_version`, `dev_txt_firebase_project`, `dev_txt_uid` | Tentang | – |

URL hook (DEV-02): `/settings?deterministic=true&latency=0&animations=false&flaky=0&va=30s&interval=manual&hint=true` → disimpan, lalu kembali ke halaman sebelumnya tanpa UI (juga tanpa login).

## W-HELP-01 Pusat Bantuan (`/help`)
| Locator | Elemen | Catatan |
|---|---|---|
| `help_frame_faq` | `<iframe>` same-origin `/help/faq.html` | – |
| di dalam iframe: `faq-search` | cari FAQ | `faq-empty` `"Tidak ada pertanyaan yang cocok."` |
| di dalam iframe: `faq-item` *(list)* | accordion | tombol `aria-expanded` |
| di dalam iframe: `btn-contact` | "Hubungi kami" | toast induk `help_txt_contact_toast` `"Menghubungkan ke CS PracticeMart…"` |
| di dalam iframe: `contact-frame` | iframe bersarang `contact.html` | – |
| di iframe bersarang: `topic`, `order`, `message`, `btn-send` | form kontak | `message-error` `"Pesan wajib diisi"` |
| di iframe bersarang: `send-result`, `ticket` | hasil | `"Pesan terkirim. Nomor tiket: CS-YYYYMMDD-NNNN"` |
| `help_link_phone` | "Telepon CS" | `href="tel:1500123"` |
| `help_link_terms` | S&K | `/terms`, tab baru |
| `help_btn_chat` | "Chat dengan CS" / "Tutup chat" | – |
| `help_widget_chat` | panel chat | `help_input_chat`, `help_btn_chat_send`, `help_item_chat_message` *(list)* |

## Lainnya
| `data-testid` / `id` | Elemen | Catatan |
|---|---|---|
| `terms_txt_title` | `/terms` | bisa dibuka tanpa login |
