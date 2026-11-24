# Test Scenarios — PracticeMart.web

Daftar skenario test untuk semua function dan UI di web. Setiap baris menunjuk ke file test yang menjalankannya.

**Kolom**

- **Layer**
  - **U**: unit test, untuk function murni.
  - **C**: component/page test (vitest + RTL + jsdom).
  - **E**: integration test di Firebase emulator.
  - **R**: Firestore rules.
- **Status**
  - ✅ sudah ada test.
  - 🆕 belum ada test khusus, perlu ditulis.
  - ⚠️ hanya tercakup tidak langsung oleh test lain.
  - ❌ fitur belum diimplementasi, jadi belum bisa dites.
- **Locator**: data-testid ada di `docs/locators/<area>.md`. Requirement ada di `docs/PRD.md`, kontrak di `docs/contract.md`.

**Cara menjalankan**

| Perintah | Isi |
|---|---|
| `npm test` | U + C |
| `npm run test:coverage` | U + C dengan threshold 90% |
| `npm run test:rules` | R |
| `npm run test:integration` | E |

---

## 1. Auth: Login, Register, Session (FR-AUTH-*) · locator: `login.md`, `register.md`

### 1.1 Validasi & lockout (`src/domain/authValidation.ts`)
| ID | Layer | Skenario | Expected | File test | Status |
|---|---|---|---|---|---|
| AUTH-U01 | U | `isEmail` untuk email valid, tanpa `@`, tanpa domain, dan dengan spasi | true hanya untuk email valid | `authValidation.test.ts` | ✅ |
| AUTH-U02 | U | `loginErrors` dengan email/password kosong | "Email wajib diisi", "Password wajib diisi" | `authValidation.test.ts` | ✅ |
| AUTH-U03 | U | `loginErrors` dengan format email salah | "Format email tidak valid" | `authValidation.test.ts` | ✅ |
| AUTH-U04 | U | `passwordStrength` untuk kosong, <8, 8+ huruf+angka, 12+ dengan simbol | 0 / 1 / 2 / 3, label Lemah/Sedang/Kuat | `authValidation.test.ts` | ✅ |
| AUTH-U05 | U | `isRegisterValid`: strength <2, confirm beda, S&K belum dicentang | false. Hanya true bila semua syarat terpenuhi | `authValidation.test.ts` | ✅ |
| AUTH-U06 | U | `recordLoginFailure` 3× berturut-turut | Terkunci 30 dtk, hitungan direset ke 0 | `authValidation.test.ts` | ✅ |
| AUTH-U07 | U | `lockSecondsLeft` untuk sisa 0.1 dtk dan untuk waktu yang sudah lewat | Dibulatkan ke atas (1), minimal 0 | `authValidation.test.ts` | ✅ |
| AUTH-U08 | U | `loginLockStore`: get/set, state bertahan antar render, `UNLOCKED` sebagai default | State dibagikan antar halaman dalam satu tab | `LoginPage.test.tsx` (kunci bertahan antar halaman) | ✅ |

### 1.2 Repository (`src/data/authRepository.ts`)
| ID | Layer | Skenario | Expected | File test | Status |
|---|---|---|---|---|---|
| AUTH-U10 | U | `toAuthError` untuk kode Firebase invalid-credential, email-already-in-use, too-many-requests, network-request-failed, dan error lain | Menjadi kind invalid / emailInUse / tooMany / network / failed | `authRepository.test.ts` | ⚠️ cek tiap kode |
| AUTH-U11 | U | Login pertama | `users/{uid}` dibuat, state awal ditulis dengan hash PIN + 8 transaksi | `authRepository.test.ts` | ✅ |
| AUTH-U12 | U | Login dengan akun lama | Tidak menulis apa pun (idempoten) | `authRepository.test.ts` | ✅ |
| AUTH-U13 | U | Gagal menyiapkan data akun | signOut, lalu AuthError failed | `authRepository.test.ts` | ✅ |
| AUTH-U14 | U | Register sukses, email sudah dipakai, email Auth kosong | Selalu signOut. emailInUse diteruskan | `authRepository.test.ts` | ✅ |
| AUTH-U15 | U | `logout`, `getDisplayName`, `updateDisplayName` | Memanggil Firebase dengan argumen yang benar | `authRepository.test.ts` | ✅ |

### 1.3 UI Login (`LoginPage.tsx`)
| ID | Layer | Skenario | Expected | File test | Status |
|---|---|---|---|---|---|
| AUTH-C01 | C | Render awal | Setiap elemen punya id = data-testid, label terhubung ke input | `LoginPage.test.tsx` | ✅ |
| AUTH-C02 | C | Submit dengan field kosong atau email salah | Error inline. `login` tidak dipanggil | `LoginPage.test.tsx` | ✅ |
| AUTH-C03 | C | Toggle show/hide password | `type` dan `aria-label` berganti | `LoginPage.test.tsx` | ✅ |
| AUTH-C04 | C | Login sukses, termasuk submit lewat Enter | Pindah ke Beranda | `LoginPage.test.tsx` | ✅ |
| AUTH-C05 | C | "Ingat saya" ON lalu OFF | Email tersimpan di `pm.rememberEmail` dan terisi otomatis. Saat OFF, email dihapus | `LoginPage.test.tsx` | ✅ |
| AUTH-C06 | C | Ada `pm.redirectAfterLogin` di sessionStorage | Setelah login, kembali ke URL tujuan | `LoginPage.test.tsx` | ✅ |
| AUTH-C07 | C | Error non-kredensial (network, tooMany) | Banner error, hitungan kunci tidak bertambah | `LoginPage.test.tsx` | ✅ |
| AUTH-C08 | C | 3× password salah | Terkunci dengan countdown 30 dtk, setelah itu terbuka lagi | `LoginPage.test.tsx` | ✅ |
| AUTH-C09 | C | Halaman dibuka ulang saat masih terkunci | Kunci tetap berlaku | `LoginPage.test.tsx` | ✅ |
| AUTH-C10 | C | Datang dari halaman Register | Banner sukses tampil | `LoginPage.test.tsx` | ✅ |
| AUTH-C11 | C | Lupa Password dihapus dari web (FR-AUTH-13) | Tidak ada `shop_link_forgot_password` dan teks "Lupa password" di Login | `LoginPage.test.tsx` + browser | ✅ |

