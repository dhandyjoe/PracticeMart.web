# PRD — PracticeMart (Web)

| Field | Isi |
|---|---|
| Dokumen | Product Requirements Document |
| Produk | **PracticeMart Web**: versi web dari aplikasi marketplace PracticeMart (dengan fitur dompet digital **PracticePay**) untuk latihan automation testing web. Akun & data sama dengan app Android |
| Dokumen terkait | `docs/contract.md` v1.0 (kontrak bersama Android & web: business rules, test data, skema Firebase; **wajib identik** dengan `PracticeMarket.apps/docs/contract.md`) · PRD Android v0.7 (`PracticeMarket.apps/PRD.md`) · `ARCHITECTURE.md` & `DESIGN.md` web (dibuat di project ini) |
| Versi dokumen | 0.3 (Draft) |
| Tanggal | 19 November 2026 |
| Owner | Dhandy (Product & QA Automation) |
| Status | Draft, menunggu review |
| Target rilis | v1.0.0 |

**Riwayat perubahan**

| Versi | Tanggal | Perubahan | Oleh |
|---|---|---|---|
| 0.3 | 2026-11-20 | Fitur level MEDIUM P1: Beli Sekarang (FR-SHOP-11), badge pesanan aktif (FR-ACC-01), catatan transfer + notifikasi transfer (FR-PAY-05/07), kontak A–Z + "Terakhir" (FR-PAY-03). | Dhandy |
| 0.2 | 2026-11-20 | Lupa Password dihapus dari web (FR-AUTH-13, AUTH-04). Fitur level HIGH dibuat: halaman VA + pilihan bank (FR-PAYM-08), Cek Status dengan Peluang error server (FR-PAYM-09), Top Up versi sederhana (FR-PAY-02), halaman Wishlist dengan drag & drop (FR-SHOP-12). | Dhandy |
| 0.1 | 2026-11-19 | Draft awal, diturunkan dari PRD Android v0.7. ID requirement (FR-, E2E-, N-, EDGE-) sama dengan Android untuk traceability. Konsep Android diterjemahkan ke web (deep link → URL, WebView → iframe, gesture → mouse & keyboard, Compose → Shadow DOM). Target tool: Playwright, Cypress, WebdriverIO. Desktop saja. | Dhandy |

---

## Daftar Isi
1. Ringkasan Eksekutif
2. Latar Belakang & Problem Statement
3. Goals, Non-Goals & Success Metrics
4. Target User & Persona
5. User Stories
6. Ruang Lingkup, Arsitektur Informasi & Learning Path
7. Peta Skill → Fitur
8. Functional Requirements per Area Fitur
9. Skenario E2E
10. Developer Options & Test Hooks
11. Test Data & Akun Uji
12. Strategi Locator & Kontrak Testability
13. Non-Functional Requirements
14. Aset Test & Dokumentasi Bawaan
15. Spesifikasi Teknis & Build
16. Rilis, Versioning & Distribusi
17. Roadmap & Milestone
18. Risiko & Mitigasi
19. Asumsi, Dependensi & Open Questions
20. Definition of Done v1.0
- Lampiran A: Traceability Matrix (Skill → Fitur → Playwright → Cypress → WebdriverIO)
- Lampiran B: Glossary
- Lampiran C: Matriks requirement Android → Web

---

## 1. Ringkasan Eksekutif
**PracticeMart Web** adalah web app yang menjadi **target latihan automation testing web**, dengan produk, alur, data, dan akun yang **sama** dengan app Android PracticeMart. Learner membuka satu web app yang terasa seperti marketplace sungguhan, lalu menulis script **Playwright**, **Cypress**, atau **WebdriverIO** untuk mengotomasi fitur-fiturnya. Isinya:

- **Belanja (marketplace)**: onboarding, login, katalog, pencarian, filter, keranjang, voucher, checkout, pembayaran (kartu + 3DS dalam iframe lintas origin, virtual account, PracticePay, COD), dan pelacakan pesanan.
- **PracticePay**: dompet digital dengan saldo, transfer ke kontak, PIN, scan QR (kamera browser atau unggah gambar), dan riwayat transaksi.
- **Akun & Pengaturan**: profil (date picker, unggah foto), alamat (dropdown bertingkat, geolokasi), pusat bantuan (iframe), dan **Developer Options** yang tersembunyi untuk kebutuhan test.

Akun dan data disimpan di Firebase (Authentication + Cloud Firestore) bersama app Android: pesanan yang dibuat di HP terlihat di web dan sebaliknya. Kondisi test tetap deterministik lewat Developer Options, locator (`data-testid`) konsisten dengan resource-id Android, dan semua aturan bersama ada di `docs/contract.md`. Web app di-host di Firebase Hosting dan bisa dipakai gratis tanpa instalasi.

## 2. Latar Belakang & Problem Statement
**Kondisi saat ini**
- Situs latihan web sudah banyak (the-internet, saucedemo, automationexercise), tetapi umumnya kecil, tidak punya alur E2E panjang, dan **tidak punya pasangan app mobile**.
- Engineer yang menguji produk nyata harus mengotomasi web dan mobile dari produk yang sama. Belum ada target latihan yang menyediakan keduanya dengan akun, data, dan alur yang sama.
- Fitur web modern yang sulit diotomasi (iframe lintas origin, Shadow DOM, multi-tab, izin browser, clipboard, offline) jarang muncul di situs latihan, atau muncul sebagai halaman demo terpisah, bukan di alur aplikasi.

**Problem statement**
> Engineer yang belajar automation web tidak punya target latihan yang **terasa seperti aplikasi produksi**, stabil, terdokumentasi locator-nya, bisa dimulai dari kondisi bersih, dan **punya pasangan app mobile dengan data yang sama**. Akibatnya mereka tidak bisa berlatih strategi automation lintas platform pada satu produk.

## 3. Goals, Non-Goals & Success Metrics
### 3.1 Goals
| ID | Goal |
|---|---|
| G1 | Menyediakan web app gratis tanpa instalasi untuk latihan automation web (butuh koneksi internet) |
| G2 | Web app terasa seperti **aplikasi produksi** (marketplace + e-wallet), dan interaksi web yang umum maupun sulit muncul secara alami di fiturnya |
| G3 | Kompatibel dengan Playwright, Cypress, dan WebdriverIO tanpa konfigurasi khusus (batasan tool didokumentasikan) |
| G4 | Setiap fitur punya peta skill, daftar locator, dan contoh kode di `docs/`. **Tidak ada konten materi di dalam app** |
| G5 | Menyediakan alur E2E realistis untuk latihan Page Object Model, test data, dan test isolation (lewat akun baru hasil Register) |
| G6 | Pemula bisa menjalankan test pertamanya (login) ≤ 30 menit dengan mengikuti README |
| G7 | Menyediakan kurikulum berjenjang **Basic → Intermediate → Advanced** di `docs/curriculum.md` |
| G8 | Semua kondisi non-deterministik (delay, acak, error server, waktu) bisa dikontrol lewat **Developer Options** atau URL |
| G9 | Akun, data, alur, teks assertion, dan nama locator **sama dengan app Android**, sehingga satu skenario bisa diotomasi di mobile dan web |

### 3.2 Non-Goals (v1)
- **Tidak ada konten materi di dalam app.**
- Tidak ada server backend sendiri. Backend hanya Firebase (Authentication + Cloud Firestore, plan Spark) tanpa Cloud Functions; semua aturan bisnis berjalan di browser.
- **Tidak responsif**: hanya layout desktop (lihat NFR-03). Mobile web tidak didukung di v1.
- Tidak ada sinkron realtime antar client; data terbaru dibaca saat halaman dibuka atau dimuat ulang (`docs/contract.md` §7).
- Bukan aplikasi produksi; tidak ada pembayaran sungguhan atau data pribadi.
- Tidak mendukung Selenium WebDriver langsung sebagai target utama (tetap bisa dipakai, tetapi tidak ada contoh bawaan).

### 3.3 Success Metrics
| Kategori | Metrik | Target |
|---|---|---|
| Learning | Waktu pemula dari membuka README sampai test login pertama lulus | ≤ 30 menit (diuji ke 3 orang tester) |
| Realisme | Tester menilai web app "terasa seperti aplikasi sungguhan" (skala 1–5) | rata-rata ≥ 4 |
| Kualitas | Elemen interaktif yang punya locator terdokumentasi | 100% |
| Kualitas | Suite *smoke* bawaan hijau di CI (Playwright & Cypress) | 10 run berturut-turut tanpa gagal (dengan mode deterministik) |
| Kualitas | `data-testid` duplikat yang tidak disengaja dalam satu halaman | 0 (dicek di CI) |
| Cakupan | Skill di Lampiran A yang punya minimal 1 fitur tempat ia muncul | 100% |
| Paritas | Requirement Android berstatus "sama" atau "diterjemahkan" yang terimplementasi di web (Lampiran C) | 100% untuk prioritas Must |

## 4. Target User & Persona
| Persona | Profil | Kebutuhan utama | Pain point |
|---|---|---|---|
| **P1 – Rina, QA Manual → Automation** | 2 tahun QA manual, baru belajar Playwright/Cypress | Target app yang mirip pekerjaan nyata; tugas bertahap; contoh kode siap jalan | Bingung kenapa elemen "tidak ketemu"; setup rumit |
| **P2 – Bima, SDET** | Mahir di satu tool, ingin kasus sulit | iframe lintas origin, Shadow DOM, multi-tab, izin browser, flaky, alur E2E panjang | Situs latihan terlalu sederhana |
| **P3 – Sari, Mentor/Bootcamp** | Mengajar kelas QA automation web & mobile | Materi konsisten; data deterministik; tiap siswa memakai akun sendiri; satu produk untuk kelas web & mobile | Tiap siswa punya kondisi app berbeda |
| **P4 – Tim/Tool Evaluator** | Membandingkan Playwright vs Cypress vs WebdriverIO, atau web vs mobile | Target yang sama untuk benchmark | Tidak ada aplikasi netral |

