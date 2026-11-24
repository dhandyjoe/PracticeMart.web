import { Link } from "react-router";
import styles from "./BrandHeader.module.css";
import { tid } from "./testid";

export function BrandHeader() {
  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <Link to="/" className={styles.logo} {...tid("shop_link_logo")}>
          <span className={styles.mark} aria-hidden="true">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 8h14l-1 12H6zM9 8V6a3 3 0 0 1 6 0v2" />
            </svg>
          </span>
          <span className={styles.name}>PracticeMart</span>
        </Link>
      </div>
    </header>
  );
}
