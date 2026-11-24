import { NavLink } from "react-router";
import { useAccount } from "../../app/account";
import { tid } from "../../components/testid";
import { useLogoutConfirm } from "../../components/useLogoutConfirm";
import { Icon, type IconName } from "../shop/icons";
import styles from "./account.module.css";

const LINKS: { to: string; label: string; icon: IconName; testid: string }[] = [
  { to: "/shop/orders", label: "Pesanan Saya", icon: "bag", testid: "acc_nav_orders" },
  { to: "/shop/wishlist", label: "Wishlist", icon: "heart", testid: "acc_nav_wishlist" },
  { to: "/pay", label: "PracticePay", icon: "wallet", testid: "acc_nav_pay" },
  { to: "/account", label: "Profil & Alamat", icon: "user", testid: "acc_nav_profile" },
  { to: "/settings", label: "Pengaturan", icon: "settings", testid: "acc_nav_settings" },
  { to: "/help", label: "Pusat Bantuan", icon: "help", testid: "acc_nav_help" },
];

export const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("") || "?";

// Artboard "Komponen · Navigasi akun".
export function AccountNav() {
  const { account } = useAccount();
  const logout = useLogoutConfirm();
  return (
    <nav {...tid("acc_nav_menu")} aria-label="Menu akun" className={styles.nav}>
      <div className={styles.navHead}>
        <span className={styles.avatar} aria-hidden="true">
          {initials(account.name)}
        </span>
        <span className={styles.navWho}>
          <strong {...tid("acc_txt_nav_name")}>{account.name}</strong>
          <span>{account.state.profile.email}</span>
        </span>
      </div>
      {LINKS.map((l) => (
        <NavLink key={l.to} to={l.to} end className={styles.navLink} {...tid(l.testid)}>
          <Icon name={l.icon} />
          {l.label}
          {l.to === "/shop/orders" && account.activeOrders > 0 && (
            <span className={styles.navBadge} {...tid("acc_badge_orders")}>
              {account.activeOrders}
            </span>
          )}
        </NavLink>
      ))}
      <button type="button" className={styles.navLogout} {...tid("acc_nav_logout")} onClick={logout.ask}>
        Keluar
      </button>
      {logout.dialog}
    </nav>
  );
}