## 5. User Stories
| ID | Sebagai | Saya ingin | Supaya | Prioritas |
|---|---|---|---|---|
| US-01 | P1 | mengotomasi alur nyata (login → cari → beli → bayar → lacak) | pengalaman latihan sama dengan pekerjaan sehari-hari | Must |
| US-02 | P1 | membaca kurikulum per level di `docs/` | tahu urutan belajar | Must |
| US-03 | P1 | melihat daftar locator per halaman di `docs/locators/` | tidak perlu menebak locator | Must |
| US-04 | P1 | melakukan assertion lewat UI yang wajar (pesan error, toast, badge, status, total) | belajar assertion seperti di aplikasi produksi | Must |
| US-05 | P2 | berlatih interaksi mouse & keyboard (hover, klik kanan, double click, drag & drop, shortcut) | siap menghadapi aplikasi nyata | Must |
| US-06 | P2 | berlatih iframe (termasuk lintas origin & bersarang), tab baru, dan JS dialog | bisa menguji integrasi pihak ketiga | Must |
| US-07 | P2 | menghadapi elemen flaky, delay, dan konten dinamis yang muncul wajar | belajar wait & retry yang benar | Must |
| US-08 | P2 | menangani izin browser (notifikasi, kamera, lokasi, clipboard) | bisa menguji web app yang memakai API browser | Must |
| US-09 | P3 | membuat akun baru lewat Register untuk setiap siswa/test | setiap test/siswa mulai dari data default yang sama | Must |
| US-10 | P3 | mengaktifkan mode deterministik | hasil latihan konsisten di kelas & CI | Must |
| US-11 | P4 | memakai test bawaan Playwright, Cypress, dan WebdriverIO sebagai referensi | membandingkan framework | Should |
| US-12 | P1 | menyalakan Locator Hint Overlay di Developer Options | melihat `data-testid` tanpa DevTools | Should |
| US-13 | P2 | mengotomasi bagian app yang dibangun dengan Web Component (Shadow DOM) | paham perbedaan locator Shadow DOM vs DOM biasa | Should |
| US-14 | P3 | menjalankan skenario yang sama di app Android dan web dengan akun yang sama | mengajarkan strategi automation lintas platform | Must |

## 6. Ruang Lingkup, Arsitektur Informasi & Learning Path
### 6.1 Arsitektur informasi
```
/ (Launch)
├── AUTH-01 Onboarding (kunjungan pertama di browser ini)
├── AUTH-02 Login ── AUTH-03 Register
└── Main (navigasi header)
    ├── Beranda ──── SHOP-03 Pencarian → SHOP-04 Hasil + Filter & Urutkan
    │            └── SHOP-05 Detail Produk → SHOP-06 Image Viewer · SHOP-07 Ulasan
    ├── Kategori ─── SHOP-02 Kategori
    ├── PracticePay ─ PAY-01 Beranda dompet → PAY-02 Top Up · PAY-03/04 Transfer · PAY-05 Scan QR · PAY-06 Riwayat
    ├── Keranjang (badge) ─ SHOP-09 → SHOP-10 Voucher → SHOP-11 Checkout
    │             → SHOP-12 Metode Pembayaran → SHOP-13 3DS (iframe) / SHOP-14 VA / PIN PracticePay → SHOP-15 Hasil
    └── Akun ──── ACC-01 Akun → ORD-01…04 · SHOP-08 Wishlist · ACC-02 · ACC-03 · ACC-04 Pengaturan · HELP-01
SYS-01 Halaman tidak ditemukan (URL tidak dikenal)
```

### 6.2 Daftar halaman & URL
Aturan: setiap deep link Android `practiceapp://<path>` punya URL web `https://<host>/<path>` dengan path & parameter yang sama. Semua halaman bisa dibuka langsung lewat URL (setelah login bila perlu login; tanpa sesi → diarahkan ke Login lalu kembali ke URL tujuan).

| ID | Halaman | URL | Prioritas |
|---|---|---|---|
| AUTH-01 | Onboarding (3 slide, Lewati / Lanjut / Mulai) | `/welcome` | Must |
| AUTH-02 | Login | `/login?username=<x>` | Must |
| AUTH-03 | Register | `/register` | Must |
| – | Syarat & Ketentuan (dibuka di tab baru) | `/terms` | Must |
| SHOP-01 | Beranda | `/shop` (juga `/`) | Must |
| SHOP-02 | Kategori | `/shop/category/{slug}` | Should |
| SHOP-03 | Pencarian | `/shop/search?q=<kata>` | Must |
| SHOP-04 | Hasil pencarian + Filter & Urutkan | `/shop/search?q=<kata>` (hasil) | Must |
| SHOP-05 | Detail Produk | `/shop/product/{id}` | Must |
| SHOP-06 | Image Viewer (modal) | – | Must |
| SHOP-07 | Ulasan | `/shop/product/{id}/reviews` | Should |
| SHOP-08 | Wishlist | `/shop/wishlist` | Must |
| SHOP-09 | Keranjang | `/shop/cart` | Must |
| SHOP-10 | Voucher (modal) | – | Must |
| SHOP-11 | Checkout | `/checkout` | Must |
| SHOP-12 | Metode Pembayaran + form kartu | `/checkout/payment` | Must |
| SHOP-13 | 3D Secure (iframe lintas origin) | – | Must |
| SHOP-14 | Instruksi Virtual Account | `/checkout/va/{orderId}` | Must |
| SHOP-15 | Hasil Pembayaran | `/checkout/result/{orderId}` | Must |
| ORD-01 | Pesanan Saya | `/shop/orders` | Must |
| ORD-02 | Detail & Tracking Pesanan | `/shop/order/{orderId}` | Must |
| ORD-03 | Batalkan Pesanan (modal) | – | Must |
| ORD-04 | Beri Ulasan | – | Should |
| PAY-01 | PracticePay | `/pay` | Must |
| PAY-02 | Top Up | `/pay/topup` | Should |
| PAY-03 | Transfer: pilih kontak | `/pay/transfer` | Must |
| PAY-04 | Transfer: nominal & PIN | – | Must |
| PAY-05 | Scan QR | `/pay/qr?merchant=<id>&amount=<n>` | Must |
| PAY-06 | Riwayat Transaksi | `/pay/history` | Must |
| ACC-01 | Akun | `/account` | Must |
| ACC-02 | Edit Profil | `/account/profile` | Must |
| ACC-03 | Daftar & Form Alamat | `/account/address` | Must |
| ACC-04 | Pengaturan + Developer Options | `/settings` | Must |
| HELP-01 | Pusat Bantuan | `/help` | Must |
| SYS-01 | Halaman tidak ditemukan (HTTP 200 dengan halaman 404 di SPA) | URL lain | Should |

Navigasi utama: **header** berisi Beranda · Kategori · PracticePay · Keranjang (badge) · Akun, urutan dan `data-testid` sama dengan bottom navigation Android (`shop_tab_home`, `shop_tab_category`, `shop_tab_pay`, `shop_tab_cart`, `shop_tab_account`). Bottom sheet Android menjadi **modal dialog** (`role="dialog"`). Snackbar & toast menjadi **toast** di region `role="status"`.

### 6.3 Prinsip "aplikasi nyata"
1. **Tidak ada teks materi di dalam app.**
2. **Hasil aksi terlihat lewat UI yang wajar**; teks assertion wajib **persis sama** dengan PRD (dan sama dengan app Android).
3. **Kesulitan automation muncul secara alami**: delay jaringan, countdown, konten acak, error server sesekali, iframe pembayaran, izin browser.
4. **Setiap kesulitan bisa dikendalikan** lewat Developer Options atau URL (§10).
5. **Fitur khusus test disembunyikan**: Akun › Pengaturan › Developer Options, serta URL `/settings?…`.
6. **Data tersimpan seperti aplikasi sungguhan.** Akun & sesi dikelola Firebase Authentication; data per akun dan stok global di Cloud Firestore, dipakai bersama app Android. **Data bertahan saat halaman dimuat ulang, tab/browser ditutup, *clear site data*, dan saat akun dibuka di app Android.** Data terbaru dibaca saat halaman dibuka atau dimuat ulang. Tidak ada fitur reset data; test yang butuh data bersih memakai akun baru hasil Register. Pengaturan, "Ingat saya", dan status onboarding disimpan di `localStorage` browser.

### 6.4 Learning Path per Level (di `docs/curriculum.md`)
| | **Basic** | **Intermediate** | **Advanced** |
|---|---|---|---|
| Target learner | Baru mulai automation web | Sudah bisa menulis test sederhana | Siap menangani aplikasi nyata yang kompleks |
| Kompetensi | Setup tool, inspeksi elemen, strategi locator, input, klik, assertion teks & atribut | Hover, drag & drop, scroll, explicit wait, modal, navigasi & URL, Page Object Model, data-driven test | iframe lintas origin, tab baru, Shadow DOM, izin browser, offline, test flaky, test isolation, E2E lintas halaman, lintas platform (web + Android), CI |
| Fitur yang dipakai | Onboarding, Login, Register, Pencarian, Detail Produk, Edit Profil | Filter & Urutkan, Keranjang, Voucher, Checkout, Pesanan Saya, Tracking, Batalkan, Alamat, Riwayat | 3DS, VA, Pusat Bantuan, Scan QR, Transfer (Shadow DOM), notifikasi, Developer Options |
| Checkpoint | **CP-B:** login, cari "kaos", buka detail, pilih varian, add to cart, assert badge & subtotal; negatif `locked_user` (N-01) | **CP-I:** E2E-05, voucher data-driven (N-04), filter & sort, URL langsung (E2E-08), dengan POM | **CP-A:** E2E-01 penuh, E2E-09, N-09, EDGE-01…12 termasuk `slow_user`, `glitch_user`, dan EDGE-11 lintas platform |
| Estimasi waktu belajar | ± 1–2 minggu | ± 2–3 minggu | ± 3–4 minggu |

