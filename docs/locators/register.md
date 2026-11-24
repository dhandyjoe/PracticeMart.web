# Locator — W-AUTH-03 Daftar (`/register`)

Elemen unik: `id` = `data-testid` (architecture §11.1). Teks mengikuti PRD FR-AUTH-12 & kontrak §6.

| `data-testid` / `id` | Elemen | Catatan |
|---|---|---|
| `shop_link_logo` | link logo header | ke `/` |
| `shop_link_login` | link "Masuk" | ke `/login` |
| `shop_txt_register_error` | banner `role="alert"` | `"Terlalu banyak percobaan. Coba lagi nanti."`, `"Tidak ada koneksi. Periksa internet lalu coba lagi."`, `"Gagal memuat, coba lagi"` |
| `shop_input_reg_name` | input nama lengkap | wajib |
| `shop_input_reg_email` | input email | – |
| `shop_txt_reg_email_error` | error inline | `"Format email tidak valid"` (saat blur), `"Email sudah terdaftar"` (setelah submit) |
| `shop_input_reg_password` | input password | – |
| `shop_txt_password_strength` | label kekuatan | `""` / `"Lemah"` / `"Sedang"` / `"Kuat"` |
| `shop_txt_password_helper` | helper | `"Minimal 8 karakter, berisi huruf dan angka"` |
| `shop_input_reg_confirm` | input konfirmasi password | – |
| `shop_txt_reg_confirm_error` | error inline | `"Konfirmasi password tidak sama"` (saat blur) |
| `shop_chk_terms` | checkbox S&K | wajib dicentang |
| `shop_link_terms` | link "Syarat & Ketentuan" | `/terms`, `target="_blank"` |
| `shop_btn_register` | tombol "Daftar" | disabled sampai semua valid; sukses → `/login` |