### 1.4 UI Register (`RegisterPage.tsx`)
| ID | Layer | Skenario | Expected | File test | Status |
|---|---|---|---|---|---|
| AUTH-C20 | C | Render awal | id = data-testid, link S&K membuka tab baru, tombol Daftar disabled | `RegisterPage.test.tsx` | ✅ |
| AUTH-C21 | C | Indikator kekuatan password | Lemah / Sedang / Kuat | `RegisterPage.test.tsx` | ✅ |
| AUTH-C22 | C | Blur dengan email salah atau konfirmasi password beda | Error inline | `RegisterPage.test.tsx` | ✅ |
| AUTH-C23 | C | Password lemah atau S&K belum dicentang | Daftar disabled | `RegisterPage.test.tsx` | ✅ |
| AUTH-C24 | C | Register sukses | Pindah ke `/login` dengan banner | `RegisterPage.test.tsx` | ✅ |
| AUTH-C25 | C | Email sudah terdaftar | Error inline yang hilang saat email diubah | `RegisterPage.test.tsx` | ✅ |
| AUTH-C26 | C | Error lain | Banner `role=alert` | `RegisterPage.test.tsx` | ✅ |

### 1.5 Session & routing (`src/app/session.tsx`, `router.tsx`)
| ID | Layer | Skenario | Expected | File test | Status |
|---|---|---|---|---|---|
| AUTH-C30 | C | Event `onAuthStateChanged` pertama belum datang | Tidak render apa pun | `session.test.tsx` | ✅ |
| AUTH-C31 | C | Buka halaman terproteksi tanpa sesi | Redirect ke `/login`, URL tujuan disimpan | `session.test.tsx` | ✅ |
| AUTH-C32 | C | Buka halaman dengan sesi aktif | Halaman tampil. Listener berhenti saat unmount | `session.test.tsx` | ✅ |
| AUTH-C33 | C | Halaman `/login`, `/register`, `/terms` | Dimuat lazy | `session.test.tsx`, `shopBrowse.test.tsx` | ✅ |
| AUTH-E01 | E | Register, email ganda, password salah, login pertama | Data awal ditulis tepat sekali | `tests/integration/auth.emulator.test.ts` | ✅ |

---

## 2. Header & Shop Home (FR-SHOP-*) · locator: `header.md`, `shop.md`

| ID | Layer | Skenario | Expected | File test | Status |
|---|---|---|---|---|---|
| SHOP-C01 | C | Gagal memuat akun | Pesan kontrak §6 + tombol Coba lagi | `shopBrowse.test.tsx` | ✅ |
| SHOP-C02 | C | Isi header | Saldo, badge keranjang, menu akun, Keluar dengan konfirmasi | `shopBrowse.test.tsx` | ✅ |
| SHOP-C03 | C | Badge keranjang saat kosong dan saat lebih dari 99 | Kosong: tidak tampil. Lebih dari 99: "99+" | `shopBrowse.test.tsx` | ✅ |
| SHOP-C04 | C | Mega menu kategori: klik, Esc, klik di luar, hover | Buka/tutup dengan benar | `shopBrowse.test.tsx` | ✅ |
| SHOP-C05 | C | Isi Beranda | Sapaan, grid kategori, rekomendasi deterministik, Lihat semua | `shopBrowse.test.tsx` | ✅ |
| SHOP-C06 | C | Carousel: panah, titik, auto-slide | Slide berganti, auto-slide tiap 4 dtk (`BANNER_MS`) | `shopBrowse.test.tsx` | ✅ |
| SHOP-C07 | C | Flash sale | Countdown 02:14:37. Beli masuk keranjang. Disabled bila stok habis atau waktu habis | `shopBrowse.test.tsx` | ✅ |
| SHOP-C08 | C | "+ Keranjang" di ProductCard | Snackbar + Lihat. Stok 0 tampil "Stok Habis". Sudah maksimal tampil `MAX_QTY_TEXT` | `shopBrowse.test.tsx` | ✅ |
| SHOP-U01 | U | `recommendations` | Mode deterministik: P001, P002, P010, P020, P060. Mode acak: 5 produk unik | `catalogQuery.test.ts` | ✅ |
| SHOP-U02 | U | `catalog`: 60 produk, 6 kategori, varian, stok awal, `firstAvailable`, `discountPercent` | Sesuai tabel kontrak | `catalog.test.ts` | ✅ |
| SHOP-U03 | U | `categoryIcon` untuk semua kategori + fallback | Ikon valid untuk tiap kategori | tidak langsung (coverage 100% baris) | ⚠️ |
| SHOP-U04 | U | `initials` (AccountNav) untuk 1 kata, 2+ kata, dan string kosong | Inisial benar | — | ⚠️ |

## 3. Search (FR-SHOP-*) · locator: `shop.md`

| ID | Layer | Skenario | Expected | File test | Status |
|---|---|---|---|---|---|
| SRCH-U01 | U | `suggest` dengan 0, 1, dan 2+ karakter, huruf besar/kecil | Saran muncul mulai 2 karakter, maks 5, case-insensitive | `catalogQuery.test.ts` | ✅ |
| SRCH-U02 | U | `pushHistory` | Terbaru di depan, tanpa duplikat (case-insensitive), maks 5, abaikan input kosong | `catalogQuery.test.ts` | ✅ |
| SRCH-U03 | U | `searchProducts` dengan kata kunci, kategori, min/max harga, rating, filter stok | Filter benar | `catalogQuery.test.ts` | ✅ |
| SRCH-U04 | U | Urutan relevan, murah, mahal, rating, baru, dan `isSortKey` | Urutan sesuai | `catalogQuery.test.ts` | ✅ |
| SRCH-U05 | U | `readSearch` dengan param tidak valid (harga negatif, sort tak dikenal, rating di luar daftar) | Kembali ke default | `shopBrowse.test.tsx` | ⚠️ hanya lewat UI |
| SRCH-U06 | U | `writeSearch` lalu `readSearch` (round-trip). Default tidak ditulis ke URL | Hasil identik | `shopBrowse.test.tsx` | ⚠️ hanya lewat UI |
| SRCH-U07 | U | `activeFilterCount` dan `filterChips` untuk kombinasi filter, termasuk harga satu sisi | Jumlah dan label chip benar | `shopBrowse.test.tsx` | ⚠️ |
| SRCH-C01 | C | Ketik 2+ karakter, Enter | Saran tampil. Enter membuka hasil dan menyimpan riwayat | `shopBrowse.test.tsx` | ✅ |
| SRCH-C02 | C | Panah + Enter pada saran | Membuka detail produk | `shopBrowse.test.tsx` | ✅ |
| SRCH-C03 | C | Riwayat: fokus pada input kosong, klik, hapus ×, klik kanan → Hapus, Hapus semua | Semua aksi riwayat jalan | `shopBrowse.test.tsx` | ✅ |
| SRCH-C04 | C | Sort dan tampilan list | Tersimpan di URL | `shopBrowse.test.tsx` | ✅ |
| SRCH-C05 | C | Filter sidebar | Draf, lalu Terapkan → URL + chip. Hapus chip dan Reset jalan | `shopBrowse.test.tsx` | ✅ |
| SRCH-C06 | C | Slider harga maksimum | Chip harga satu sisi | `shopBrowse.test.tsx` | ✅ |
| SRCH-C07 | C | Pencarian tanpa hasil | Empty state | `shopBrowse.test.tsx` | ✅ |
| SRCH-C08 | C | Infinite scroll | 20 item per halaman (`PAGE_SIZE`) | `shopBrowse.test.tsx` | ✅ |

