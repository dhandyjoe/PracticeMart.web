import { useEffect, useState, type FormEvent } from "react";
import { useAccount } from "../app/account";
import { useSnackbar } from "../components/Snackbar";
import { tid } from "../components/testid";
import type { Address } from "../data/schema";
import { ADDRESS_LABELS, addressErrors, formatAddress, locate, PROVINCES, type AddressForm } from "../domain/address";
import { AccountNav, initials } from "../features/account/AccountNav";
import styles from "../features/account/account.module.css";
import shop from "../features/shop/shop.module.css";
import { Icon } from "../features/shop/icons";

const today = () => new Date().toISOString().slice(0, 10);

function ProfileSection() {
  const { account, saveProfile } = useAccount();
  const snackbar = useSnackbar();
  const profile = account.state.profile;
  const [form, setForm] = useState({ name: account.name || profile.name, birth: profile.birth, gender: profile.gender });
  const [saving, setSaving] = useState(false);
  const nameErr = form.name.trim() ? "" : "Nama wajib diisi";

  const save = async (e: FormEvent) => {
    e.preventDefault();
    if (nameErr || saving) return;
    setSaving(true);
    await saveProfile({ ...profile, name: form.name.trim(), birth: form.birth, gender: form.gender });
    setSaving(false);
    // PRD FR-ACC-02: toast "Profil tersimpan".
    snackbar({ text: "Profil tersimpan", testid: "acc_txt_profile_saved" });
  };

  return (
    <form {...tid("acc_form_profile")} className={styles.section} aria-labelledby="h_prof" onSubmit={(e) => void save(e)} noValidate>
      <h2 data-testid="acc_txt_profile_title" id="h_prof" style={{ margin: 0, fontSize: 17 }}>
        Profil
      </h2>
      <span className={`${styles.avatar} ${styles.bigAvatar}`}>
        <span aria-hidden="true">{initials(form.name)}</span>
      </span>

      <div className={styles.grid}>
        <div className={styles.field}>
          <label htmlFor="acc_input_name" className={styles.label}>
            Nama lengkap
          </label>
          <input
            className={styles.input}
            {...tid("acc_input_name")}
            autoComplete="name"
            value={form.name}
            aria-invalid={!!nameErr}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          />
          {nameErr && (
            <span role="alert" className={styles.error} {...tid("acc_txt_name_error")}>
              {nameErr}
            </span>
          )}
        </div>
        <div className={styles.field}>
          <label htmlFor="acc_input_email" className={styles.label}>
            Email
          </label>
          <input className={styles.input} {...tid("acc_input_email")} type="email" value={profile.email} disabled />
          <span className={styles.hint}>Email dipakai untuk masuk dan tidak bisa diubah di sini.</span>
        </div>
        <div className={styles.field}>
          <label htmlFor="acc_input_birthdate" className={styles.label}>
            Tanggal lahir
          </label>
          <input
            className={styles.input}
            {...tid("acc_input_birthdate")}
            type="date"
            min="1900-01-01"
            max={today()}
            value={form.birth}
            onChange={(e) => setForm((f) => ({ ...f, birth: e.target.value }))}
          />
        </div>
        <fieldset className={styles.radios}>
          <legend className={styles.label}>Jenis kelamin</legend>
          {[
            ["male", "Laki-laki"],
            ["female", "Perempuan"],
          ].map(([value, label]) => (
            <label key={value} className={styles.radio}>
              <input
                type="radio"
                name="gender"
                {...tid(`acc_rdo_gender_${value}`)}
                checked={form.gender === value}
                onChange={() => setForm((f) => ({ ...f, gender: value }))}
              />
              {label}
            </label>
          ))}
        </fieldset>
      </div>
      <div className={styles.row}>
        <button type="submit" className={shop.primaryBtn} {...tid("acc_btn_save_profile")} disabled={!!nameErr || saving}>
          Simpan
        </button>
      </div>
    </form>
  );
}

const emptyForm = (name: string, first: boolean): AddressForm => ({
  label: "Rumah",
  recipient: name,
  phone: "",
  province: "DKI Jakarta",
  city: "",
  street: "",
  postal: "",
  isPrimary: first,
});

