import { SCHEMA_VERSION, type StateDoc, type TransactionDoc } from "./schema";

// Kontrak §4.5: data awal akun, dibundel di app, nilai sama dengan Android.
// shortcut: id alamat & phone belum ditetapkan kontrak; samakan dengan Android bila sudah ada.

const jakarta = (isoLocal: string) => Date.parse(`${isoLocal}:00+07:00`);

export const INITIAL_PIN = "123456";

export const INITIAL_TRANSACTIONS: TransactionDoc[] = [
  { id: "8", title: "Top Up dari BCA", amount: 300_000, at: jakarta("2026-01-15T09:12") },
  { id: "7", title: "Belanja PracticeMart", amount: -86_000, at: jakarta("2026-01-15T08:47") },
  { id: "6", title: "Transfer ke Budi Santoso", amount: -150_000, at: jakarta("2026-01-14T19:30") },
  { id: "5", title: "Cashback belanja", amount: 4_300, at: jakarta("2026-01-14T12:05") },
  { id: "4", title: "Bayar QR · Kopi Pagi", amount: -28_000, at: jakarta("2026-01-14T07:58") },
  { id: "3", title: "Terima dari Citra Dewi", amount: 75_000, at: jakarta("2026-01-13T20:14") },
  { id: "2", title: "Belanja PracticeMart", amount: -158_000, at: jakarta("2026-01-13T10:02") },
  { id: "1", title: "Top Up dari Mandiri", amount: 500_000, at: jakarta("2026-01-12T18:40") },
];

export const initialState = (name: string, email: string, pinHash: string): StateDoc => ({
  profile: { name, email, birth: "", gender: "", photoUri: "" },
  balance: 500_000,
  pinHash,
  pinFailures: 0,
  pinLockedUntil: 0,
  voucher: null,
  cart: [],
  wishlist: ["P001", "P010", "P002", "P020"],
  history: ["sepatu lari", "headphone", "buku catatan", "smartwatch"],
  addresses: [
    {
      id: "home",
      label: "Rumah",
      recipient: name,
      phone: "",
      province: "Jawa Barat",
      city: "Bandung",
      street: "Jl. Merdeka No. 10",
      postal: "40111",
      isPrimary: true,
    },
    {
      id: "office",
      label: "Kantor",
      recipient: name,
      phone: "",
      province: "DKI Jakarta",
      city: "Jakarta Pusat",
      street: "Jl. Sudirman No. 1",
      postal: "10220",
      isPrimary: false,
    },
  ],
  orderSeq: 0,
  schemaVersion: SCHEMA_VERSION,
});