## 4. Product Detail (FR-SHOP-*) · locator: `shop.md`

| ID | Layer | Skenario | Expected | File test | Status |
|---|---|---|---|---|---|
| PROD-C01 | C | Buka produk | Info, breadcrumb, stok dibaca ulang (`refreshStock`) | `shopProductCart.test.tsx` | ✅ |
| PROD-C02 | C | Varian dengan stok 0 | Chip disabled + tooltip, tidak bisa dipilih. Bisa ganti warna | `shopProductCart.test.tsx` | ✅ |
| PROD-C03 | C | Semua ukuran dari satu warna habis | Chip warna disabled | `shopProductCart.test.tsx` | ✅ |
| PROD-C04 | C | Stepper qty | Maks 10 + pesan, tombol minus, input manual. Bila stok <10, maks = stok | `shopProductCart.test.tsx` | ✅ |
| PROD-C05 | C | Add to cart dengan varian dan qty | Snackbar. Stok 0: tombol "Stok Habis" disabled, stepper mati | `shopProductCart.test.tsx` | ✅ |
| PROD-C06 | C | Toggle wishlist | Status tersimpan | `shopProductCart.test.tsx` | ✅ |
| PROD-C07 | C | Galeri: panah, thumbnail | Indikator ikut berubah | `shopProductCart.test.tsx` | ✅ |
| PROD-C08 | C | Image viewer | Zoom +/− dibatasi `ZOOM_MIN`–`ZOOM_MAX`. Double click, Ctrl+scroll, panah keyboard, Tab terkunci, Esc, tombol ×, klik scrim | `shopProductCart.test.tsx` | ✅ |
| PROD-C09 | C | ID produk tidak ada | Halaman tidak ditemukan | `shopProductCart.test.tsx` | ✅ |
| PROD-C10 | C | Beli Sekarang (FR-SHOP-11, E2E-06) | Ke `/checkout` dengan varian & qty itu saja; keranjang tidak berubah; stok 0 → disabled | `shopProductCart.test.tsx` + browser | ✅ |
| PAYM-C22 | C | Checkout dari Beli Sekarang | Ringkasan hanya produk itu, tahan reload; `keepCart` → keranjang utuh setelah bayar; varian stok 0 → kembali ke keranjang | `checkout.test.tsx`, `orderRepository.test.ts` + browser | ✅ |
| WISH-C01 | C | Wishlist `/shop/wishlist` (FR-SHOP-12) | Urut sesuai data, produk tak dikenal disembunyikan tapi tidak dibuang, link ke detail, menu akun Wishlist | `wishlist.test.tsx` + browser | ✅ |
| WISH-C02 | C | Hapus item / kosong | Toast "Dihapus dari wishlist"; empty state "Wishlist masih kosong" | `wishlist.test.tsx` + browser | ✅ |
| WISH-C03 | C | Drag & drop | Urutan disimpan sekali; id dibaca dari `dataTransfer`; drop teks asing / di diri sendiri diabaikan; tetap setelah reload | `wishlist.test.tsx` + browser | ✅ |
| WISH-C04 | C | Keyboard (Spasi/Enter angkat-taruh, ↑/↓, Esc) | Belum tersimpan sampai ditaruh; dibatasi ujung daftar; Esc batal tanpa menulis; pengumuman `aria-live` | `wishlist.test.tsx` + browser | ✅ |
| PROD-U01 | U | `formatZoom` untuk nilai bulat dan desimal | Format "100%" | — | ⚠️ |

## 5. Cart & Voucher (FR-SHOP-*) · locator: `cart.md`

| ID | Layer | Skenario | Expected | File test | Status |
|---|---|---|---|---|---|
| CART-U01 | U | `maxQty` | min(stok, 10), tidak negatif | `cartRules.test.ts` | ✅ |
| CART-U02 | U | `addLine` dengan baris baru, varian sama, varian beda, sudah di batas | Varian sama digabung dan dibatasi, varian beda baris baru, di batas `added`=0. Baris tersimpan kembali aktif | `cartRules.test.ts` | ✅ |
| CART-U03 | U | `cartCount`, `selectedSubtotal`, `selectAllState` | Badge, subtotal, dan status tri-state benar | `cartRules.test.ts` | ✅ |
| CART-U04 | U | `normalizeCode` | Trim dan huruf besar | `voucherRules.test.ts` | ✅ |
| CART-U05 | U | `voucherError` untuk EXPIRED, kode tak dikenal, MIN100K di bawah Rp100.000 | Pesan kontrak masing-masing | `voucherRules.test.ts` | ⚠️ cek tiap cabang |
| CART-U06 | U | `voucherDiscount` HEMAT10 | 10% dibulatkan ke bawah, maks Rp50.000 | `voucherRules.test.ts` | ✅ |
| CART-U07 | U | MIN100K dan ONGKIR | MIN100K potong Rp15.000. ONGKIR potong ongkir maks Rp20.000 | `voucherRules.test.ts` | ✅ |
| CART-C01 | C | Keranjang kosong | Empty state + "Mulai belanja" | `shopProductCart.test.tsx` | ✅ |
| CART-C02 | C | Isi keranjang | Baris, subtotal terpilih, Pilih Semua tri-state | `shopProductCart.test.tsx` | ✅ |
| CART-C03 | C | Ubah qty lewat select | Qty dan subtotal ikut berubah | `shopProductCart.test.tsx` | ✅ |
| CART-C04 | C | Hapus lalu Urungkan dalam 4 dtk | Baris kembali di posisi semula, tidak dobel | `shopProductCart.test.tsx` | ✅ |
| CART-C05 | C | Simpan untuk nanti ↔ pindahkan ke keranjang | Badge tidak menghitung baris tersimpan | `shopProductCart.test.tsx` | ✅ |
| CART-C06 | C | Stok habis atau produk tak dikenal | Baris tidak bisa dipilih / dilewati | `shopProductCart.test.tsx` | ✅ |
| CART-C07 | C | Voucher | Error kontrak, HEMAT10 terpasang, Lepas | `shopProductCart.test.tsx` | ✅ |
| CART-C08 | C | Pasang MIN100K lalu subtotal turun | Error tampil dan diskon hilang | `shopProductCart.test.tsx` | ✅ |
| CART-C09 | C | Klik Checkout | Pindah ke `/checkout` | `shopProductCart.test.tsx` | ✅ |
| CART-E01 | E | Keranjang, wishlist, voucher | Bertahan setelah logout lalu login | `shop.emulator.test.ts` | ✅ |