function AddressFormView({ initial, editing, onDone }: { initial: AddressForm; editing: Address | null; onDone: () => void }) {
  const { update } = useAccount();
  const snackbar = useSnackbar();
  const [form, setForm] = useState(initial);
  const [submitted, setSubmitted] = useState(false);
  const [locStatus, setLocStatus] = useState("");
  const errors = addressErrors(form);
  const show = (k: keyof AddressForm) => (submitted ? errors[k] : undefined);
  const set = (patch: Partial<AddressForm>) => setForm((f) => ({ ...f, ...patch }));
  // Kode pos divalidasi langsung (artboard), lainnya setelah Simpan ditekan.
  const postalErr = form.postal && errors.postal ? errors.postal : show("postal");

  const findLocation = () => {
    if (!("geolocation" in navigator)) {
      setLocStatus("Browser tidak mendukung lokasi");
      return;
    }
    setLocStatus("Mencari lokasi…");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const found = locate(pos.coords.latitude, pos.coords.longitude);
        if (found) {
          set(found);
          setLocStatus(`Lokasi ditemukan: ${found.city}, ${found.province}`);
        } else setLocStatus("Lokasi di luar area layanan");
      },
      () => setLocStatus("Izin lokasi ditolak"),
    );
  };

  const save = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    if (Object.keys(errors).length) return;
    const saved: Address = {
      id: editing?.id ?? `addr-${Date.now()}`,
      ...form,
      recipient: form.recipient.trim(),
      street: form.street.trim(),
      phone: form.phone.replace(/[\s-]/g, ""),
    };
    await update("addresses", (list) => {
      const others = list.filter((a) => a.id !== saved.id);
      // Selalu tepat satu alamat utama.
      const primary = saved.isPrimary || !others.some((a) => a.isPrimary);
      const next = [...others.map((a) => (primary ? { ...a, isPrimary: false } : a)), { ...saved, isPrimary: primary }];
      return editing ? list.map((a) => next.find((n) => n.id === a.id)!) : next;
    });
    snackbar({ text: "Alamat tersimpan" });
    onDone();
  };

  return (
    <form className={styles.form} {...tid("addr_form")} onSubmit={(e) => void save(e)} noValidate aria-label={editing ? "Ubah alamat" : "Tambah alamat"}>
      <div className={`${styles.row} ${styles.full}`}>
        <button type="button" className={shop.outlineBtn} {...tid("addr_btn_use_location")} onClick={findLocation}>
          <Icon name="location" size={18} />
          Gunakan lokasi saat ini
        </button>
        {locStatus && (
          <span role="status" className={styles.status} {...tid("addr_txt_location_status")}>
            {locStatus}
          </span>
        )}
      </div>

      <fieldset className={`${styles.radios} ${styles.full}`}>
        <legend className={styles.label}>Label</legend>
        {ADDRESS_LABELS.map((l, i) => (
          <label key={l} className={styles.radio}>
            <input
              type="radio"
              name="addr_label"
              {...tid(`addr_rdo_label_${["home", "office", "other"][i]}`)}
              checked={form.label === l}
              onChange={() => set({ label: l })}
            />
            {l}
          </label>
        ))}
      </fieldset>

      <div className={styles.field}>
        <label htmlFor="addr_input_recipient" className={styles.label}>
          Nama penerima
        </label>
        <input className={styles.input} {...tid("addr_input_recipient")} value={form.recipient} aria-invalid={!!show("recipient")} onChange={(e) => set({ recipient: e.target.value })} />
        {show("recipient") && <span className={styles.error} {...tid("addr_txt_recipient_error")}>{show("recipient")}</span>}
      </div>
      <div className={styles.field}>
        <label htmlFor="addr_input_phone" className={styles.label}>
          No. HP
        </label>
        <input className={styles.input} {...tid("addr_input_phone")} type="tel" inputMode="tel" placeholder="0812-3456-7890" value={form.phone} aria-invalid={!!show("phone")} onChange={(e) => set({ phone: e.target.value })} />
        {show("phone") && <span className={styles.error} {...tid("addr_txt_phone_error")}>{show("phone")}</span>}
      </div>
      <div className={styles.field}>
        <label htmlFor="addr_spn_province" className={styles.label}>
          Provinsi
        </label>
        <select className={styles.input} {...tid("addr_spn_province")} value={form.province} onChange={(e) => set({ province: e.target.value, city: "" })}>
          {Object.keys(PROVINCES).map((p) => (
            <option key={p}>{p}</option>
          ))}
        </select>
      </div>
      <div className={styles.field}>
        <label htmlFor="addr_spn_city" className={styles.label}>
          Kota / Kabupaten
        </label>
        {/* Combobox autocomplete (FR-ACC-03): input + datalist sesuai provinsi. */}
        <input
          className={styles.input}
          {...tid("addr_spn_city")}
          list="addr_city_options"
          autoComplete="off"
          value={form.city}
          aria-invalid={!!show("city")}
          onChange={(e) => set({ city: e.target.value })}
        />
        <datalist id="addr_city_options">
          {PROVINCES[form.province]?.map((c) => <option key={c} value={c} />)}
        </datalist>
        {show("city") && <span className={styles.error} {...tid("addr_txt_city_error")}>{show("city")}</span>}
      </div>
      <div className={`${styles.field} ${styles.full}`}>
        <label htmlFor="addr_input_street" className={styles.label}>
          Alamat lengkap
        </label>
        <input className={styles.input} {...tid("addr_input_street")} value={form.street} aria-invalid={!!show("street")} onChange={(e) => set({ street: e.target.value })} />
        {show("street") && <span className={styles.error} {...tid("addr_txt_street_error")}>{show("street")}</span>}
      </div>
      <div className={styles.field}>
        <label htmlFor="addr_input_postal" className={styles.label}>
          Kode pos
        </label>
        <input
          className={styles.input}
          {...tid("addr_input_postal")}
          inputMode="numeric"
          value={form.postal}
          aria-invalid={!!postalErr}
          onChange={(e) => set({ postal: e.target.value.replace(/\D/g, "").slice(0, 6) })}
        />
        {postalErr && (
          <span role="alert" className={styles.error} {...tid("addr_txt_postal_error")}>
            {postalErr}
          </span>
        )}
      </div>
      <div className={`${styles.field} ${styles.row}`}>
        <button
          type="button"
          role="switch"
          className={styles.switch}
          aria-checked={form.isPrimary}
          aria-label="Jadikan alamat utama"
          {...tid("addr_sw_primary")}
          onClick={() => set({ isPrimary: !form.isPrimary })}
        />
        <span>Jadikan alamat utama</span>
      </div>
      <div className={`${styles.row} ${styles.full}`}>
        <button type="submit" className={shop.primaryBtn} {...tid("addr_btn_save")}>
          Simpan Alamat
        </button>
        <button type="button" className={shop.ghostBtn} {...tid("addr_btn_cancel")} onClick={onDone}>
          Batal
        </button>
      </div>
    </form>
  );
}

