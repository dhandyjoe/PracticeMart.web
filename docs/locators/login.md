# Locator — W-AUTH-02 Login (`/login`)

Elemen unik: `id` = `data-testid` (architecture §11.1). Teks mengikuti kontrak §6.

| `data-testid` / `id` | Elemen | Catatan |
|---|---|---|
| `shop_link_logo` | link logo header | ke `/` |
| `shop_link_register` | link "Daftar" | ke `/register` |
| `shop_txt_register_success` | banner `role="status"` | `"Akun berhasil dibuat"`, hanya setelah Register |
| `shop_txt_login_error` | banner `role="alert"` | `"Email atau password salah"`, `"Terlalu banyak percobaan. Coba lagi nanti."`, `"Tidak ada koneksi. Periksa internet lalu coba lagi."`, `"Gagal memuat, coba lagi"` |
| `shop_input_email` | input email | terisi otomatis bila "Ingat saya" aktif saat login terakhir |
| `shop_txt_email_error` | error inline | `"Email wajib diisi"`, `"Format email tidak valid"` |
| `shop_input_password` | input password | Enter = submit |
| `shop_txt_password_error` | error inline | `"Password wajib diisi"` |
| `shop_btn_toggle_password` | tombol mata | `aria-label` `"Tampilkan password"` / `"Sembunyikan password"` |
| `shop_chk_remember` | checkbox "Ingat saya di perangkat ini" | default tercentang; `localStorage` `pm.rememberEmail` |
| `shop_btn_login` | tombol "Masuk" | 3× gagal → disabled, label `"Coba lagi dalam N detik"` (30 → 1) |