## 6. Checkout & Payment (FR-PAYM-*) · locator: `checkout.md`

### 6.1 Rules (`src/domain/payment.ts`)
| ID | Layer | Skenario | Expected | File test | Status |
|---|---|---|---|---|---|
| PAYM-U01 | U | `priceSummary`: 2 × Rp75.000, HEMAT10, Express, asuransi | Total Rp158.000 | `payment.test.ts` | ✅ |
| PAYM-U02 | U | ONGKIR dengan Same Day dan Reguler. Voucher tidak memenuhi syarat | Same Day tetap bayar Rp15.000, Reguler gratis. Voucher invalid diabaikan | `payment.test.ts` | ✅ |
| PAYM-U03 | U | `courierAvailable` | Same Day hanya untuk DKI Jakarta | `payment.test.ts` | ✅ |
| PAYM-U04 | U | `isDeliveryTimeValid` pada 08:59, 09:00, 17:00, 17:01, dan kosong | Valid hanya 09:00–17:00 | — | ⚠️ cek batas |
| PAYM-U05 | U | `formatCardNumber`, `formatExpiry`, `digitsOnly` | Per 4 digit, maks 16. Format MM/YY | `payment.test.ts` | ✅ |
| PAYM-U06 | U | `luhn` dengan 12, 13, 19, dan 20 digit, checksum salah | Valid hanya 13–19 digit dengan checksum benar | `payment.test.ts` | ⚠️ cek batas panjang |
| PAYM-U07 | U | `expiryError`: format salah, bulan 00/13, bulan ini, bulan lalu | Kedaluwarsa dihitung sampai akhir bulan | `payment.test.ts` | ✅ |
| PAYM-U08 | U | `cardErrors`, `cardOutcome` (…0002 ditolak, …0119 pending, lainnya sukses) | Sesuai kontrak §4.3 | `payment.test.ts` | ✅ |
| PAYM-U09 | U | `orderId`, `appDate` | Format PM-YYYYMMDD-XXXX. Mode deterministik 20260115, selain itu tanggal Asia/Jakarta | `payment.test.ts` | ✅ |

### 6.2 Repository (`src/data/orderRepository.ts#placeOrder`)
| ID | Layer | Skenario | Expected | File test | Status |
|---|---|---|---|---|---|
| PAYM-U20 | U | Bayar dengan kartu | Order dibuat, orderSeq+1, baris yang dibayar dihapus, voucher lepas, stok berkurang | `orderRepository.test.ts` | ✅ |
| PAYM-U21 | U | Bayar dengan PracticePay | Saldo berkurang + transaksi "Belanja PracticeMart" | `orderRepository.test.ts` | ✅ |
| PAYM-U22 | U | Bayar dengan VA | Status WAITING + `vaDeadline` | `orderRepository.test.ts` | ✅ |
| PAYM-U23 | U | Stok kurang / saldo kurang | `CheckoutError` dengan pesan kontrak | `orderRepository.test.ts` | ✅ |
| PAYM-E01 | E | Kartu, PracticePay, stok/saldo kurang, VA di emulator | Penolakan tidak menulis apa pun | `checkout.emulator.test.ts` | ✅ |

### 6.3 UI Checkout (`CheckoutPage.tsx`, `CheckoutResultPage.tsx`)
| ID | Layer | Skenario | Expected | File test | Status |
|---|---|---|---|---|---|
| PAYM-C01 | C | Contoh kontrak di UI | Total Rp158.000, draf tersimpan di sessionStorage `pm.checkout` | `checkout.test.tsx` | ✅ |
| PAYM-C02 | C | Buka ulang checkout | Draf dipulihkan. Draf rusak atau bukan JSON → default | `checkout.test.tsx` | ✅ |
| PAYM-C03 | C | Data kartu | Tidak pernah tersimpan di draf | `checkout.test.tsx` | ⚠️ assert eksplisit |
| PAYM-C04 | C | Same Day dengan alamat di luar DKI, lalu ganti alamat | Di luar DKI tidak tersedia. Setelah ganti, tersedia dan jam kirim wajib | `checkout.test.tsx` | ✅ |
| PAYM-C05 | C | ONGKIR, keranjang kosong / tidak ada baris terpilih, tanpa alamat | Ongkir terpotong. Tanpa baris → kembali ke keranjang. Tanpa alamat → Bayar disabled | `checkout.test.tsx` | ✅ |
| PAYM-C06 | C | Offline | Banner + Bayar disabled | `checkout.test.tsx` | ✅ |
| PAYM-C07 | C | Validasi kartu | Luhn, kedaluwarsa, CVV. Bayar disabled sampai valid | `checkout.test.tsx` | ✅ |
| PAYM-C08 | C | 3DS sukses | Overlay → iframe bank (origin lain) → postMessage success → order PAID → halaman hasil | `checkout.test.tsx` | ✅ |
| PAYM-C09 | C | 3DS ditutup atau dibatalkan | Kembali ke checkout tanpa order | `checkout.test.tsx` | ✅ |
| PAYM-C10 | C | Kartu ditolak / pending | Ditolak: pesan gagal. Pending: order WAITING | `checkout.test.tsx` | ✅ |
| PAYM-C11 | C | Bayar dengan VA | WAITING dengan batas waktu dari Developer Options | `checkout.test.tsx` | ✅ |
| PAYM-C12 | C | Bayar dengan COD | PAID. Ditolak bila total > Rp1.000.000 | `checkout.test.tsx` | ✅ |
| PAYM-C13 | C | Metode di draf sudah tidak tersedia | Metode tidak terpilih | `checkout.test.tsx` | ✅ |
| PAYM-C14 | C | Stok habis saat transaksi / error jaringan | Pesan kontrak atau pesan umum, bisa coba lagi | `checkout.test.tsx` | ✅ |
| PAYM-C15 | C | Notifikasi browser diizinkan | Notifikasi dikirim | `checkout.test.tsx` | ✅ |
| PAYM-C16 | C | Halaman hasil | Salin Order ID (sukses dan gagal) → toast | `checkout.test.tsx` | ✅ |
| PAYM-C17 | C | Order tidak ada, gagal dibaca, atau tanpa state | 404 | `checkout.test.tsx` | ✅ |
| PAYM-C19 | C | Pilih bank VA (FR-PAYM-05) | Default BCA; pilihan tersimpan di draf; draf bank tak dikenal → BCA; `vaBank` dikirim ke `placeOrder` | `checkout.test.tsx` + browser | ✅ |
| PAYM-C20 | C | Panel VA di halaman hasil & detail (FR-PAYM-08) | Nomor VA (BCA deterministik `8077 0000 1234 5678`), Salin → "Nomor VA disalin" / "Gagal menyalin", countdown `role=timer` sampai 00:00, 3 cara bayar, link "Lihat pesanan" | `checkout.test.tsx`, `ordersPay.test.tsx` + browser | ✅ |
| PAYM-C21 | C | Cek Status (FR-PAYM-09) | Deterministik 30%: ke-1 "Gagal memuat, coba lagi", ke-2 toast "Pembayaran belum diterima"; sudah dibayar → status diperbarui, panel hilang | `ordersPay.test.tsx` + browser | ✅ |
| PAYM-U10 | U | `vaNumber`, `vaBankOf`, `placeOrder` dengan `vaBank` | Nomor per bank; label lama → BCA; `methodLabel` "Virtual Account BNI" | `payment.test.ts`, `orderRepository.test.ts` | ✅ |
| PAYM-C18 | C | Hasil "Menunggu Pembayaran" | Batas VA tampil. Tombol "kembali ke keranjang" dan "lanjut belanja" jalan | `checkout.test.tsx` + browser | ✅ |