function AddressSection() {
  const { account, update } = useAccount();
  const addresses = account.state.addresses;
  const [editing, setEditing] = useState<Address | "new" | null>(null);

  // Datang dari Checkout (/account#alamat): gulir ke daftar alamat.
  useEffect(() => {
    if (location.hash === "#alamat") document.getElementById("alamat")?.scrollIntoView?.();
  }, []);

  const setPrimary = (id: string) => void update("addresses", (list) => list.map((a) => ({ ...a, isPrimary: a.id === id })));

  return (
    <section id="alamat" className={styles.section} aria-labelledby="h_addr">
      <div className={styles.sectionHead}>
        <h2 data-testid="acc_txt_address_title" id="h_addr">Daftar alamat</h2>
        <button
          type="button"
          className={shop.outlineBtn}
          {...tid("addr_btn_add")}
          onClick={() => setEditing((e) => (e === "new" ? null : "new"))}
        >
          {editing === "new" ? "Batal" : "+ Tambah alamat"}
        </button>
      </div>
      {addresses.length ? (
        <ul {...tid("acc_list_address")} className={styles.addresses}>
          {addresses.map((a) => (
            <li key={a.id} className={styles.addressCard} data-primary={a.isPrimary} {...tid.list("addr_card")}>
              <strong>
                {a.label}
                {a.isPrimary && <span className={styles.tag}>Utama</span>}
              </strong>
              <span>{formatAddress(a)}</span>
              <div className={styles.cardActions}>
                <button type="button" className={shop.outlineBtn} {...tid.list("addr_btn_edit")} onClick={() => setEditing(a)}>
                  Ubah
                </button>
                {!a.isPrimary && (
                  <button type="button" className={shop.ghostBtn} {...tid.list("addr_btn_set_default")} onClick={() => setPrimary(a.id)}>
                    Jadikan utama
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className={styles.hint} {...tid("addr_txt_empty")}>
          Belum ada alamat.
        </p>
      )}
      {editing && (
        <AddressFormView
          key={editing === "new" ? "new" : editing.id}
          editing={editing === "new" ? null : editing}
          initial={editing === "new" ? emptyForm(account.name, !addresses.length) : { ...editing }}
          onDone={() => setEditing(null)}
        />
      )}
    </section>
  );
}

export default function AccountPage() {
  return (
    <div className={styles.layout}>
      <AccountNav />
      <div className={styles.content}>
        <h1 {...tid("acc_txt_page_title")}>Profil &amp; Alamat</h1>
        <ProfileSection />
        <AddressSection />
      </div>
    </div>
  );
}
