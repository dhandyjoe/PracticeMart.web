import { BrandHeader } from "../components/BrandHeader";
import { tid } from "../components/testid";
import auth from "../features/auth/auth.module.css";
import styles from "../features/account/account.module.css";

// Dibuka di tab baru dari Register & Pusat Bantuan (PRD §6.2 `/terms`); bisa dibuka tanpa login.
export default function TermsPage() {
  return (
    <div className={auth.page}>
      <BrandHeader />
      <main className={auth.mainNarrow}>
        <article className={styles.section}>
          <h1 style={{ margin: 0 }} {...tid("terms_txt_title")}>
            Syarat &amp; Ketentuan
          </h1>
          <p>
            PracticeMart adalah aplikasi latihan pengujian otomatis. Semua produk, harga, pembayaran, dan saldo
            PracticePay adalah simulasi; tidak ada barang yang dikirim dan tidak ada uang sungguhan yang berpindah.
          </p>
          <h2 {...tid("terms_txt_account_head")} style={{ margin: 0, fontSize: 17 }}>Akun</h2>
          <p>
            Gunakan email yang kamu kelola sendiri dan jangan memakai password yang juga dipakai di layanan lain. Data
            akun dipakai bersama aplikasi web dan Android PracticeMart.
          </p>
          <h2 {...tid("terms_txt_data_head")} style={{ margin: 0, fontSize: 17 }}>Data uji</h2>
          <p>
            Jangan memasukkan nomor kartu, data identitas, atau informasi pribadi sungguhan. Gunakan nomor kartu uji
            yang tercantum di dokumentasi latihan.
          </p>
          <h2 {...tid("terms_txt_stock_head")} style={{ margin: 0, fontSize: 17 }}>Stok bersama</h2>
          <p>Stok produk dipakai bersama semua pengguna, sehingga dapat berubah karena aktivitas pengguna lain.</p>
        </article>
      </main>
    </div>
  );
}
