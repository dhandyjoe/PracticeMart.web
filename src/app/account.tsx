import { createContext, use, useCallback, useEffect, useState, type ReactNode } from "react";
import { tid } from "../components/testid";
import { AUTH_TEXT, getDisplayName, updateDisplayName } from "../data/authRepository";
import type { StateDoc, Stock } from "../data/schema";
import { countActiveOrders } from "../data/orderRepository";
import { getState, updateStateField, type EditableField } from "../data/stateRepository";
import { getStock, refreshStock } from "../data/stockRepository";
import styles from "../features/shop/shop.module.css";
import { useSession } from "./session";

export type Account = { name: string; state: StateDoc; stock: Stock; activeOrders: number };

type AccountContext = {
  account: Account;
  // Architecture §7.6: baca ulang states/{uid} saat halaman dibuka (tanpa realtime).
  reloadState: () => Promise<void>;
  update: <K extends EditableField>(field: K, change: (current: StateDoc[K]) => StateDoc[K]) => Promise<StateDoc>;
  refreshStock: () => Promise<Stock>;
  // Nama tampilan disimpan di users/{uid} (sapaan web & Android) dan profile.name di states/{uid}.
  saveProfile: (profile: StateDoc["profile"]) => Promise<void>;
};

const Context = createContext<AccountContext | null>(null);

export function useAccount(): AccountContext {
  const ctx = use(Context);
  if (!ctx) throw new Error("useAccount dipakai di luar AccountProvider");
  return ctx;
}

// Dipasang di bawah RequireAuth, jadi sesi pasti ada.
export function AccountProvider({ children }: { children: ReactNode }) {
  const uid = useSession()!.uid;
  const [account, setAccount] = useState<Account>();
  const [failed, setFailed] = useState(false);

  const load = useCallback(async () => {
    try {
      const [name, state, stock] = await Promise.all([getDisplayName(uid), getState(uid), getStock()]);
      setAccount({ name, state, stock, activeOrders: 0 });
      // Badge saja: gagal hitung tidak boleh menggagalkan halaman.
      countActiveOrders(uid).then((n) => setAccount((a) => a && { ...a, activeOrders: n }), () => {});
    } catch {
      setFailed(true);
    }
  }, [uid]);

  useEffect(() => {
    void load();
  }, [load]);

  // Stabil (useCallback) agar halaman bisa memakainya sebagai dependensi effect.
  const reloadState = useCallback(async () => {
    const state = await getState(uid);
    setAccount((a) => a && { ...a, state });
    // Pesanan berubah lewat checkout/status/batal yang semuanya memanggil reloadState.
    countActiveOrders(uid).then((n) => setAccount((a) => a && { ...a, activeOrders: n }), () => {});
  }, [uid]);

  // Tanpa realtime (D6): perubahan dari Android dibaca ulang saat tab kembali aktif.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") void reloadState().catch(() => {});
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [reloadState]);

  const update = useCallback(
    async <K extends EditableField>(field: K, change: (current: StateDoc[K]) => StateDoc[K]) => {
      // Tulisan ditolak server (mis. rules): samakan lagi tampilan dengan data di cloud.
      const state = await updateStateField(uid, field, change, () => void reloadState().catch(() => {}));
      setAccount((a) => a && { ...a, state });
      return state;
    },
    [uid, reloadState],
  );

  const reloadStock = useCallback(async () => {
    const stock = await refreshStock();
    setAccount((a) => a && { ...a, stock });
    return stock;
  }, []);

  const saveProfile = useCallback(
    async (profile: StateDoc["profile"]) => {
      await Promise.all([update("profile", () => profile), updateDisplayName(uid, profile.name)]);
      setAccount((a) => a && { ...a, name: profile.name });
    },
    [uid, update],
  );

  if (failed) {
    return (
      <div className={styles.loadError} role="alert">
        <p {...tid("shop_txt_load_error")}>{AUTH_TEXT.failed}</p>
        <button
          type="button"
          className={styles.primaryBtn}
          {...tid("shop_btn_retry")}
          onClick={() => {
            setFailed(false);
            void load();
          }}
        >
          Coba lagi
        </button>
      </div>
    );
  }
  if (!account) return null;
  return (
    <Context value={{ account, reloadState, update, refreshStock: reloadStock, saveProfile }}>{children}</Context>
  );
}
