import type { Address } from "../data/schema";

// PRD FR-ACC-03; kontrak §4.3 (lokasi uji).

export const formatAddress = (a: Address) =>
  [a.recipient, a.phone, `${a.street}, ${a.city}, ${a.province} ${a.postal}`].filter(Boolean).join(" · ");

export const PROVINCES: Record<string, string[]> = {
  "DKI Jakarta": ["Jakarta Pusat", "Jakarta Selatan", "Jakarta Barat", "Jakarta Timur", "Jakarta Utara"],
  "Jawa Barat": ["Bandung", "Bekasi", "Bogor", "Depok"],
  "Jawa Timur": ["Surabaya", "Malang", "Sidoarjo"],
};

export const ADDRESS_LABELS = ["Rumah", "Kantor", "Lainnya"] as const;

export const ADDRESS_TEXT = {
  required: "Wajib diisi",
  postal: "Kode pos harus 5 digit",
  phone: "Nomor HP harus 10–13 digit",
  city: "Pilih kota dari daftar",
} as const;

export type AddressForm = {
  label: string;
  recipient: string;
  phone: string;
  province: string;
  city: string;
  street: string;
  postal: string;
  isPrimary: boolean;
};

export function addressErrors(f: AddressForm): Partial<Record<keyof AddressForm, string>> {
  const e: Partial<Record<keyof AddressForm, string>> = {};
  if (!f.recipient.trim()) e.recipient = ADDRESS_TEXT.required;
  if (!/^\d{10,13}$/.test(f.phone.replace(/[\s-]/g, ""))) e.phone = ADDRESS_TEXT.phone;
  if (!PROVINCES[f.province]) e.province = ADDRESS_TEXT.required;
  else if (!PROVINCES[f.province].includes(f.city)) e.city = ADDRESS_TEXT.city;
  if (!f.street.trim()) e.street = ADDRESS_TEXT.required;
  if (!/^\d{5}$/.test(f.postal)) e.postal = ADDRESS_TEXT.postal;
  return e;
}

// Koordinat uji -6.2088, 106.8228 → DKI Jakarta, Jakarta Pusat (toleransi ±0,05°).
export const TEST_LOCATION = { lat: -6.2088, lng: 106.8228, province: "DKI Jakarta", city: "Jakarta Pusat" };

export function locate(lat: number, lng: number) {
  return Math.abs(lat - TEST_LOCATION.lat) <= 0.05 && Math.abs(lng - TEST_LOCATION.lng) <= 0.05
    ? { province: TEST_LOCATION.province, city: TEST_LOCATION.city }
    : null;
}
