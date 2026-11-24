import { useState } from "react";
import { useAccount } from "../../app/account";
import { useSession } from "../../app/session";
import { Dialog } from "../../components/Dialog";
import { tid } from "../../components/testid";
import { topUpBalance } from "../../data/walletRepository";
import { formatRupiah } from "../../domain/money";
import { parseAmount, topUpError } from "../../domain/payRules";
import { serverFails } from "../../sim/settings";
import account from "../account/account.module.css";
import { Icon } from "../shop/icons";
import shop from "../shop/shop.module.css";
import { errorText } from "./TransferDialog";
import styles from "./pay.module.css";

// FR-PAY-02 versi sederhana: input nominal → saldo bertambah; bisa gagal sesuai "Peluang error server".
export function TopUpDialog({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const { reloadState } = useAccount();
  const uid = useSession()!.uid;
  const [amount, setAmount] = useState(0);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const amountError = amount ? topUpError(amount) : "";

  const submit = async () => {
    setError("");
    setBusy(true);
    try {
      if (serverFails()) throw new Error("server");
      await topUpBalance(uid, amount);
      await reloadState().catch(() => {});
      onDone();
      setDone(true);
    } catch (e) {
      setError(errorText(e));
    }
    setBusy(false);
  };

  if (done) {
    return (
      <Dialog label="Top Up PracticePay" testid="pay_modal_topup" onClose={onClose}>
        <div role="status" className={styles.done}>
          <span className={styles.doneIcon}>
            <Icon name="check" size={30} strokeWidth={2.6} />
          </span>
          <strong style={{ fontSize: 18 }} {...tid("pay_txt_topup_result")}>
            Top up berhasil
          </strong>
          <span className={shop.muted}>Saldo bertambah {formatRupiah(amount)}</span>
          <button type="button" className={shop.outlineBtn} {...tid("pay_btn_topup_done")} onClick={onClose} data-autofocus>
            Selesai
          </button>
        </div>
      </Dialog>
    );
  }

  return (
    <Dialog label="Top Up PracticePay" testid="pay_modal_topup" onClose={onClose}>
      <div style={{ display: "flex", alignItems: "center" }}>
        <h2 {...tid("pay_txt_topup_title")} style={{ flex: 1, margin: 0, fontSize: 20 }}>Top Up PracticePay</h2>
        <button type="button" className={shop.iconBtn} aria-label="Tutup" {...tid("pay_btn_topup_close")} onClick={onClose}>
          <Icon name="close" />
        </button>
      </div>

      <div className={account.field}>
        <label htmlFor="pay_input_topup_amount" className={account.label}>
          Nominal
        </label>
        <input
          className={`${account.input} ${styles.amount}`}
          inputMode="numeric"
          placeholder="Rp0"
          data-autofocus
          aria-invalid={!!amountError}
          {...tid("pay_input_topup_amount")}
          value={amount ? formatRupiah(amount) : ""}
          onChange={(e) => setAmount(parseAmount(e.target.value))}
        />
        {amountError && (
          <span role="alert" className={account.error} {...tid("pay_txt_topup_amount_error")}>
            {amountError}
          </span>
        )}
        {error && (
          <span role="alert" className={account.error} {...tid("pay_txt_topup_error")}>
            {error}
          </span>
        )}
      </div>

      <button type="button" className={shop.primaryBtn} {...tid("pay_btn_topup_submit")} disabled={!amount || !!amountError || busy} onClick={() => void submit()}>
        Top Up {amount ? formatRupiah(amount) : ""}
      </button>
    </Dialog>
  );
}
