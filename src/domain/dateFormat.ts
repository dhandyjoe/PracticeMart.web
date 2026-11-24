// Semua waktu ditampilkan Asia/Jakarta (kontrak §5).
const TZ = "Asia/Jakarta";
const fmt = (o: Intl.DateTimeFormatOptions, locale = "id-ID") => new Intl.DateTimeFormat(locale, { timeZone: TZ, ...o });

const day = fmt({ day: "numeric", month: "short", year: "numeric" });
const clock = fmt({ hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" }, "sv-SE");
const stamp = fmt({ year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }, "sv-SE");

export const formatDay = (ms: number) => day.format(ms); // 15 Jan 2026
export const formatClock = (ms: number) => clock.format(ms); // 09:41:02
export const formatStamp = (ms: number) => stamp.format(ms); // 2026-01-15 09:12