### 6.4 3DS (`features/checkout/ThreeDSDialog.tsx`, `bank/3ds.html`)
| ID | Layer | Skenario | Expected | File test | Status |
|---|---|---|---|---|---|
| 3DS-C01 | C | postMessage dari origin lain | Diabaikan, dialog tetap terbuka | `checkout.test.tsx` | ✅ |
| 3DS-C02 | C | postMessage dari origin benar tetapi `source` bukan iframe | Diabaikan | `checkout.test.tsx` | ✅ |
| 3DS-C03 | C | Payload `type` salah atau `status` tak dikenal | Diabaikan | `checkout.test.tsx` | ✅ |
| 3DS-C04 | C | URL iframe | Hanya berisi 4 digit terakhir kartu, tidak ada nomor penuh | `checkout.test.tsx` | ✅ |
| 3DS-M01 | Manual | `bank/3ds.html`: OTP 123456 benar, OTP salah, Batal | Mengirim success / error inline / cancelled | Browser (Chrome) | ✅ OTP salah → "Kode OTP salah"; 123456 → sukses |

## 7. PIN PracticePay (`features/checkout/PinDialog.tsx`, `domain/pinHash.ts`)

| ID | Layer | Skenario | Expected | File test | Status |
|---|---|---|---|---|---|
| PIN-U01 | U | `hashPin` dengan test vector kontrak §8.6 | Lulus. Salt acak 16 byte per panggilan | `pinHash.test.ts` | ✅ |
| PIN-U02 | U | `verifyPin` dengan PIN benar dan PIN salah | true / false | `pinHash.test.ts` | ✅ |
| PIN-U03 | U | `verifyPin` dengan hash rusak (bagian kurang, iterasi bukan angka) | false, tidak throw | `pinHash.test.ts` | ✅ |
| PIN-C01 | C | PIN salah | "PIN salah. Sisa N percobaan." PIN benar → order wallet | `checkout.test.tsx` | ✅ |
| PIN-C02 | C | 3× PIN salah | Terkunci 30 dtk (tersimpan di akun), pad disabled | `checkout.test.tsx` | ✅ |
| PIN-C03 | C | Tutup dialog PIN | Tombol Bayar aktif lagi | `checkout.test.tsx` | ✅ |
| PIN-C04 | C | Input lewat keyboard fisik (angka, Backspace, huruf diabaikan) | Kotak PIN terisi atau terhapus dengan benar | `checkout.test.tsx` | ✅ |
| PIN-C05 | C | 1× salah lalu benar | Hitungan gagal direset ke 0 | `checkout.test.tsx` | ✅ |
| PIN-C06 | C | Buka dialog saat `pinLockedUntil` sudah lewat | Pad aktif kembali | `checkout.test.tsx` | ✅ |

## 8. Orders (FR-ORD-*) · locator: `orders.md`

| ID | Layer | Skenario | Expected | File test | Status |
|---|---|---|---|---|---|
| ORD-U01 | U | `nextStatus`, `canCancel` | Status maju berurutan. DONE dan CANCELLED berhenti. Batal hanya sampai Dikemas | `orderRules.test.ts` | ✅ |
| ORD-U02 | U | `cashback` | 5%, maks Rp10.000, dibulatkan ke bawah, hanya PracticePay | `orderRules.test.ts` | ✅ |
| ORD-U03 | U | `filterOrders` dengan tab, ID, rentang tanggal | Diproses = Dibayar + Dikemas. Cari ID case-insensitive. Rentang tanggal inklusif | `orderRules.test.ts` | ✅ |
| ORD-U04 | U | `jakartaDay` pada 17:30 UTC | Sudah hari berikutnya di Jakarta | `orderRules.test.ts` | ✅ |
| ORD-U05 | U | `advanceOrder` | Maju bila status sama dengan expected. Status beda atau sudah akhir → no-op | `orderRepository.test.ts` | ✅ |
| ORD-U06 | U | `advanceOrder` ke DONE | Wallet: cashback + transaksi dalam satu transaksi. Non-wallet: tanpa cashback | `orderRepository.test.ts` | ✅ |
| ORD-U07 | U | `cancelOrder` | Stok kembali per varian. Status Dikirim ke atas ditolak. Idempoten. Order tidak ada → error | `orderRepository.test.ts` | ✅ |
| ORD-U08 | U | `getOrder`, `listOrders` | Dokumen ada / tidak ada. Diurutkan createdAt turun | `orderRepository.test.ts` | ✅ |
| ORD-C01 | C | Tabel pesanan | Kolom id, tanggal, ringkasan (`itemSummary`), total, status, link | `ordersPay.test.tsx` | ✅ |
| ORD-C02 | C | Tab, cari ID, rentang tanggal | Hasil terfilter. Tanpa hasil → empty state | `ordersPay.test.tsx` | ✅ |
| ORD-C03 | C | Panah kiri/kanan pada tab | Fokus pindah tab | `ordersPay.test.tsx` | ✅ |
| ORD-C04 | C | Gagal memuat | Pesan + Coba lagi | `ordersPay.test.tsx` | ✅ |
| ORD-C05 | C | Detail pesanan | Ringkasan, timeline, produk, rincian. ID tidak ada → 404. Salin ID → toast | `ordersPay.test.tsx` | ✅ |
| ORD-C06 | C | Mode manual / interval otomatis | Manual: tombol "status berikutnya". Otomatis: status maju sesuai interval | `ordersPay.test.tsx` | ✅ |
| ORD-C07 | C | Menunggu Pembayaran | Tidak maju otomatis. Tombol "Tandai dibayar" jalan. VA lewat batas → dibatalkan otomatis | `ordersPay.test.tsx` | ✅ |
| ORD-C08 | C | Dialog batal | Disabled sampai alasan dipilih. "Lainnya" wajib teks. Kembali menutup tanpa membatalkan | `ordersPay.test.tsx` | ✅ |
| ORD-C09 | C | Pesanan Dikirim | Tanpa tombol batal, ada teks penjelasan. Error bisnis dari server tampil apa adanya | `ordersPay.test.tsx` | ✅ |
| ORD-C10 | C | Batal saat offline | Pesan offline, tidak menulis | `ordersPay.test.tsx` | ✅ |
| ORD-C11 | C | Gagal membaca pesanan / salin gagal / produk tak dikenal tanpa varian | 404 / "Gagal menyalin" / nama = productId, Rp0 | `ordersPay.test.tsx` | ✅ |
| ORD-C12 | C | VA belum lewat batas | Dibatalkan otomatis tepat saat batas tiba | `ordersPay.test.tsx` | ✅ |
| ORD-U09 | U | `itemSummary` tanpa baris / produk tak dikenal | "–" / productId | `ordersPay.test.tsx` | ✅ |
| ORD-C13 | C | Badge pesanan aktif (FR-ACC-01) | `acc_badge_orders` & `acc_badge_menu_orders` = jumlah Menunggu s/d Dikirim; 0 → hilang; diperbarui setelah status berubah; gagal hitung tidak merusak halaman | `ordersPay.test.tsx`, `orderRepository.test.ts` + browser | ✅ |
| ORD-E02 | E | `countActiveOrders` di emulator | Sama dengan jumlah pesanan aktif; rules mengizinkan agregasi | `ordersPay.emulator.test.ts` | ✅ |
| ORD-E01 | E | Siklus sampai DONE, cashback tepat sekali, batal ganda, listOrders | Hasil sesuai di emulator | `ordersPay.emulator.test.ts` | ✅ |