## 7. Peta Skill → Fitur
| Area skill | Skill | Muncul di (fitur & perilaku) | Prioritas |
|---|---|---|---|
| Locator | `data-testid` | Semua elemen interaktif (§12) | Must |
| | role + accessible name / `aria-label` saja | Tombol ikon: wishlist (hati), notifikasi, kembali, hapus riwayat pencarian, salin VA/Order ID | Must |
| | text saja | Link "Daftar", "Lihat semua" | Must |
| | teks kembar + locator relatif | Tombol "+ Keranjang" di setiap kartu produk; "Ubah" di setiap baris alamat | Must |
| | label–nilai (XPath following-sibling / CSS `:has`) | Ringkasan checkout, detail pesanan, About | Must |
| | teks dinamis (regex) | Order ID `PM-YYYYMMDD-XXXX`, countdown VA/flash sale, "Diperbarui HH:mm:ss" | Must |
| | tersembunyi (`display:none`, `hidden`, `aria-hidden`) | Saldo disembunyikan (`Rp••••••`), password masked, banner promo ditutup, empty state | Must |
| | teks terpotong (`text-overflow: ellipsis`) | Nama produk panjang di grid | Should |
| | tanpa `data-testid` | Riwayat Transaksi (PAY-06) sebagai pembanding | Should |
| Input & form | input teks, validasi, error inline | Login, Register, Alamat, Edit Profil, Transfer | Must |
| | input terformat | Nomor kartu per 4 digit, nominal Rupiah, nomor HP `+62` | Must |
| | checkbox (termasuk tri-state `indeterminate`), radio, switch (`role="switch"`) | Ingat saya, S&K, Pilih Semua keranjang, kurir, metode bayar, asuransi, alamat utama | Must |
| | disabled & read-only | Tombol Bayar/Lanjut sebelum valid, varian stok habis, Same Day, COD > limit | Must |
| | unggah file (`<input type=file>` & drag-and-drop file) | Foto profil, QR dari gambar, foto ulasan | Must |
| Pickers | `<select>` native | Provinsi di Form Alamat | Must |
| | combobox/autocomplete kustom (ARIA) | Kota di Form Alamat | Must |
| | chip filter / choice | Filter kategori, urutkan, label alamat, chip nominal transfer | Must |
| | range slider dua handle | Rentang harga di Filter | Must |
| | rating bintang (0,5 step) | Beri Ulasan | Should |
| | date picker kustom (kalender popup) | Tanggal lahir (Edit Profil) | Must |
| | date range picker | Filter tanggal di Riwayat Transaksi | Should |
| | time picker | Jadwal kirim Same Day di Checkout | Should |
| | stepper qty | Detail Produk & Keranjang (min 1, maks 10) | Must |
| State elemen | enabled/checked/selected/focused/`aria-selected` | Tab status pesanan, toggle grid/list, chip varian, tombol Bayar | Must |
| | loading button | Bayar, Simpan Alamat | Must |
| | badge | Keranjang, filter aktif, pesanan aktif | Must |
| Mouse & keyboard | hover (menu & tooltip) | Tooltip tombol ikon; tombol hapus muncul saat hover baris keranjang | Must |
| | double click | Zoom 2× di Image Viewer | Must |
| | klik kanan (context menu) | Item riwayat pencarian → menu "Hapus" | Must |
| | drag & drop | Atur urutan Wishlist dengan drag handle | Must |
| | scroll wheel + modifier | Ctrl + scroll untuk zoom di Image Viewer | Should |
| | klik koordinat | Pilih titik di peta Form Alamat | Should |
| | keyboard (Tab, Enter, Esc, panah) | Enter di pencarian, Esc menutup modal, panah antar gambar & tab | Must |
| Lists & scroll | list panjang, scroll into view | Katalog 60 produk, kontak transfer, ulasan | Must |
| | infinite scroll | Hasil pencarian (20 per halaman), Riwayat Transaksi | Must |
| | carousel, grid, nested | Banner, rekomendasi, Kategori | Must |
| | sticky header (`position: sticky`) | Kontak A–Z, tanggal di Riwayat | Must |
| | accordion | FAQ, cara bayar VA | Must |
| | scroll bersarang | Daftar voucher di dalam modal | Should |
| Waits | delay & loading overlay | Semua loading (diatur Network latency), `slow_user` | Must |
| | teks berganti bertahap | Status pesanan otomatis maju | Must |
| | countdown | VA, flash sale, login terkunci | Must |
| | toast | "Ditambahkan ke keranjang", "Nomor VA disalin", "Menghubungkan ke CS PracticeMart…" | Must |
| | re-render (elemen diganti) | Flash sale dan status tracking yang diperbarui berkala | Should |
| Dialogs | modal kustom (`role="dialog"`) | Konfirmasi logout, reset pengaturan, hapus alamat, Filter, Voucher, Batalkan, PIN | Must |
| | JS dialog `confirm()` | "Batal" di 3DS | Must |
| | popup / overflow menu | Detail Produk (Bagikan, Laporkan) | Must |
| | overlay non-cancelable | Pembayaran sedang diproses | Should |
| Navigasi & URL | navigasi header, tab | Navigasi utama, Pesanan Saya | Must |
| | browser back/forward vs tombol kembali in-app | Detail Produk → produk terkait → … | Must |
| | URL langsung (+ parameter, invalid) | §6.2, SYS-01 | Must |
| | redirect ke Login lalu kembali | Membuka URL terproteksi tanpa sesi | Must |
| Frames & windows | iframe lintas origin | 3DS (SHOP-13) | Must |
| | iframe same-origin + `postMessage` ke halaman induk | Pusat Bantuan (HELP-01) | Must |
| | iframe bersarang | Form kontak di Pusat Bantuan | Should |
| | tab baru (`target="_blank"`) | Syarat & Ketentuan di Register | Must |
| Fitur browser | `localStorage` / IndexedDB / cookie | "Ingat saya", Developer Options, sesi Firebase | Must |
| | clipboard | Salin nomor VA & Order ID; tempel kode voucher | Must |
| | notifikasi browser | Pesanan berhasil, status pesanan, transfer berhasil | Must |
| | tutup tab, reload, kembali dari tab lain | Checkout & keranjang tetap utuh | Must |
| | offline | Banner "Tidak ada koneksi" & tombol Bayar disabled | Must |
| | geolokasi | "Gunakan lokasi saat ini" di Form Alamat | Must |
| | kamera (`getUserMedia`) | Scan QR | Should |
| | WebAuthn (passkey) | Login dengan passkey | Could |
| | tema | Terang/Gelap/Sistem di Pengaturan | Should |
| Izin browser | prompt izin & izin ditolak | Notifikasi (kunjungan pertama), Kamera (Scan QR), Lokasi (Alamat), Clipboard | Must |
| Media | lazy load gambar | Placeholder gambar produk | Should |
| | visual baseline | Onboarding slide 1 (statis) | Should |
| | canvas | Tanda tangan penerimaan COD | Could |
| A11y & i18n | ganti bahasa ID ↔ EN | Pengaturan (test berbasis text gagal, berbasis `data-testid` tetap lulus) | Should |
| | aksesibilitas terukur (axe) | Semua halaman | Should |
| Shadow DOM | Web Component dengan Shadow DOM terbuka | Seluruh alur Transfer PracticePay (PAY-03, PAY-04) | Should |
| Challenge | urutan acak | Rekomendasi di Beranda diacak tiap dibuka (mode deterministik OFF) | Must |
| | elemen bergerak | Banner auto-slide | Must |
| | overlay memblokir klik | Overlay "Memproses pembayaran…" ±2 dtk | Must |
| | error flaky | "Gagal memuat, coba lagi" pada Top Up dan Cek Status VA | Must |
| | jendela waktu | Tombol "Beli" flash sale aktif hanya selama countdown | Must |
| | NBSP / spasi trailing | Harga di Detail Produk memakai non-breaking space bila `glitch_user` | Should |
| | tombol di luar viewport | "Simpan Alamat" di bawah form panjang | Must |
| | toast super singkat | "Nomor VA disalin" (1 dtk bila Animasi OFF) | Should |
| Lintas platform | skenario yang sama di Android & web | EDGE-11, EDGE-12 | Must |

## 8. Functional Requirements per Area Fitur
Format ID sama dengan PRD Android. Teks yang disebut di requirement wajib **persis sama** (case-sensitive) dan sama dengan app Android. "content-desc" Android = `aria-label` di web. Business rules di `docs/contract.md` §2.

### 8.1 Auth & Onboarding (AUTH)
| ID | Requirement | Prioritas |
|---|---|---|
| FR-AUTH-01 | Onboarding 3 slide hanya tampil di kunjungan pertama di browser ini, termasuk setelah *clear site data* (selalu tampil untuk `new_user`); tombol Lewati/Lanjut, panah keyboard antar slide, slide terakhir tombol "Mulai" | Must |
| FR-AUTH-02 | Setelah onboarding di kunjungan pertama, app meminta izin notifikasi browser | Must |
| FR-AUTH-03 | Login: `shop_input_username`, `shop_input_password`, `shop_btn_login`; Enter di field password = submit | Must |
| FR-AUTH-04 | Toggle show/hide password, `aria-label` `"Tampilkan password"` / `"Sembunyikan password"` | Must |
| FR-AUTH-05 | Validasi kosong inline: `"Username wajib diisi"`, `"Password wajib diisi"` | Must |
| FR-AUTH-06 | Kredensial salah: banner `shop_txt_login_error` = `"Username atau password salah"` | Must |
| FR-AUTH-07 | 3× gagal berturut-turut → terkunci 30 detik, tombol disabled dengan label `"Coba lagi dalam 30 detik"` (berkurang tiap detik) | Must |
| FR-AUTH-08 | `locked_user` dengan password benar → `"Akun Anda terkunci. Hubungi admin."` | Must |
| FR-AUTH-09 | Login sukses → Beranda dengan sapaan `"Halo, <Nama Tampilan>"` (mis. `"Halo, Standard User"`); bila login dipicu dari URL terproteksi, kembali ke URL itu | Must |
| FR-AUTH-10 | "Ingat saya" menyimpan username di `localStorage`, tetap terisi setelah browser ditutup | Should |
| FR-AUTH-11 | Login dengan passkey (WebAuthn) tersedia setelah login pertama; hasil `"Autentikasi gagal"` bila dibatalkan/tidak cocok | Could |
| FR-AUTH-12 | Register: nama, email (`"Format email tidak valid"`), password (min 8, huruf+angka, indikator `Lemah`/`Sedang`/`Kuat`, helper `"Minimal 8 karakter, berisi huruf dan angka"`), konfirmasi (`"Konfirmasi password tidak sama"`), checkbox S&K wajib; link "Syarat & Ketentuan" membuka `/terms` di **tab baru**; tombol "Daftar" disabled sampai semua valid; sukses → halaman Login | Must |
| FR-AUTH-13 | ~~Lupa password~~ **Dihapus dari web** (keputusan 2026-11-20). Teks Lupa Password di `docs/contract.md` §6 hanya berlaku untuk Android | – |
| FR-AUTH-15 | URL `/login?username=<x>` mengisi field username | Should |
| FR-AUTH-17 | Sesi login disimpan: setelah reload, tab ditutup, atau browser di-restart, app langsung membuka Beranda dengan akun yang sama sampai user Keluar. Sesi, akun hasil Register, dan password dikelola Firebase Authentication | Must |

