import { useState } from "react";
import { logout } from "../data/authRepository";
import { ConfirmDialog } from "./Dialog";

// PRD FR-ACC-01: Keluar dengan modal konfirmasi. Dipakai header & navigasi akun.
export function useLogoutConfirm() {
  const [open, setOpen] = useState(false);
  const dialog = open && (
    <ConfirmDialog
      title="Keluar dari akun?"
      message="Kamu perlu masuk lagi untuk berbelanja. Keranjang tetap tersimpan di akunmu."
      confirmLabel="Keluar"
      testid="acc_dialog_logout"
      danger
      onCancel={() => setOpen(false)}
      onConfirm={() => {
        setOpen(false);
        void logout();
      }}
    />
  );
  return { ask: () => setOpen(true), dialog };
}
