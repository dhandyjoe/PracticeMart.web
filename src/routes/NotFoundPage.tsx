import { Link } from "react-router";
import { tid } from "../components/testid";
import styles from "../features/shop/shop.module.css";

// SYS-01: URL tidak dikenal (SPA tetap HTTP 200).
export default function NotFoundPage() {
  return (
    <div className={styles.empty}>
      <p {...tid("shop_txt_not_found")}>Halaman tidak ditemukan</p>
      <span>Alamat yang kamu buka tidak ada atau sudah dipindahkan.</span>
      <Link to="/" className={styles.primaryBtn} {...tid("shop_btn_back_home")}>
        Kembali ke Beranda
      </Link>
    </div>
  );
}