### 8.2 Belanja (SHOP-01 … SHOP-10)
| ID | Requirement | Prioritas |
|---|---|---|
| FR-SHOP-01 | Beranda menampilkan saldo PracticePay (link ke PAY-01), banner carousel auto-slide 4 dtk dengan indikator dan tombol panah, chip 6 kategori, flash sale dengan countdown, dan grid rekomendasi | Must |
| FR-SHOP-02 | Urutan rekomendasi diacak setiap Beranda dibuka; tetap bila mode deterministik ON (`docs/contract.md` §4.2) | Must |
| FR-SHOP-03 | Katalog 60 produk, 6 kategori; data dari Firestore `products` & `catalog/meta` | Must |
| FR-SHOP-04 | Search: suggestion muncul setelah ≥ 2 karakter; Enter membuka hasil; riwayat 5 pencarian terakhir, bisa dihapus per item (ikon ×, klik kanan → "Hapus") atau "Hapus semua"; empty state `"Tidak ada saran untuk \"<q>\""` | Must |
| FR-SHOP-05 | Filter (modal): kategori (multi chip), rentang harga (slider dua handle + input min/maks), rating minimal (radio), "Hanya stok tersedia" (switch); badge jumlah filter aktif di tombol Terapkan dan di ikon filter | Must |
| FR-SHOP-06 | Urutkan: Paling Relevan, Harga Terendah, Harga Tertinggi, Rating Tertinggi, Terbaru | Must |
| FR-SHOP-07 | Hasil pencarian: jumlah produk + urutan aktif (`"12 produk · Harga Terendah"`), toggle tampilan grid/list, infinite scroll 20 produk per halaman dengan footer `"Memuat produk lainnya…"`; akhir daftar `"Semua produk sudah ditampilkan"` | Must |
| FR-SHOP-07a | Setiap kartu produk punya tombol "+ Keranjang" (teks kembar; di tampilan list berupa tombol ikon dengan `aria-label` `"Tambah <nama produk> ke keranjang"`). Produk stok 0 → tombol disabled `"Stok Habis"` | Must |
| FR-SHOP-08 | Detail produk: galeri (tombol panah, thumbnail, indikator `"2/5"`), harga coret + persen diskon, varian Warna × Ukuran; kombinasi stok 0 → chip disabled & tombol `"Stok Habis"` | Must |
| FR-SHOP-09 | Stepper qty: min 1, maks = stok varian (maks 10); melebihi batas → `"Maksimal pembelian 10 pcs"` | Must |
| FR-SHOP-10 | Add to Cart → toast `"Ditambahkan ke keranjang"` + aksi `"Lihat"`; badge keranjang bertambah | Must |
| FR-SHOP-11 | "Beli Sekarang" langsung ke Checkout hanya dengan produk tersebut. Web: tombol `shop_btn_buy_now`; keranjang tidak diubah | Should |
| FR-SHOP-12 | Wishlist toggle (`aria-label` `"Tambah ke wishlist"` / `"Hapus dari wishlist"`), tersinkron antar halaman; Wishlist bisa diatur urutannya dengan drag & drop pada drag handle (alternatif keyboard: Spasi pilih, panah pindah) Web: halaman `/shop/wishlist` (menu akun), hapus → toast `"Dihapus dari wishlist"`, empty state `"Wishlist masih kosong"` | Must |
| FR-SHOP-13 | Image Viewer (modal, dibuka dari tombol "Perbesar gambar"): zoom 50–300% lewat tombol +/− dan Ctrl + scroll, double click zoom 2×, indikator zoom `"2,0×"` saat diperbesar, tombol & panah keyboard antar gambar, indikator `"3/5"`, thumbnail, Esc menutup | Must |
| FR-SHOP-14 | Overflow menu (`aria-label` `"Menu lainnya"`) di Detail Produk: Bagikan (Web Share API bila tersedia; selain itu salin tautan → toast `"Tautan disalin"`), Laporkan | Should |
| FR-SHOP-15 | Flash sale: tombol "Beli" aktif hanya selama countdown; harga flash berlaku hanya selama countdown | Should |
| FR-SHOP-16 | Keranjang: item dari produk+varian sama digabung; checkbox per item & Pilih Semua (tri-state); ubah qty; tombol hapus muncul saat hover baris (juga terlihat saat baris fokus keyboard) → item hilang + toast Undo 4 dtk; "Simpan untuk nanti" | Must |
| FR-SHOP-17 | Keranjang disimpan per akun: bertahan setelah logout lalu login ulang, reload, tutup tab; sama dengan app Android setelah halaman dibuka/dimuat ulang. Akun lain punya keranjang, wishlist, riwayat pencarian, pesanan, alamat, dan saldo sendiri | Must |
| FR-SHOP-18 | Voucher (modal dari Keranjang): input kode + tombol "Tempel" (clipboard, minta izin browser bila perlu) + "Pakai"; daftar voucher dengan tombol "Pakai"/"Lepas" (voucher kedaluwarsa disabled); hanya 1 voucher aktif; pesan error spesifik (`docs/contract.md` §2); tombol bawah `"Selesai · <KODE> terpasang"` | Must |

### 8.3 Checkout & Pembayaran (SHOP-11 … SHOP-15)
| ID | Requirement | Prioritas |
|---|---|---|
| FR-PAYM-01 | Ringkasan harga dihitung ulang real-time (subtotal, diskon, ongkir, asuransi, biaya layanan, total) | Must |
| FR-PAYM-02 | Checkout: alamat default terpilih otomatis; bisa ganti/tambah alamat (ACC-03) | Must |
| FR-PAYM-03 | Kurir Reguler/Express/Same Day; Same Day disabled dengan label `"Tidak tersedia untuk kota ini"` di luar DKI Jakarta; bila Same Day dipilih, wajib pilih jam kirim (time picker, 09:00–17:00) | Must |
| FR-PAYM-04 | State checkout tetap terjaga saat halaman dimuat ulang dan saat kembali dari tab lain (`sessionStorage`) | Must |
| FR-PAYM-05 | Metode bayar: Kartu Kredit/Debit, Virtual Account (BCA/BNI/Mandiri), PracticePay, COD | Must |
| FR-PAYM-06 | Kartu: format nomor otomatis per 4 digit, validasi Luhn (`"Nomor kartu tidak valid"`), MM/YY tidak boleh lewat (`"Kartu sudah kedaluwarsa"`), CVV 3 digit; tombol Bayar disabled sampai valid | Must |
| FR-PAYM-07 | 3DS di **iframe lintas origin** (domain bank terpisah, mis. site Firebase Hosting kedua): input OTP (`id="otp"`, `data-testid="otp"`), Submit, "Batal" memicu JS `confirm("Batalkan transaksi?")` di dalam iframe; hasil dikirim ke halaman induk dengan `postMessage` | Must |
| FR-PAYM-08 | VA: nomor VA + tombol "Salin" (toast `"Nomor VA disalin"`) + countdown (default 15 menit) + accordion cara bayar; "Saya sudah bayar" → sukses; kedaluwarsa → order `Dibatalkan` Web: pilih bank BCA/BNI/Mandiri di checkout; nomor VA BCA deterministik `8077 0000 1234 5678`, lainnya prefix bank + digit Order ID; "Saya sudah bayar" di Detail Pesanan | Must |
| FR-PAYM-09 | "Cek Status" pada VA bisa gagal sesuai "Peluang error server" dengan pesan `"Gagal memuat, coba lagi"` Web: sukses tapi belum dibayar → toast `"Pembayaran belum diterima"` | Must |
| FR-PAYM-10 | PracticePay: modal PIN 6 digit (sama dengan FR-PAY-06); saldo kurang → opsi disabled dengan label `"Saldo tidak cukup"` | Must |
| FR-PAYM-11 | COD ditolak bila total > Rp1.000.000 (opsi disabled + alasan `"Untuk total maksimal Rp1.000.000"`) | Must |
| FR-PAYM-12 | Tombol "Bayar" mencegah double submit (disabled setelah klik pertama + loading) dan menampilkan overlay non-cancelable `"Memproses pembayaran…"` ±2 dtk × latency | Must |
| FR-PAYM-13 | Hasil: `"Pembayaran Berhasil"` / `"Pembayaran Gagal"` / `"Menunggu Pembayaran"`; Order ID `PM-YYYYMMDD-XXXX` dengan nomor urut per akun (aturan `docs/contract.md` §8.3) dan tombol salin | Must |
| FR-PAYM-14 | Order sukses → notifikasi browser `"Pesanan PM-… berhasil dibuat"` (bila izin diberikan; klik membuka Detail Pesanan) dan toast dengan teks yang sama | Must |
| FR-PAYM-15 | Offline saat checkout → banner `"Tidak ada koneksi"` dan tombol Bayar disabled | Must |

