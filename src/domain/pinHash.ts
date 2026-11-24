// Kontrak §8.6: pbkdf2$<iterasi>$<saltHex>$<hashHex>, HMAC-SHA1, 256 bit.

const toHex = (bytes: ArrayBuffer | Uint8Array) =>
  Array.from(new Uint8Array(bytes), (b) => b.toString(16).padStart(2, "0")).join("");

export async function hashPin(
  pin: string,
  salt: Uint8Array<ArrayBuffer> = crypto.getRandomValues(new Uint8Array(16)),
  iterations = 10_000,
): Promise<string> {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(pin), "PBKDF2", false, [
    "deriveBits",
  ]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-1", salt, iterations }, key, 256);
  return `pbkdf2$${iterations}$${toHex(salt)}$${toHex(bits)}`;
}

// Iterasi & salt dibaca dari string tersimpan, bukan konstanta (kontrak §8.6).
export async function verifyPin(pin: string, stored: string): Promise<boolean> {
  const [scheme, iter, saltHex, hashHex] = stored.split("$");
  const iterations = Number(iter);
  if (scheme !== "pbkdf2" || !Number.isInteger(iterations) || iterations < 1 || !/^([0-9a-f]{2})+$/.test(saltHex ?? "") || !hashHex) {
    return false;
  }
  const salt = new Uint8Array(saltHex.match(/../g)!.map((h) => parseInt(h, 16)));
  return (await hashPin(pin, salt, iterations)) === stored;
}

// Kontrak §2 / FR-PAY-06: 3× salah → PracticePay terkunci 30 dtk (disimpan di Firestore).
export const MAX_PIN_FAILURES = 3;
export const PIN_LOCK_MS = 30_000;
