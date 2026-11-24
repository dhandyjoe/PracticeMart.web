import { useState } from "react";
import { useAccount } from "../../app/account";
import { useSession } from "../../app/session";
import { Dialog } from "../../components/Dialog";
import { tid } from "../../components/testid";
import { CheckoutError } from "../../data/orderRepository";
import { spendBalance } from "../../data/walletRepository";
import { formatRupiah } from "../../domain/money";
import { AMOUNT_CHIPS, groupContacts, MIN_TRANSFER, NOTE_MAX, parseAmount, searchContacts, transferError, type Contact } from "../../domain/payRules";
import { notify } from "../../sim/settings";
import account from "../account/account.module.css";
import { PinDialog } from "../checkout/PinDialog";
import { Icon } from "../shop/icons";
import shop from "../shop/shop.module.css";
import styles from "./pay.module.css";

export const errorText = (e: unknown) =>
  e instanceof CheckoutError ? e.message : navigator.onLine ? "Gagal memuat, coba lagi" : "Tidak ada koneksi";

// FR-PAY-03/05/06/07: kontak (combobox) → nominal → PIN → "Transfer berhasil".
export function TransferDialog({ onClose, onDone, recent = [] }: { onClose: () => void; onDone: () => void; recent?: Contact[] }) {
  const { account: acc, reloadState } = useAccount();
  const uid = useSession()!.uid;
  const [step, setStep] = useState<"form" | "pin" | "done">("form");
  const [text, setText] = useState("");
  const [to, setTo] = useState<Contact>();
  const [amount, setAmount] = useState(0);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  const balance = acc.state.balance;
  const amountError = transferError(amount, balance);
  const blocked = !to || amount < MIN_TRANSFER || !!amountError;
  const matches = searchContacts(text);
  // Daftar A–Z selalu terbuka sampai penerima dipilih (FR-PAY-03).
  const listOpen = !to;
  const pick = (c: Contact) => {
    setTo(c);
    setText(c.name);
  };

  const pay = async () => {
    try {
      // Catatan masuk ke judul transaksi: skema transactions/ tidak berubah (kontrak §8.2, dibaca juga oleh Android).
      await spendBalance(uid, `Transfer ke ${to!.name}${note.trim() ? ` · ${note.trim()}` : ""}`, amount);
      notify(`Transfer ${formatRupiah(amount)} ke ${to!.name} berhasil`);
      await reloadState().catch(() => {});
      onDone();
      setStep("done");
    } catch (e) {
      setError(errorText(e));
      setStep("form");
    }
  };

  if (step === "pin") return <PinDialog onSuccess={() => void pay()} onClose={() => setStep("form")} />;

  if (step === "done") {
    return (
      <Dialog label="Transfer PracticePay" testid="pay_modal_transfer" onClose={onClose}>
        <div role="status" className={styles.done}>
          <span className={styles.doneIcon}>
            <Icon name="check" size={30} strokeWidth={2.6} />
          </span>
          <strong style={{ fontSize: 18 }} {...tid("pay_txt_transfer_result")}>
            Transfer berhasil
          </strong>
          <span className={shop.muted}>
            {formatRupiah(amount)} ke {to!.name}
          </span>
          {note.trim() && (
            <span className={shop.muted} {...tid("pay_txt_transfer_note")}>
              Catatan: {note.trim()}
            </span>
          )}
          <button type="button" className={shop.outlineBtn} {...tid("pay_btn_transfer_done")} onClick={onClose} data-autofocus>
            Selesai
          </button>
        </div>
      </Dialog>
    );
  }

  return (
    <Dialog label="Transfer PracticePay" testid="pay_modal_transfer" onClose={onClose}>
      <div style={{ display: "flex", alignItems: "center" }}>
        <h2 {...tid("pay_txt_transfer_title")} style={{ flex: 1, margin: 0, fontSize: 20 }}>Transfer PracticePay</h2>
        <button type="button" className={shop.iconBtn} aria-label="Tutup" {...tid("pay_btn_transfer_close")} onClick={onClose}>
          <Icon name="close" />
        </button>
      </div>

      {!to && recent.length > 0 && (
        <div className={styles.recent}>
          <span className={account.label}>Terakhir</span>
          <div className={styles.quick} {...tid("pay_list_recent_contacts")}>
            {recent.map((c) => (
              <button key={c.name} type="button" className={styles.chip} {...tid.list("pay_chip_recent_contact")} onClick={() => pick(c)}>
                {c.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className={styles.combo}>
        <label htmlFor="pay_input_recipient" className={account.label}>
          Penerima
        </label>
        <input
          className={account.input}
          role="combobox"
          aria-expanded={listOpen}
          aria-controls="pay_list_contacts"
          autoComplete="off"
          placeholder="Cari nama atau nomor HP"
          data-autofocus
          {...tid("pay_input_recipient")}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setTo(undefined);
          }}
        />
        {listOpen && (
          <ul role="listbox" className={styles.list} {...tid("pay_list_contacts")}>
            {groupContacts(matches).map(([letter, contacts]) => (
              <li key={letter} role="group" aria-label={letter}>
                <div className={styles.letter} aria-hidden="true" {...tid.list("pay_txt_contact_letter")}>
                  {letter}
                </div>
                <ul {...tid.list("pay_list_contact_group")} role="none" className={styles.group}>
                  {contacts.map((c) => (
                    <li key={c.name} role="option" aria-selected={false}>
                      <button type="button" {...tid.list("pay_item_contact")} onClick={() => pick(c)}>
                        <span>{c.name}</span>
                        <small>{c.phone}</small>
                      </button>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
            {!matches.length && (
              <li className={styles.empty} {...tid("pay_txt_no_contact")}>
                Kontak tidak ditemukan
              </li>
            )}
          </ul>
        )}
      </div>

      <div className={account.field}>
        <label htmlFor="pay_input_amount" className={account.label}>
          Nominal
        </label>
        <input
          className={`${account.input} ${styles.amount}`}
          inputMode="numeric"
          placeholder="Rp0"
          aria-invalid={!!amountError}
          {...tid("pay_input_amount")}
          value={amount ? formatRupiah(amount) : ""}
          onChange={(e) => setAmount(parseAmount(e.target.value))}
        />
        <div className={styles.quick}>
          {AMOUNT_CHIPS.map((n) => (
            <button key={n} type="button" className={styles.chip} {...tid.list("pay_chip_amount")} onClick={() => setAmount(n)}>
              {formatRupiah(n)}
            </button>
          ))}
        </div>
        {amountError && (
          <span role="alert" className={account.error} {...tid("pay_txt_amount_error")}>
            {amountError}
          </span>
        )}
        {error && (
          <span role="alert" className={account.error} {...tid("pay_txt_transfer_error")}>
            {error}
          </span>
        )}
      </div>

      <div className={account.field}>
        <label htmlFor="pay_input_transfer_note" className={account.label}>
          Catatan (opsional)
        </label>
        <input className={account.input} maxLength={NOTE_MAX} {...tid("pay_input_transfer_note")} value={note} onChange={(e) => setNote(e.target.value)} />
        <span className={shop.muted} style={{ alignSelf: "flex-end", fontSize: 12 }} {...tid("pay_txt_transfer_note_count")}>
          {note.length}/{NOTE_MAX}
        </span>
      </div>

      <button type="button" className={shop.primaryBtn} {...tid("pay_btn_transfer_next")} disabled={blocked} onClick={() => setStep("pin")}>
        Lanjut
      </button>
    </Dialog>
  );
}