### 8.4 Pesanan (ORD)
| ID | Requirement | Prioritas |
|---|---|---|
| FR-ORD-01 | Pesanan Saya: tab Semua / Menunggu / Diproses / Dikirim / Selesai / Dibatalkan (klik & panah keyboard), tombol muat ulang (`aria-label` `"Muat ulang"`), empty state `"Belum ada pesanan"` | Must |
| FR-ORD-02 | Tracking: status maju otomatis **Menunggu Pembayaran → Dibayar → Dikemas → Dikirim → Selesai** (interval default 10 dtk; mode Manual menampilkan tombol "Status berikutnya") | Must |
| FR-ORD-03 | Batalkan hanya bila status ≤ Dikemas, lewat modal; tombol "Batalkan" disabled sampai alasan dipilih; "Lainnya" memunculkan field teks | Must |
| FR-ORD-04 | Status Dikirim → tombol batal hilang, tampil `"Pesanan yang sudah dikirim tidak bisa dibatalkan"` | Must |
| FR-ORD-05 | Stok produk berkurang setelah order sukses dan kembali bila dibatalkan (stok global, sama dengan Android) | Must |
| FR-ORD-06 | Pesanan Selesai → tombol "Beri Ulasan" (rating bintang 0,5, teks, foto lewat unggah file) yang muncul di halaman ulasan produk | Should |
| FR-ORD-07 | COD Selesai meminta tanda tangan penerima (canvas, digambar dengan mouse) → `"Tanda tangan tersimpan"` | Could |

### 8.5 PracticePay (PAY)
Seluruh alur Transfer (PAY-03, PAY-04) dibangun sebagai **Web Component dengan Shadow DOM terbuka** (`data-testid` ada di dalam shadow root, konvensi sama). Riwayat (PAY-06) dibangun **tanpa** `data-testid` sebagai pembanding (locator lewat role, teks, dan struktur).

| ID | Requirement | Prioritas |
|---|---|---|
| FR-PAY-01 | Beranda PracticePay: saldo dengan toggle sembunyikan (`"Rp••••••"`, `aria-label` `"Sembunyikan saldo"` / `"Tampilkan saldo"`), aksi Top Up / Transfer / Scan QR / Riwayat, 4 transaksi terakhir | Must |
| FR-PAY-02 | Top Up **versi sederhana di web** (keputusan 2026-11-20): input nominal Rp10.000–Rp10.000.000 (`"Minimal top up Rp10.000"` / `"Maksimal top up Rp10.000.000"`) → saldo bertambah, transaksi `"Top Up Saldo"`, hasil `"Top up berhasil"`; tanpa pilih bank & tanpa PIN; bisa gagal sesuai "Peluang error server" (`"Gagal memuat, coba lagi"`) | Should |
| FR-PAY-03 | Transfer – pilih kontak: daftar kontak uji (`docs/contract.md` §4.4) dengan sticky header A–Z, search nama/nomor, deretan "Terakhir"; empty state `"Kontak tidak ditemukan"`. Web: "Terakhir" = 3 penerima transfer terbaru dari riwayat | Must |
| FR-PAY-05 | Transfer – nominal: input auto-format Rupiah, chip Rp50.000/Rp100.000/Rp200.000, catatan opsional (maks 50 karakter); `"Minimal transfer Rp10.000"`; `"Saldo tidak cukup"`; tombol Lanjut disabled bila tidak valid. Web: catatan masuk judul transaksi `"Transfer ke <nama> · <catatan>"` | Must |
| FR-PAY-06 | PIN: modal dengan PIN pad (tombol angka bertext `0`–`9`, tombol hapus `aria-label` `"Hapus"`, juga menerima ketikan keyboard), 6 indikator; PIN valid `123456`; salah → `"PIN salah. Sisa N percobaan."`; 3× salah → PracticePay terkunci 30 dtk. Hitungan salah & kunci disimpan di Firestore (berlaku juga di Android) | Must |
| FR-PAY-07 | Transfer berhasil → `"Transfer berhasil"`, saldo berkurang, transaksi muncul di Riwayat, notifikasi browser | Must |
| FR-PAY-08 | Opsi konfirmasi dengan passkey (WebAuthn) sebagai pengganti PIN | Could |
| FR-PAY-09 | Scan QR: meminta izin kamera browser; ditolak → banner `"Izin kamera ditolak"` + petunjuk mengizinkan kamera di pengaturan situs; QR juga bisa diunggah dari file gambar (`docs/assets/qr/`) | Must |
| FR-PAY-10 | QR valid → halaman konfirmasi merchant + nominal (bisa diubah untuk merchant nominal bebas) → PIN → `"Pembayaran berhasil"`. URL `/pay/qr?merchant=KOPIPAGI&amount=28000` mensimulasikan hasil scan | Must |
| FR-PAY-11 | Riwayat: chip Semua/Masuk/Keluar, date range picker, sticky header tanggal, infinite scroll (20 per halaman), tombol muat ulang dengan teks `"Diperbarui HH:mm:ss"` | Must |

### 8.6 Akun, Alamat & Bantuan (ACC, HELP)
| ID | Requirement | Prioritas |
|---|---|---|
| FR-ACC-01 | Akun: profil (inisial, nama, username), menu Pesanan Saya (badge jumlah aktif), Wishlist, Daftar Alamat, PracticePay, Pengaturan, Pusat Bantuan, Developer Options; Keluar dengan modal konfirmasi. Web: badge pesanan aktif = Menunggu Pembayaran s/d Dikirim | Must |
| FR-ACC-02 | Edit Profil: ubah foto (unggah file atau drag-and-drop ke area foto), nama, email, tanggal lahir (date picker kalender kustom, format `YYYY-MM-DD`), jenis kelamin (radio); Simpan → toast `"Profil tersimpan"` | Must |
| FR-ACC-03 | Form Alamat: "Gunakan lokasi saat ini" (Geolocation API, mengisi provinsi/kota dari koordinat uji `docs/contract.md` §4.3), label Rumah/Kantor/Lainnya, nama penerima, No. HP, Provinsi (`<select>` native) → Kota (combobox autocomplete), alamat lengkap, kode pos 5 digit (`"Kode pos harus 5 digit"`), switch alamat utama | Must |
| FR-ACC-04 | Tombol "Simpan Alamat" berada di bawah form panjang dan berada di luar viewport 1280×720 sampai di-scroll | Must |
| FR-ACC-05 | Pilih titik di peta (gambar peta statis, klik koordinat menampilkan pin dan teks `"Titik dipilih"`) | Should |
| FR-ACC-06 | Pengaturan umum: Bahasa (Indonesia/English), Tema (Sistem/Terang/Gelap), Notifikasi pesanan (switch) | Must |
| FR-HELP-01 | Pusat Bantuan: konten FAQ dimuat dalam iframe same-origin dengan search (`data-testid="faq-search"`), accordion FAQ, tombol "Hubungi kami" (`data-testid="btn-contact"`) yang mengirim `postMessage` ke halaman induk → toast `"Menghubungkan ke CS PracticeMart…"` | Must |
| FR-HELP-03 | Form kontak di dalam iframe bersarang (iframe di dalam iframe FAQ); tombol "Chat dengan CS" di halaman induk | Should |
| FR-HELP-04 | "Telepon CS" berupa link `tel:` (diuji lewat atribut `href`) | Should |

## 9. Skenario E2E
Tag: `smoke`, `regression`, `negative`, `edge`. Akun uji dipakai bersama semua learner dan platform; untuk hasil deterministik pakai akun baru hasil Register.

### 9.1 Happy path utama — E2E-01 (smoke)
| Step | Aksi | Expected result |
|---|---|---|
| 1 | Buka web app di browser context baru (tanpa data situs) | Onboarding tampil |
| 2 | Klik "Lanjut" 2× → "Mulai"; izinkan notifikasi | Halaman login |
| 3 | Login `standard_user` / `Practice123!` | Beranda tampil, sapaan `"Halo, Standard User"` |
| 4 | Ketik `"kaos"` di pencarian → pilih suggestion `"Kaos Polos Basic"` | Detail produk P001 |
| 5 | Kembali ke hasil, buka Filter: kategori Fashion, harga Rp50.000–Rp200.000, rating ≥ 4, "Hanya stok tersedia" → Terapkan | Badge filter `"4"`; semua hasil sesuai filter |
| 6 | Urutkan "Harga Terendah" | Harga hasil terurut naik |
| 7 | Buka P001 Kaos Polos Basic | Detail tampil; galeri `"1/5"` |
| 8 | Klik panah galeri sampai gambar 3 | Indikator `"3/5"` |
| 9 | Pilih Warna Hitam, Ukuran L; qty +1 → 2 | XL disabled; harga per item Rp75.000 |
| 10 | Add to Cart | Toast tampil; badge `"2"` |
| 11 | Tambah ke wishlist | `aria-label` berubah; muncul di Wishlist |
| 12 | Buka Keranjang | 1 item, qty 2, subtotal Rp150.000 |
| 13 | Pasang voucher `HEMAT10` | Diskon −Rp15.000 |
| 14 | Checkout → alamat default (Bandung) → kurir Express → asuransi ON | Same Day disabled; total **Rp158.000** |
| 15 | Muat ulang halaman checkout | Semua pilihan tetap |
| 16 | Pilih Kartu `4111 1111 1111 1111`, 12/30, CVV 123 → Bayar | Overlay memproses, lalu 3DS dalam iframe |
| 17 | Masuk ke iframe 3DS, isi OTP `123456`, Submit, kembali ke halaman utama | `"Pembayaran Berhasil"` |
| 18 | Simpan Order ID | Format `PM-YYYYMMDD-XXXX` |
| 19 | Klik notifikasi/toast pesanan | Detail pesanan dengan ID yang sama |
| 20 | Tunggu status sampai `"Selesai"` | Timeline lengkap 5 status |
| 21 | Beri ulasan 5 bintang | Ulasan tampil di produk P001 |
| 22 | Logout | Kembali ke login; badge keranjang tidak tampil |

