import { Outlet } from "react-router";
import { AppHeader } from "../components/AppHeader";
import { LocatorHintOverlay } from "../components/LocatorHintOverlay";
import { SnackbarProvider } from "../components/Snackbar";
import styles from "../features/shop/shop.module.css";
import { AccountProvider } from "./account";

// Shell halaman setelah login: data akun + header + snackbar.
export function AppLayout() {
  return (
    <AccountProvider>
      <SnackbarProvider>
        <div className={styles.shell}>
          <AppHeader />
          <main className={styles.main}>
            <Outlet />
          </main>
          <footer className={styles.footer}>
            <div className={styles.footerInner}>
              <span className={styles.footerBrand}>PracticeMart</span>
              <span>Juga tersedia di aplikasi Android.</span>
            </div>
          </footer>
          <LocatorHintOverlay />
        </div>
      </SnackbarProvider>
    </AccountProvider>
  );
}