## 9. PracticePay (FR-PAY-*) · locator: `pay.md`

| ID | Layer | Skenario | Expected | File test | Status |
|---|---|---|---|---|---|
| PAY-U01 | U | `transferError` | Saldo dicek dulu, lalu minimal Rp10.000 | `orderRules.test.ts` | ✅ |
| PAY-U02 | U | `searchContacts` | Cocok dengan nama atau digit nomor | `orderRules.test.ts` | ✅ |
| PAY-U03 | U | `parseQr` | URL valid, query, merchant tak dikenal, bukan URL → null | `orderRules.test.ts` | ✅ |
| PAY-U04 | U | `viewTransactions` | Filter masuk/keluar, urut tanggal/nominal | `orderRules.test.ts` | ✅ |
| PAY-U05 | U | `parseAmount` dengan input berisi huruf/titik, lebih dari 9 digit, kosong | Hanya digit, maks 9, kosong → 0 | `ordersPay.test.tsx` (input "15a000" → Rp15.000) | ✅ |
| PAY-U06 | U | Pindahkan test `payRules` ke `payRules.test.ts` (sekarang ada di `orderRules.test.ts`) | Struktur rapi | — | 🆕 (opsional) |
| PAY-U07 | U | `spendBalance` | Saldo berkurang + transaksi negatif. Saldo kurang / nominal bukan bulat / <1 ditolak | `walletRepository.test.ts` | ✅ |
| PAY-U08 | U | `listTransactions` | Maks 100, mapping dokumen + default | `walletRepository.test.ts` | ✅ |
| PAY-C01 | C | Saldo | Sembunyikan / tampilkan. Riwayat dengan format tanggal dan nominal | `ordersPay.test.tsx` | ✅ |
| PAY-C02 | C | Chip Masuk/Keluar, urut tanggal/nominal | Riwayat terfilter dan terurut | `ordersPay.test.tsx` | ✅ |
| PAY-C03 | C | Riwayat gagal dimuat | Tombol Coba lagi | `ordersPay.test.tsx` | ✅ |
| PAY-C04 | C | Transfer lengkap | Kontak → nominal → PIN → berhasil. Saldo dan riwayat dimuat ulang | `ordersPay.test.tsx` | ✅ |
| PAY-C05 | C | Saldo tidak cukup / PIN salah | Lanjut disabled. PIN salah menahan transfer | `ordersPay.test.tsx` | ✅ |
| PAY-C06 | C | Server menolak | Kembali ke form dengan pesan (`errorText`) | `ordersPay.test.tsx` | ✅ |
| PAY-C07 | C | Chip nominal (`AMOUNT_CHIPS`), catatan > `NOTE_MAX` | Nominal terisi. Catatan dibatasi 50 | `ordersPay.test.tsx` | ✅ |
| PAY-C08 | C | Unggah QR | Tanpa BarcodeDetector → "QR tidak terbaca". QR valid → konfirmasi. QR asing → "QR tidak valid" | `ordersPay.test.tsx` | ✅ |
| PAY-C09 | C | `/pay/qr` merchant nominal bebas | Nominal dari URL bisa diubah → PIN → berhasil | `ordersPay.test.tsx` | ✅ |
| PAY-C10 | C | `/pay/qr` merchant nominal tetap, merchant tak dikenal, nominal > saldo | `?amount=` diabaikan. Tak dikenal → state invalid. Melebihi saldo → error | `ordersPay.test.tsx` | ✅ |
| PAY-C11 | C | Riwayat kosong + Muat ulang | "Belum ada transaksi", dibaca ulang | `ordersPay.test.tsx` | ✅ |
| PAY-C13 | C | Top Up (FR-PAY-02 sederhana) | Rp5.000 → "Minimal top up Rp10.000"; Rp10.000.001 → "Maksimal…"; error rate → "Gagal memuat, coba lagi"; sukses → "Top up berhasil", saldo & riwayat dimuat ulang | `ordersPay.test.tsx` + browser | ✅ |
| PAY-U09 | U | `topUpError`, `topUpBalance` | Batas inklusif; transaksi Firestore + dokumen "Top Up Saldo"; nominal tidak valid ditolak tanpa menulis | `orderRules.test.ts`, `walletRepository.test.ts` | ✅ |
| PAY-E02 | E | Top Up di emulator | Saldo bertambah, transaksi tertulis, rules menerima | `ordersPay.emulator.test.ts` | ✅ |
| PAY-C14 | C | Catatan transfer (FR-PAY-05) | `maxlength` 50 + penghitung "n/50"; catatan masuk judul transaksi "Transfer ke <nama> · <catatan>" dan tampil di hasil | `ordersPay.test.tsx` + browser | ✅ |
| PAY-C15 | C | Notifikasi transfer (FR-PAY-07) | Notifikasi "Transfer Rp… ke <nama> berhasil" bila izin & preferensi aktif | `ordersPay.test.tsx` | ✅ |
| PAY-C16 | C | Kontak A–Z + "Terakhir" (FR-PAY-03, E2E-09) | Header huruf lengket saat scroll; filter tetap terkelompok; chip "Terakhir" (maks 3 dari riwayat) memilih penerima | `ordersPay.test.tsx`, `orderRules.test.ts` + browser | ✅ |
| PAY-C12 | C | QR tanpa kode / tanpa nominal / batal pilih file; `/pay/qr` tanpa merchant, tanpa nominal, server menolak | Pesan sesuai, tidak membayar | `ordersPay.test.tsx` | ✅ |
| PAY-E01 | E | Transfer dan saldo kurang di emulator | Riwayat terbaru dulu. Saldo tidak berubah saat ditolak | `ordersPay.emulator.test.ts` | ✅ |