### 9.2 Katalog skenario
| ID | Skenario | Tag | Skill utama |
|---|---|---|---|
| E2E-01 | Happy path kartu kredit + tracking + ulasan (§9.1) | smoke | POM, iframe, wait |
| E2E-02 | Happy path Virtual Account: salin nomor VA (clipboard) → "Saya sudah bayar" | smoke | clipboard |
| E2E-03 | Bayar dengan PracticePay (PIN) → saldo berkurang sesuai total | regression | modal, assertion saldo |
| E2E-04 | COD dengan total < Rp1.000.000 | regression | – |
| E2E-05 | Multi-item: 3 produk berbeda, hapus 1 lewat tombol hapus (hover), Undo, lalu checkout hanya 2 item terpilih | regression | hover, checkbox |
| E2E-06 | "Beli Sekarang" langsung dari detail | regression | – |
| E2E-07 | Tambah alamat baru Jakarta (pakai geolokasi) → Same Day tersedia → pilih jam kirim | regression | geolokasi, time picker |
| E2E-08 | Buka URL `/shop/product/P010` → add to cart → checkout | regression | URL langsung |
| E2E-09 | Transfer Rp150.000 ke Budi Santoso (PIN) → Riwayat menampilkan transaksi | smoke | Shadow DOM, sticky list |
| E2E-10 | Scan QR via URL/unggah gambar → bayar merchant → Riwayat | regression | izin kamera, unggah file |
| E2E-11 | Edit profil: ubah tanggal lahir lewat date picker, ganti foto dengan unggah file | regression | picker, unggah file |
| E2E-12 | Pusat Bantuan: cari FAQ di iframe, klik "Hubungi kami" → toast di halaman induk | regression | iframe, postMessage |
| E2E-13 | Register: buka "Syarat & Ketentuan" (tab baru), tutup tab, selesaikan pendaftaran | regression | multi-tab |
| N-01 | Login `locked_user` | negative | assertion error |
| N-02 | Varian stok habis tidak bisa dibeli | negative | state disabled |
| N-03 | Qty melebihi batas | negative | – |
| N-04 | Voucher `EXPIRED`, `MIN100K` di bawah minimum, kode acak | negative | data-driven test |
| N-05 | Kartu ditolak `4000 0000 0000 0002` → `"Pembayaran Gagal"`, keranjang utuh | negative | – |
| N-06 | Kartu pending `4000 0000 0000 0119` → status `Menunggu Pembayaran` | negative | – |
| N-07 | COD dengan total > Rp1.000.000 tidak bisa dipilih | negative | – |
| N-08 | Nomor kartu gagal Luhn, kartu kedaluwarsa | negative | validasi |
| N-09 | Countdown VA habis (30 dtk) → order `Dibatalkan`, stok kembali | negative | wait panjang |
| N-10 | Batalkan pesanan berstatus Dikirim → tombol tidak tersedia | negative | – |
| N-11 | PIN salah 3× → PracticePay terkunci 30 dtk | negative | – |
| N-12 | Transfer melebihi saldo / di bawah Rp10.000 | negative | validasi |
| N-13 | Tolak izin kamera di Scan QR → banner `"Izin kamera ditolak"` | negative | izin browser |
| EDGE-01 | Tutup tab saat di keranjang → buka lagi → masih login, keranjang, badge, dan stok sama. Variasi: *clear site data* → harus login ulang; setelah login, keranjang tetap sama | edge | storage & persistence |
| EDGE-02 | Pindah ke tab lain 10 dtk saat checkout → kembali, state utuh | edge | visibility |
| EDGE-03 | Double click tombol Bayar → hanya 1 order terbuat | edge | idempotensi |
| EDGE-04 | Offline saat checkout → banner `"Tidak ada koneksi"` & tombol Bayar disabled | edge | network |
| EDGE-05 | `slow_user` menjalankan E2E-01 tanpa mengubah test (hanya wait yang benar) | edge | sync |
| EDGE-06 | `glitch_user` menjalankan E2E-01, test harus **menangkap** bug `docs/contract.md` §3 | edge | assertion |
| EDGE-07 | Stok berkurang setelah order dan tetap berkurang setelah reload, *clear site data*, dan di app Android; hanya pembatalan atau VA kedaluwarsa yang mengembalikannya | edge | persistence |
| EDGE-08 | Peluang error server 50%: Top Up dan Cek Status VA tetap lulus dengan retry yang benar | edge | retry |
| EDGE-09 | Ganti bahasa ke English → test berbasis `data-testid` tetap lulus | edge | i18n |
| EDGE-10 | Versi baru di-deploy saat tab terbuka → muat ulang → masih login, pesanan & saldo sama | edge | persistence saat update |
| EDGE-11 | Buat pesanan di app Android → buka/muat ulang Pesanan Saya di web dengan akun yang sama → pesanan, saldo, keranjang sama | edge | lintas platform |
| EDGE-12 | Akun sama dibuka di HP dan web bersamaan, buat pesanan PracticePay di keduanya → dua Order ID berurutan tanpa duplikat, saldo berkurang dua kali dengan benar | edge | konkurensi |

## 10. Developer Options & Test Hooks
Letaknya di **Akun › Pengaturan › Developer Options** (bagian bertanda DEV). Semantik setiap pengaturan sama dengan Android (`docs/contract.md` §5); nilainya disimpan di `localStorage` per browser.

| ID | Fitur | Deskripsi | Prioritas |
|---|---|---|---|
| DEV-01 | Developer Options | Pengaturan test (kontrak §5) | Must |
| DEV-02 | Test hooks via URL | `/settings?deterministic=true&latency=0&animations=false&flaky=0` menyimpan pengaturan lalu kembali ke halaman sebelumnya tanpa UI | Must |
| DEV-03 | Locator Hint Overlay | Bila aktif, setiap elemen interaktif menampilkan label kecil berisi `data-testid` | Should |
| DEV-04 | About | Versi web app, commit SHA, tanggal build, versi kontrak bersama, versi kontrak locator | Must |

Pengaturan: Reset pengaturan, Mode deterministik, Network latency multiplier, Animasi, Peluang error server, Batas waktu VA, Update status pesanan, Locator Hint Overlay (opsi & default di kontrak §5). Bahasa dan Tema ada di Pengaturan umum (FR-ACC-06). Tidak ada fitur reset data.

**AC**
- *Given* mode deterministik ON, *When* Beranda dibuka dua kali, *Then* urutan rekomendasi identik.
- *Given* mode deterministik ON, *When* "Peluang error server" 30%, *Then* request pertama gagal dan request kedua berhasil.
- *Given* mode deterministik ON, *When* date picker dibuka tanpa nilai sebelumnya, *Then* tanggal awal adalah `2026-01-15`.

## 11. Test Data & Akun Uji
Semua test data ada di **`docs/contract.md` §4** (sama dengan Android): akun uji (§4.1), katalog & stok awal (§4.2), voucher, kartu, OTP 3DS, VA, alamat, lokasi uji (§4.3), PracticePay (§4.4), template data akun baru (§4.5).

**Khusus web**
| Jenis | Data |
|---|---|
| Lokasi uji untuk Geolocation | -6.2088, 106.8228 (Playwright `geolocation`, WebdriverIO/Cypress lewat stub `navigator.geolocation`) |
| Gambar QR merchant untuk unggah | `docs/assets/qr/` (sama dengan Android) |
| Kamera palsu | stream video berisi QR untuk `--use-fake-device-for-media-stream` (Chromium), di `docs/assets/qr/` |

## 12. Strategi Locator & Kontrak Testability
### 12.1 Konvensi penamaan `data-testid`
Nama `data-testid` **sama persis** dengan resource-id Android untuk elemen yang sama: `<prefix area>_<tipe>_<nama>` dalam snake_case (mis. `shop_input_username`, `shop_btn_add_to_cart`, `pay_input_amount`).

| Prefix | Area | Prefix | Area |
|---|---|---|---|
| `shop_` | AUTH, SHOP, ORD | `addr_` | Form & Daftar Alamat |
| `pay_` | PracticePay | `help_` | Pusat Bantuan |
| `acc_` | Akun, Edit Profil, Pengaturan umum | `dev_` | Developer Options |

Tipe: `btn`, `input`, `txt`, `img`, `chk`, `rdo`, `sw`, `chip`, `sld`, `spn`, `list`, `item`, `tab`, `card`, `badge`, `progress`. Elemen yang hanya ada di web memakai konvensi yang sama dan ditandai "web saja" di `docs/locators/`.

### 12.2 Aturan
1. Setiap elemen interaktif & teks yang perlu di-assert punya `data-testid` **unik dalam satu halaman**, kecuali baris list & kartu produk (didokumentasikan).
2. Baris list memakai `data-testid` yang sama (`*_item_*_row`); elemen anak punya `data-testid` sendiri.
3. Tombol ikon wajib punya `aria-label` bermakna bagi manusia (teks = content-desc Android). `aria-label` tidak diisi test id.
4. Elemen interaktif memakai elemen HTML semantik (`button`, `a`, `input`, `select`) atau role ARIA yang benar, sehingga `getByRole` bekerja.
5. iframe 3DS dan Pusat Bantuan memakai `id` dan `data-testid` (sama dengan HTML WebView Android).
6. Transfer (Shadow DOM) memakai `data-testid` di dalam shadow root; Riwayat sengaja tanpa `data-testid`.
7. Urutan prioritas locator yang diajarkan: **`data-testid` → role + accessible name → label/teks → CSS → XPath**.
8. Locator **tidak ditampilkan di UI** kecuali Locator Hint Overlay dinyalakan.
9. Class CSS boleh berubah kapan saja dan **bukan** bagian kontrak locator.

### 12.3 Kontrak stabilitas locator
- `data-testid`, `id`, `aria-label`, URL route, dan teks assertion adalah **public API**. Mengubah atau menghapus yang terdokumentasi = breaking change (naik MAJOR, §16).
- `docs/locators/<halaman>.md` divalidasi di CI: build gagal bila ada `data-testid` tak terdokumentasi atau duplikat tak disengaja.
- Perubahan nama locator yang juga ada di Android dikoordinasikan dengan project Android (nama harus tetap sama).

