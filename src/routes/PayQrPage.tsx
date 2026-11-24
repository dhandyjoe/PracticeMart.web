import { useState } from "react";
import { Link, useSearchParams } from "react-router";
import { useAccount } from "../app/account";
import { useSession } from "../app/session";
import { tid } from "../components/testid";
import { spendBalance } from "../data/walletRepository";
import { formatRupiah } from "../domain/money";
import { MERCHANTS, parseAmount } from "../domain/payRules";
import { AccountNav } from "../features/account/AccountNav";
import account from "../features/account/account.module.css";
import { PinDialog } from "../features/checkout/PinDialog";
import styles from "../features/pay/pay.module.css";
import { errorText } from "../features/pay/TransferDialog";
import { Icon } from "../features/shop/icons";
import shop from "../features/shop/shop.module.css";

// PRD FR-PAY-10: /pay/qr?merchant=KOPIPAGI&amount=28000 mensimulasikan hasil scan → konfirmasi → PIN → "Pembayaran berhasil".
export default function PayQrPage() {
  const [params] = useSearchParams();
  const { account: acc, reloadState } = useAccount();
  const uid = useSession()!.uid;
  const merchantId = (params.get("merchant") ?? "").toUpperCase();
  const merchant = MERCHANTS[merchantId];
  // Merchant nominal tetap mengabaikan ?amount=.
  const [amount, setAmount] = useState(() => merchant?.fixed ?? parseAmount(params.get("amount") ?? ""));
  const [pin, setPin] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const tooMuch = amount > acc.state.balance;
  const pay = async () => {
    setPin(false);
    try {
      await spendBalance(uid, `Bayar QR · ${merchant.name}`, amount);
      await reloadState().catch(() => {});
      setDone(true);
    } catch (e) {
      setError(errorText(e));
    }
  };

  return (
    <div className={account.layout}>
      <AccountNav />
      <div className={account.content}>
        <h1 {...tid("pay_txt_qr_title")}>Bayar dengan QR</h1>
        {!merchant ? (
          <section className={shop.section}>
            <p role="alert" className={shop.inlineError} {...tid("pay_txt_qr_invalid")}>
              QR tidak valid
            </p>
            <Link to="/pay" className={shop.outlineBtn} {...tid("pay_link_back")}>
              Kembali ke PracticePay
            </Link>
          </section>
        ) : done ? (
          <section role="status" className={styles.done}>
            <span className={styles.doneIcon}>
              <Icon name="check" size={30} strokeWidth={2.6} />
            </span>
            <strong style={{ fontSize: 18 }} {...tid("pay_txt_qr_result")}>
              Pembayaran berhasil
            </strong>
            <span className={shop.muted}>
              {formatRupiah(amount)} ke {merchant.name}
            </span>
            <Link to="/pay" className={shop.primaryBtn} {...tid("pay_link_back")}>
              Kembali ke PracticePay
            </Link>
          </section>
        ) : (
          <section className={shop.section}>
            <div className={styles.merchant}>
              <span className={shop.muted}>Bayar ke</span>
              <strong {...tid("pay_txt_merchant")}>{merchant.name}</strong>
            </div>
            <div className={account.field}>
              <label htmlFor="pay_input_qr_amount" className={account.label}>
                Nominal
              </label>
              <input
                className={`${account.input} ${styles.amount}`}
                inputMode="numeric"
                readOnly={merchant.fixed !== null}
                aria-invalid={tooMuch}
                {...tid("pay_input_qr_amount")}
                value={amount ? formatRupiah(amount) : ""}
                onChange={(e) => setAmount(parseAmount(e.target.value))}
              />
              {tooMuch && (
                <span role="alert" className={account.error} {...tid("pay_txt_amount_error")}>
                  Saldo tidak cukup
                </span>
              )}
              {error && (
                <span role="alert" className={account.error} {...tid("pay_txt_qr_error")}>
                  {error}
                </span>
              )}
            </div>
            <button type="button" className={shop.primaryBtn} {...tid("pay_btn_qr_pay")} disabled={amount < 1 || tooMuch} onClick={() => setPin(true)}>
              Bayar {amount ? formatRupiah(amount) : ""}
            </button>
          </section>
        )}
      </div>
      {pin && <PinDialog onSuccess={() => void pay()} onClose={() => setPin(false)} />}
    </div>
  );
}