## 10. Account (FR-ACC-*) · locator: `account.md`

| ID | Layer | Skenario | Expected | File test | Status |
|---|---|---|---|---|---|
| ACC-U01 | U | `addressErrors` | Semua field valid. Penerima, telp 10–13 digit, provinsi, kota∈provinsi, jalan, kodepos 5 digit masing-masing error | `address.test.ts` | ✅ |
| ACC-U02 | U | `locate` | (-6.2088, 106.8228) → Jakarta Pusat. Di luar ±0.05 → null | `address.test.ts` | ⚠️ cek batas luar |
| ACC-U03 | U | `photoError`, `formatAddress` | Hanya PNG/JPG maks 2 MB. Alamat terformat | `address.test.ts` | ✅ |
| ACC-C01 | C | Navigasi akun | Link aktif, nama dan email, Keluar dengan konfirmasi | `account.test.tsx` | ✅ |
| ACC-C02 | C | Ubah profil | Nama, tanggal lahir, jenis kelamin tersimpan. Nama tampilan ikut berubah | `account.test.tsx` | ✅ |
| ACC-C03 | C | Simpan dengan nama kosong | Error "nama wajib", tidak menyimpan | — | ⚠️ |
| ACC-C04 | C | Foto | Format/ukuran salah ditolak. Upload dan drag-drop → pratinjau. localStorage penuh → pesan | `account.test.tsx` | ✅ |
| ACC-C05 | C | Alamat | Daftar, Jadikan utama, tambah dengan validasi, ubah. Alamat utama selalu satu. Alamat pertama otomatis utama | `account.test.tsx` | ✅ |
| ACC-C06 | C | Gunakan lokasi | Lokasi uji, di luar area, ditolak, tidak didukung | `account.test.tsx` | ✅ |
| ACC-C07 | C | Buka `/account#alamat` | Halaman menggulir ke daftar alamat | `account.test.tsx` | ✅ |
| ACC-C08 | C | Hapus alamat (bila ada) | Konfirmasi. Jika alamat utama dihapus, utama pindah | — | ⚠️ |
| ACC-C09 | C | Write ditolak server (`useAccount.update`) | State dimuat ulang (`reloadState`) | — | ⚠️ |
| ACC-E01 | E | Nama tampilan, profil, alamat, PIN | Tersimpan sesuai rules | `checkout.emulator.test.ts` | ✅ |

## 11. Settings & Developer Options (`src/sim/settings.ts`, `SettingsPage.tsx`)

| ID | Layer | Skenario | Expected | File test | Status |
|---|---|---|---|---|---|
| SET-U01 | U | Belum ada pengaturan tersimpan | Default kontrak | `settings.test.ts` | ✅ |
| SET-U02 | U | Tulis lalu baca | Nilai kembali sama, `SETTINGS_EVENT` dikirim | `settings.test.ts` | ✅ |
| SET-U03 | U | Nilai tersimpan rusak | Kembali ke default | `settings.test.ts` | ✅ |
| SET-U04 | U | `resetSettings` | Hanya `pm.dev.*` / `pm.pref.*` yang dihapus | `settings.test.ts` | ✅ |
| SET-U05 | U | `applyUrlHooks` | Return true bila ada nilai dikenali. Nilai invalid diabaikan | `settings.test.ts` | ✅ |
| SET-U06 | U | `applyDocumentSettings` | Atribut lang, tema, animasi pada document | `settings.test.ts` | ✅ |
| SET-U08 | U | `serverFails` | 0% tidak gagal; deterministik gagal/berhasil bergantian; acak memakai peluang | `settings.test.ts` | ✅ |
| SET-U07 | U | `processingDelayMs`, `isDeterministic`, `VA_TIMEOUT_MS` | Latency 0/1/×N menghasilkan delay yang benar | — | ⚠️ |
| SET-C01 | C | Ubah pengaturan umum dan Developer Options | Tersimpan di browser | `account.test.tsx` | ✅ |
| SET-C02 | C | Notifikasi OFF lalu ON | Meminta izin browser | `account.test.tsx` | ✅ |
| SET-C03 | C | Reset | Dialog konfirmasi, lalu pengaturan kembali default | `account.test.tsx` | ✅ |
| SET-C04 | C | Tentang (DEV-04) | Versi, commit, tanggal build, uid | `account.test.tsx` | ✅ |
| SET-C05 | C | URL hook DEV-02, dari halaman settings atau halaman lain | Disimpan lalu kembali ke halaman asal | `account.test.tsx` | ✅ |
| SET-C06 | C | Locator hint | Label data-testid tampil hanya saat ON | `account.test.tsx` | ✅ |
| SET-C07 | C | Error rate (`flaky`) > 0 | Cek Status VA & Top Up gagal sesuai rate, pesan "Gagal memuat, coba lagi" | `ordersPay.test.tsx` + browser | ✅ |
| SET-C08 | C | Animasi OFF | Overlay dan carousel tanpa transisi | — | ⚠️ |

## 12. Help, Terms, 404 (FR-HELP-*)

| ID | Layer | Skenario | Expected | File test | Status |
|---|---|---|---|---|---|
| HELP-C01 | C | FAQ | Iframe same-origin. postMessage contact → toast. Link `tel:` dan S&K | `account.test.tsx` | ✅ |
| HELP-C02 | C | Widget chat | Kirim pesan, balasan tampil. Pesan kosong tidak terkirim | `account.test.tsx` | ✅ |
| HELP-C03 | C | `/terms` | Bisa dibuka tanpa login | `account.test.tsx` | ✅ |
| HELP-C04 | C | URL tak dikenal | 404 dengan link Beranda | `shopProductCart.test.tsx` | ✅ |

## 13. Komponen bersama (`src/components`)

