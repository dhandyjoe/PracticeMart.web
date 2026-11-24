import { doc, getDoc, runTransaction } from "firebase/firestore";
import { initialStock } from "./catalog";
import { db } from "./firebase";
import { parseStock, SCHEMA_VERSION, type Stock, type StockDoc } from "./schema";

const stockRef = () => doc(db, "catalog", "stock");

// Kontrak §8.3: client pertama yang membutuhkan stok membuat catalog/stock dari stok awal,
// di dalam transaksi (create hanya bila belum ada). Dokumen yang sudah ada tidak pernah ditulis ulang utuh.
async function loadStock(): Promise<Stock> {
  const snap = await getDoc(stockRef());
  if (snap.exists()) return parseStock(snap.data());
  return runTransaction(db, async (tx) => {
    const current = await tx.get(stockRef());
    if (current.exists()) return parseStock(current.data());
    const created: StockDoc = { stock: initialStock(), schemaVersion: SCHEMA_VERSION };
    tx.set(stockRef(), created);
    return created.stock;
  });
}

// Satu read per tab (kontrak §8.2, kuota §9); Detail Produk memanggil refreshStock untuk stok segar.
let cache: Promise<Stock> | undefined;

export function getStock(): Promise<Stock> {
  cache ??= loadStock().catch((e) => {
    cache = undefined;
    throw e;
  });
  return cache;
}

export function refreshStock(): Promise<Stock> {
  cache = undefined;
  return getStock();
}