## 13. Non-Functional Requirements
| ID | Kategori | Requirement |
|---|---|---|
| NFR-01 | Kompatibilitas browser | Chrome, Edge, Firefox (2 versi stabil terakhir) wajib; Safari/WebKit (lewat Playwright) Should |
| NFR-02 | Kompatibilitas tool | Playwright, Cypress, WebdriverIO versi stabil terbaru (Must). Batasan tool (mis. Cypress & multi-tab/iframe lintas origin) didokumentasikan beserta solusinya |
| NFR-03 | Viewport | Desktop saja: minimal 1280×720, referensi 1440×900. Di bawah 1280 px layout tidak dijamin (scroll horizontal diterima) |
| NFR-04 | Konektivitas & cloud | Butuh koneksi internet. Backend hanya Firebase Authentication + Cloud Firestore (project sama dengan Android, plan Spark) + Firebase Hosting; tanpa analytics atau SDK pihak ketiga lain. Data yang sudah dimuat tetap terbaca dari cache Firestore saat offline |
| NFR-05 | Determinisme | Dengan mode deterministik, dua run berurutan menghasilkan UI & data identik (untuk akun baru) |
| NFR-06 | Performa | LCP ≤ 2,5 dtk di desktop broadband (cache kosong); pindah halaman ≤ 1 dtk (tanpa delay yang disengaja) |
| NFR-07 | Ukuran | JavaScript awal ≤ 400 KB (gzip) |
| NFR-08 | Testability | Semua delay, keacakan, error server, dan waktu bisa dikontrol dari Developer Options / URL |
| NFR-09 | Aksesibilitas | WCAG 2.1 AA; 0 pelanggaran kritis/serius axe di semua halaman; semua fungsi bisa dipakai dengan keyboard |
| NFR-10 | Privasi & keamanan | Tanpa analytics; data hanya ke project Firebase PracticeMart, dilindungi Security Rules (`docs/contract.md` §8.4); hanya storage teknis (tanpa cookie pelacak); tanpa data pribadi sungguhan selain email |
| NFR-11 | Lokalisasi | Semua teks UI dari file terjemahan (ID default, EN), teks sama dengan `strings.xml` Android |
| NFR-12 | Maintainability | TypeScript strict, lint bersih, struktur folder per area fitur |
| NFR-13 | Realisme | Tidak ada teks materi, istilah automation, atau locator yang tampil di UI pada konfigurasi default |
| NFR-14 | Siklus data | Akun baru (hasil Register) mulai dengan data default identik dengan `docs/contract.md` §4.5 |
| NFR-15 | Persistensi | Data aplikasi di Firestore bertahan setelah reload, tutup browser, *clear site data*, dan deploy versi baru; perubahan skema mengikuti `docs/contract.md` §8.5 |
| NFR-16 | Paritas lintas platform | Business rules, teks assertion, test data, dan aturan tulis Firestore identik dengan Android (`docs/contract.md`); kontrak di kedua repo identik |

## 14. Aset Test & Dokumentasi Bawaan
```
tests/
├── playwright/          # TypeScript, Page Object, smoke + E2E (Must)
├── cypress/             # smoke + E2E, termasuk contoh solusi multi-tab & iframe (Must)
└── wdio/                # WebdriverIO, smoke + E2E-01 (Should)
docs/
├── contract.md          # salinan identik kontrak bersama (sumber: PracticeMarket.apps)
├── getting-started.md   # buka web app, setup tiap tool, data cloud & isolasi lewat akun baru
├── curriculum.md        # level Basic/Intermediate/Advanced + tugas per fitur
├── skill-map.md         # §7 + Lampiran A
├── locators/<halaman>.md
├── url-hooks.md         # daftar URL & parameter (§6.2, DEV-02)
├── assets/qr/           # gambar & video QR merchant
└── spoilers/            # kunci jawaban tugas (bug glitch_user di kontrak §3)
```

## 15. Spesifikasi Teknis & Build
Detail di `ARCHITECTURE.md` web (dibuat di project ini). Batasan dari PRD:

| Aspek | Keputusan | Alasan |
|---|---|---|
| Jenis app | Single Page Application, TypeScript | Routing sisi client sesuai §6.2 |
| Framework UI | Rekomendasi awal React + Vite; final di ARCHITECTURE web | Mudah diimplementasi, ekosistem testing luas |
| Data & auth | Firebase JS SDK: Authentication + Cloud Firestore, project sama dengan Android | Kontrak `docs/contract.md` §8 |
| Hosting | Firebase Hosting (Spark): site utama + site kedua untuk halaman bank 3DS (origin berbeda) | Gratis; iframe lintas origin sungguhan |
| Aturan bisnis | Modul TypeScript murni, unit test memakai kasus yang sama dengan unit test Kotlin Android | Paritas kontrak §2 |
| CI | GitHub Actions: lint, unit test, build, cek locator, Playwright & Cypress smoke terhadap build preview | Regresi app & locator terdeteksi |

## 16. Rilis, Versioning & Distribusi
- **SemVer:** MAJOR = perubahan locator/URL/flow yang breaking; MINOR = fitur baru; PATCH = perbaikan bug.
- Distribusi: URL publik Firebase Hosting; versi ditampilkan di About (DEV-04); `CHANGELOG.md` dengan bagian "Locator changes".
- Versi kontrak bersama yang dipakai dicatat di setiap rilis.

## 17. Roadmap & Milestone
| Milestone | Isi | Exit criteria |
|---|---|---|
| W0 – PRD | Dokumen ini, ARCHITECTURE & DESIGN web disetujui | Open questions prioritas tinggi terjawab |
| W1 – Fondasi | Project, CI, hosting 2 site, AUTH-01…04, Beranda, Developer Options, URL hooks | Web app ter-deploy; smoke login hijau di Playwright & Cypress |
| W2 – Belanja | SHOP-02…10 | Checkpoint CP-B bisa dikerjakan |
| W3 – Checkout & Pesanan | SHOP-11…15 (3DS iframe & VA), ORD-01…04, notifikasi | E2E-01 hijau di Playwright & Cypress |
| W4 – PracticePay & Akun | PAY-01…06 (Shadow DOM), ACC-01…04, HELP-01 | E2E-09/10/12 hijau; EDGE-11/12 lulus bersama app Android |
| W5 – Rilis v1.0.0 | Dokumentasi lengkap, suite WebdriverIO, uji pemula (3 orang) | DoD §20 terpenuhi |

## 18. Risiko & Mitigasi
| Risiko | Dampak | Kemungkinan | Mitigasi |
|---|---|---|---|
| Kontrak web & Android berbeda (drift) | Data rusak atau assertion lintas platform gagal | Sedang | Satu master `docs/contract.md`; CI membandingkan versi kontrak; NFR-16 |
| Cypress tidak mendukung multi-tab & terbatas di iframe lintas origin | Learner Cypress terhambat di E2E-01 & E2E-13 | Tinggi | Dokumentasikan solusi (hapus `target`, `chromeWebSecurity: false`, `cy.origin`); contoh di `tests/cypress` |
| Firestore web SDK memakai koneksi streaming, bukan REST | Latihan network interception/mocking sulit | Tinggi | Dokumentasikan; latihan network memakai mode offline & Developer Options |
| Akun uji & stok dipakai bersama semua learner (web + Android), tanpa reset | Data tidak deterministik; stok bisa habis | Tinggi | Akun baru per test; admin menjalankan ulang script seed |
| Kuota Firebase Spark dibagi dengan Android | App gagal menyimpan sampai kuota reset | Sedang | Write hanya saat data berubah; pantau Usage |
| Rate limit Firebase Auth saat suite login berulang | Test login flaky | Sedang | Login sekali per suite (simpan storage state) |
| Izin browser berbeda per browser & headless (notifikasi, clipboard, kamera) | Test gagal di browser tertentu | Tinggi | Dokumentasikan cara grant per tool; fitur tetap jalan tanpa izin (toast) |
| Scope creep | Rilis molor | Tinggi | Prioritas MoSCoW; v1.0 hanya Must |

## 19. Asumsi, Dependensi & Open Questions
**Asumsi**
- Learner memakai browser desktop terbaru dan punya koneksi internet.
- Project Firebase, Security Rules, dan script seed dikelola dari repo Android (`PracticeMarket.apps`).

**Dependensi:** project Firebase PracticeMart (Spark), `docs/contract.md`, Firebase Hosting, GitHub Actions, Playwright, Cypress, WebdriverIO.

**Open questions**
| # | Pertanyaan | Owner | Target |
|---|---|---|---|
| Q1 | Domain final web app dan domain bank 3DS | Dhandy | W1 |
| Q2 | Contoh test bawaan pakai TypeScript untuk semua tool, atau JavaScript untuk Cypress? | Dhandy | W1 |
| Q3 | Perlu sinkron realtime di versi berikutnya? | Dhandy | Setelah v1.0 |
| Q4 | Passkey (FR-AUTH-11, FR-PAY-08) masuk v1.0 atau ditunda? | Dhandy | W3 |
| Q5 | Skill "OTP kotak terpisah" (hilang sejak Lupa Password memakai email; di web Lupa Password dihapus) perlu fitur pengganti di kedua platform? | Dhandy | W2 |

## 20. Definition of Done v1.0
- [ ] Semua requirement **Must** terimplementasi dan lulus AC.
- [ ] Semua skill §7 berprioritas Must punya minimal 1 fitur dan 1 tugas di `docs/curriculum.md`.
- [ ] Tidak ada teks materi/locator yang tampil di UI pada konfigurasi default (NFR-13).
- [ ] Setiap halaman punya `docs/locators/<halaman>.md`; CI locator 0 tak terdokumentasi, 0 duplikat tak disengaja.
- [ ] Smoke + E2E-01/02/09 hijau 10× berturut-turut di CI (Playwright & Cypress); E2E-01 hijau di WebdriverIO.
- [ ] EDGE-11 & EDGE-12 lulus bersama app Android.
- [ ] `docs/contract.md` identik dengan master di repo Android.
- [ ] 0 pelanggaran axe kritis/serius (NFR-09).
- [ ] README/getting-started diuji 3 pemula, semuanya menjalankan test pertama ≤ 30 menit.

---

