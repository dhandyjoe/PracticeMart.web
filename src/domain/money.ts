export const formatRating = (r: number) => r.toFixed(1).replace(".", ",");

// Kontrak §2: "Rp125.000", titik ribuan, tanpa spasi setelah Rp.
export const formatRupiah = (n: number) => `${n < 0 ? "-" : ""}Rp${Math.abs(Math.trunc(n)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`;
