import { describe, expect, it } from "vitest";
import { formatRupiah } from "./money";

describe("formatRupiah", () => {
  it("titik ribuan tanpa spasi", () => expect(formatRupiah(125_000)).toBe("Rp125.000"));
  it("negatif: tanda minus di depan Rp", () => expect(formatRupiah(-4_000)).toBe("-Rp4.000"));
});