## Lampiran A — Traceability Matrix (Skill → Fitur → Playwright → Cypress → WebdriverIO)
Dukungan tool dicek ulang terhadap versi terbaru saat implementasi.

| Skill | Fitur | Playwright | Cypress | WebdriverIO |
|---|---|---|---|---|
| Locator test id / role / text | Semua | `getByTestId`, `getByRole`, `getByText` | `cy.get('[data-testid=…]')`, `cy.contains` | `$('[data-testid=…]')`, `$('aria/…')` |
| XPath / locator relatif | Kartu produk, ringkasan checkout | `locator('xpath=…')`, `filter({ has })` | plugin xpath / `.find()`, `.closest()` | `$('//…')`, chaining |
| Input teks | Login, Register, Alamat | `fill`, `pressSequentially` | `type`, `clear` | `setValue`, `clearValue` |
| Assertion | Semua | `expect(locator).toHaveText` | `should('have.text')` | `expect(el).toHaveText` |
| Hover | Keranjang, tooltip | `hover` | `trigger('mouseover')` / `realHover` (plugin) | `moveTo` |
| Double / right click | Image Viewer, riwayat pencarian | `dblclick`, `click({ button: 'right' })` | `dblclick`, `rightclick` | `doubleClick`, `click({ button: 'right' })` |
| Drag & drop | Wishlist | `dragTo` | `trigger` dragstart/drop / plugin | `dragAndDrop` |
| Keyboard | Pencarian, modal, galeri | `keyboard.press` | `type('{enter}')` | `keys` |
| Scroll & infinite scroll | Katalog, Riwayat | `scrollIntoViewIfNeeded`, `mouse.wheel` | `scrollIntoView`, `scrollTo` | `scrollIntoView` |
| Explicit wait | Loading, tracking, `slow_user` | auto-wait + `expect` timeout | retry-ability + `timeout` | `waitForDisplayed`, `waitUntil` |
| Toast | Keranjang, VA | `getByRole('status')` | `cy.get('[role=status]')` | `$('[role=status]')` |
| Modal | Filter, Voucher, PIN | `getByRole('dialog')` | `cy.get('[role=dialog]')` | `$('[role=dialog]')` |
| JS dialog | Batal 3DS | `page.on('dialog')` (di frame) | `cy.on('window:confirm')` (perlu `cy.origin`) | `acceptAlert` / `dismissAlert` |
| iframe lintas origin | 3DS | `frameLocator` | `cy.origin` + `chromeWebSecurity: false` (terbatas) | `switchFrame` / `switchToFrame` |
| iframe same-origin & bersarang | Pusat Bantuan | `frameLocator().frameLocator()` | `its('0.contentDocument.body')` | `switchFrame` bertingkat |
| Tab baru | S&K | `context.waitForEvent('page')` | tidak didukung; hapus `target` lalu `visit` | `switchWindow` |
| Shadow DOM | Transfer | menembus shadow terbuka otomatis | `includeShadowDom: true` / `.shadow()` | `shadow$` / selector `>>>` |
| URL langsung | §6.2 | `goto` | `visit` | `url` |
| Storage | Ingat saya, Developer Options | `storageState`, `evaluate(localStorage)` | `cy.window().its('localStorage')`, `cy.session` | `execute`, `reloadSession` |
| Clipboard | VA, voucher | `grantPermissions(['clipboard-read'])` | stub `navigator.clipboard` | `execute` / izin Chrome |
| Notifikasi | Pesanan | `grantPermissions(['notifications'])` | stub `Notification` | capability izin browser |
| Geolokasi | Form Alamat | `setGeolocation` + izin | stub `navigator.geolocation` | `emulate('geolocation')` (Chromium) / stub |
| Kamera | Scan QR | `--use-fake-device-for-media-stream` | stub `getUserMedia` | argumen Chrome fake device |
| Unggah file | Foto, QR | `setInputFiles` | `selectFile` | `uploadFile` + `setValue` |
| Offline | Checkout | `context.setOffline(true)` | stub `navigator.onLine` + intercept | `throttleNetwork('offline')` (Chromium) |
| Reload / tutup tab | Checkout, keranjang | `reload`, `page.close` | `reload` | `refresh`, `closeWindow` |
| WebAuthn | Passkey | CDP virtual authenticator | plugin/CDP | `addVirtualAuthenticator` |
| Retry & flaky | Top Up, Cek Status VA | `toPass`, retry test | retry-ability, `retries` | `waitUntil`, `specFileRetries` |
| Nilai dinamis | Order ID, nomor VA | simpan `textContent` | `invoke('text').as()` | `getText` |
| Lintas platform | EDGE-11/12 | + Appium/Maestro di repo Android | + Appium/Maestro | satu framework untuk web & Appium |

## Lampiran B — Glossary
| Istilah | Arti |
|---|---|
| `data-testid` | Atribut HTML khusus test, locator paling stabil; namanya sama dengan resource-id Android |
| Accessible name | Nama elemen untuk teknologi bantu (dari teks, `aria-label`, atau label); dipakai `getByRole` |
| iframe lintas origin | Halaman dari domain lain yang ditanam di halaman; akses dari test dibatasi kebijakan browser |
| Shadow DOM | DOM terenkapsulasi milik Web Component; locator biasa tidak menembusnya tanpa dukungan tool |
| `postMessage` | Cara iframe mengirim pesan ke halaman induk |
| Storage state | Cookie & storage browser yang bisa disimpan dan dipakai ulang untuk melewati login |
| Kontrak bersama | `docs/contract.md`: aturan & data yang wajib sama di Android dan web |
| Firebase Authentication / Cloud Firestore / Security Rules | Layanan login, database dokumen, dan aturan akses Firebase yang dipakai bersama Android |
| Deterministic mode | Mode yang mematikan keacakan supaya hasil selalu sama |
| Flaky test | Test yang kadang lulus, kadang gagal tanpa perubahan kode |

## Lampiran C — Matriks requirement Android → Web
Status: **sama** (perilaku & teks sama), **diterjemahkan** (perilaku sama, interaksi/teknologi web), **tidak berlaku**.

| ID Android | Status di web | Catatan |
|---|---|---|
| FR-AUTH-01, 03, 05–09, 12, 15, 17 | sama / diterjemahkan | Deep link → URL; S&K tab baru; sesi tahan reload/tutup browser |
| FR-AUTH-02 | diterjemahkan | Izin notifikasi browser |
| FR-AUTH-04 | diterjemahkan | content-desc → `aria-label` |
| FR-AUTH-10 | diterjemahkan | `localStorage` |
| FR-AUTH-11 | diterjemahkan | Sidik jari → passkey (Could) |
| FR-AUTH-14, FR-AUTH-16 | tidak berlaku | Sudah dihapus di Android v0.6 |
| FR-AUTH-13 | tidak berlaku | Lupa Password dihapus dari web (2026-11-20); tetap ada di Android |
| FR-SHOP-01–12, 15, 17, 18 | sama / diterjemahkan | Swipe → tombol panah/keyboard; drag handle → HTML5 drag & drop |
| FR-SHOP-13 | diterjemahkan | Pinch → tombol zoom & Ctrl + scroll; double tap → double click |
| FR-SHOP-14 | diterjemahkan | Share sheet → Web Share API / salin tautan |
| FR-SHOP-16 | diterjemahkan | Swipe-to-delete → tombol hapus saat hover |
| FR-PAYM-01–03, 05, 06, 08–13, 15 | sama | – |
| FR-PAYM-04 | diterjemahkan | Rotasi/background → reload/pindah tab |
| FR-PAYM-07 | diterjemahkan | WebView → iframe lintas origin |
| FR-PAYM-14 | diterjemahkan | Notifikasi sistem → notifikasi browser + toast |
| FR-ORD-01 | diterjemahkan | Swipe tab & pull-to-refresh → klik/panah & tombol muat ulang |
| FR-ORD-02–05, 07 | sama | Canvas digambar dengan mouse |
| FR-ORD-06 | diterjemahkan | Photo Picker → unggah file |
| FR-PAY-01, 02, 05–07, 10 | sama / diterjemahkan | Compose → Shadow DOM; deep link → URL |
| FR-PAY-03 | diterjemahkan | Tanpa kontak device; hanya kontak uji |
| FR-PAY-04 | tidak berlaku | Tidak ada izin kontak di web |
| FR-PAY-08 | diterjemahkan | Sidik jari → passkey (Could) |
| FR-PAY-09 | diterjemahkan | Kamera browser + unggah gambar; tanpa tombol "Buka Pengaturan" |
| FR-PAY-11 | diterjemahkan | Pull-to-refresh → tombol muat ulang; tanpa testTag → tanpa `data-testid` |
| FR-ACC-01, 05, 06 | sama | – |
| FR-ACC-02 | diterjemahkan | Kamera/Photo Picker → unggah file & drag-and-drop |
| FR-ACC-03 | diterjemahkan | Mock location → Geolocation API; Exposed Dropdown → `<select>` + combobox |
| FR-ACC-04 | diterjemahkan | Tertutup keyboard → di luar viewport |
| FR-HELP-01, 03 | diterjemahkan | WebView + JS bridge → iframe + `postMessage`; iframe bersarang |
| FR-HELP-02 | tidak berlaku | WebView debugging |
| FR-HELP-04 | diterjemahkan | Dialer → link `tel:` |
| E2E-01…12, N-01…12 | sama / diterjemahkan | Lihat §9.2 |
| N-13 | diterjemahkan | Izin kamera browser |
| E2E-13 | baru (web saja) | Multi-tab |
| EDGE-01, 02, 04, 10 | diterjemahkan | Kill/background/airplane/update APK → tutup tab/pindah tab/offline/deploy baru |
| EDGE-03, 05–09, 11, 12 | sama | EDGE-11/12 diuji bersama Android |
| DEV-01–04 | sama / diterjemahkan | Deep link → URL; DataStore → `localStorage` |
| §7 Device: rotasi, IME, biometrik, share sheet, buka app lain | tidak berlaku | Diganti skill web di §7 |
| §7 `appActivity`, Espresso driver | tidak berlaku | – |