| ID | Layer | Skenario | Expected | File test | Status |
|---|---|---|---|---|---|
| CMP-U01 | U | `tid`, `tid.list` | Elemen unik: id = data-testid. Item list: hanya data-testid | `testid.test.ts` | ✅ |
| CMP-C01 | C | `Dialog`: Esc, klik scrim, fokus awal, focus trap Tab/Shift+Tab, fokus kembali ke pemicu | Aksesibilitas modal benar | `Dialog.test.tsx` | ✅ |
| CMP-C02 | C | `ConfirmDialog` | Konfirmasi memanggil `onConfirm`. Batal tidak | `Dialog.test.tsx` | ✅ |
| CMP-C03 | C | `Snackbar` | Auto-hide setelah 4000 ms. Snackbar baru menggantikan yang lama. Tombol aksi jalan | `shopProductCart.test.tsx` | ⚠️ |
| CMP-C07 | U | Semua route lazy di `appRoutes()` | 19 komponen halaman termuat | `session.test.tsx` | ✅ |
| CMP-C04 | C | `useLogoutConfirm` | Batal tetap login. Konfirmasi memanggil logout lalu ke `/login` | `account.test.tsx` | ✅ |
| CMP-C05 | C | `LocatorHintOverlay` | Label mengikuti posisi elemen. Hilang saat hint OFF | `account.test.tsx` | ⚠️ |
| CMP-C06 | C | `useOnline` | Event online/offline mengubah state | `checkout.test.tsx` | ✅ |

## 14. Data layer umum

| ID | Layer | Skenario | Expected | File test | Status |
|---|---|---|---|---|---|
| DATA-U01 | U | `parseState`, `parseCartLine`, `parseStock`, `parseOrder` | Dokumen kosong → default. Tipe salah diabaikan. qty<1 dibuang. Stok negatif → 0 | `schema.test.ts`, `orderRepository.test.ts` | ✅ |
| DATA-U02 | U | `getStock` | Cache per tab. Dibuat bila belum ada. Race antar client tidak menimpa. Gagal tidak di-cache | `repositories.test.ts` | ✅ |
| DATA-U03 | U | `getState`, `updateStateField` | Baca ulang lalu update satu field. Ditolak server → `onWriteError` | `repositories.test.ts` | ✅ |
| DATA-U04 | U | `initialState`, `INITIAL_TRANSACTIONS` | Sesuai kontrak, 8 transaksi ID 8→1 | `initialAccount.test.ts` | ✅ |
| DATA-U05 | U | `formatRupiah` | 0, ribuan, jutaan, desimal dipotong, negatif | — | ⚠️ (tidak langsung) |
| DATA-U06 | U | `formatDay`, `formatClock`, `formatStamp`, `formatRating` di Asia/Jakarta, termasuk pergantian hari UTC | Format tanggal benar | — | ⚠️ (tidak langsung) |
| RULE-R01 | R | `users/{uid}` | Pemilik bisa baca/tulis dengan email sendiri. Email beda, akun lain, guest ditolak | `firestore.rules.test.ts` | ✅ |
| RULE-R02 | R | State dan subkoleksi | Update per field dengan tipe benar diterima. Tipe salah atau terlalu besar ditolak | `firestore.rules.test.ts` | ✅ |
| RULE-R03 | R | `catalog/stock` | User login bisa baca dan mengurangi stok. Tambah/hapus produk dan field lain ditolak. Create hanya bila belum ada | `firestore.rules.test.ts` | ✅ |
| RULE-R04 | R | Path lain | Ditolak | `firestore.rules.test.ts` | ✅ |

---

## Fitur PRD yang belum ada di web (❌)

Level HIGH sudah selesai (2026-11-20): halaman VA + bank, Cek Status + error rate, Top Up sederhana, Wishlist. Lupa Password dihapus dari web.

Level MEDIUM P1 selesai (2026-11-20): Beli Sekarang, badge pesanan aktif, catatan + notifikasi transfer, kontak A–Z + "Terakhir".

Sisa MEDIUM (P2/P3, belum dikerjakan): Scan QR kamera + "Izin kamera ditolak" (FR-PAY-09, N-13), voucher modal + Tempel (FR-SHOP-18), Onboarding + izin notifikasi (FR-AUTH-01/02), Riwayat lengkap (FR-PAY-11), Shadow DOM Transfer (PRD §7).

## Hasil test browser (Chrome, emulator `demo-practicemart`, 2026-11-20)

Alur yang dicoba dan lulus:
- Register (validasi email, strength, konfirmasi, S&K), login salah lalu benar.
- Search dengan filter/sort di URL, produk (varian XL stok 0 disabled), keranjang (EXPIRED, `hemat10` dinormalisasi, hapus + Urungkan).
- Checkout kartu + 3DS (OTP salah lalu 123456), batal pesanan.
- PracticePay + PIN salah lalu benar, pesanan sampai Selesai dengan cashback Rp10.000.
- Transfer (saldo kurang, di bawah minimum, valid), QR TOKOBUKU dan KOPIPAGI, VA ("Menunggu Pembayaran").
- Alamat (validasi lalu simpan), Pengaturan, Help, 404, Keluar, redirect ke `/login` dengan URL tujuan.
- Fitur HIGH (emulator baru, akun `qa2@practicemart.test`, deterministik + error rate 30%):
  - Login tanpa link Lupa password.
  - Checkout VA BNI → nomor `8808 2026 0115 0001`, Salin, countdown, cara bayar, Cek Status (gagal lalu "Pembayaran belum diterima"), Lihat pesanan → Saya sudah bayar → Dibayar.
  - Top Up Rp5.000 ditolak; Rp100.000 gagal sekali lalu berhasil → saldo Rp600.000, riwayat "Top Up Saldo".
  - Wishlist: keyboard pindah posisi, drag & drop (DragEvent), hapus; urutan tetap setelah reload.
  - Bug ditemukan & diperbaiki: drop membaca state basi (DnD tidak berpindah di browser asli); simpan urutan membuang ID produk tak dikenal.
- Level MEDIUM P1 (emulator baru, akun `qa3@practicemart.test`):
  - E2E-06: keranjang berisi Kaos → Beli Sekarang Sepatu → checkout hanya Sepatu (tahan reload) → PracticePay → keranjang tetap 1.
  - Badge pesanan aktif "1" di nav & menu → pesanan dimajukan sampai Selesai → badge hilang.
  - E2E-09: header huruf lengket saat scroll, chip "Terakhir: Budi Santoso", catatan "Bayar arisan November" → riwayat "Transfer ke Budi Santoso · Bayar arisan November".
- Tidak ada error di console.

Catatan UX (bukan bug, sesuai kode/spec saat ini):
- Pesanan dibatalkan: timeline menampilkan semua langkah "Belum", termasuk "Dibayar" yang sebelumnya tercatat.
- `/shop/search?q=…` dibuka langsung: kotak search di header kosong.

## Coverage (`npm run test:coverage`, 2026-11-20)

| Metrik | Nilai |
|---|---|
| Statements | 99.39% |
| Branches | 97.41% |
| Functions | 98.32% |
| Lines | 99.89% |

375 test unit/UI, 13 test rules, 21 test integration. Semua lulus.
