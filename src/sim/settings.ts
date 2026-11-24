// Kontrak §5 (Developer Options) & architecture D9: semua disimpan per browser di localStorage.
// Hanya modul ini yang membaca/menulis kunci-kunci ini.

export const DEV_DEFAULTS = {
  deterministic: false,
  latency: 1 as 0 | 1 | 2 | 3,
  animations: true,
  errorRate: 0 as 0 | 30 | 50,
  vaTimeout: "15m" as "30s" | "2m" | "15m",
  orderInterval: "10" as "3" | "10" | "30" | "manual",
  locatorHint: false,
};
export type DevSettings = typeof DEV_DEFAULTS;

export const PREF_DEFAULTS = {
  language: "id" as "id" | "en",
  theme: "system" as "system" | "light" | "dark",
  orderNotifications: true,
};
export type Preferences = typeof PREF_DEFAULTS;

export const DEV_KEYS = {
  deterministic: "pm.dev.deterministic",
  latency: "pm.dev.latency",
  animations: "pm.dev.animations",
  errorRate: "pm.dev.errorRate",
  vaTimeout: "pm.dev.vaTimeout",
  orderInterval: "pm.dev.orderInterval",
  locatorHint: "pm.dev.locatorHint",
} as const satisfies Record<keyof DevSettings, string>;

export const PREF_KEYS = {
  language: "pm.pref.language",
  theme: "pm.pref.theme",
  orderNotifications: "pm.pref.orderNotifications",
} as const satisfies Record<keyof Preferences, string>;

const OPTIONS = {
  latency: [0, 1, 2, 3],
  errorRate: [0, 30, 50],
  vaTimeout: ["30s", "2m", "15m"],
  orderInterval: ["3", "10", "30", "manual"],
  language: ["id", "en"],
  theme: ["system", "light", "dark"],
} as const;

type Store = Record<string, unknown>;

// Nilai tersimpan yang rusak/tidak dikenal → default.
function read<T extends Store>(defaults: T, keys: Record<keyof T, string>): T {
  const out = { ...defaults };
  for (const k of Object.keys(defaults) as (keyof T & string)[]) {
    const raw = localStorage.getItem(keys[k]);
    if (raw === null) continue;
    const d = defaults[k];
    if (typeof d === "boolean") {
      if (raw === "1" || raw === "0") out[k] = (raw === "1") as T[typeof k];
    } else {
      const v = typeof d === "number" ? Number(raw) : raw;
      if ((OPTIONS[k as keyof typeof OPTIONS] as readonly unknown[]).includes(v)) out[k] = v as T[typeof k];
    }
  }
  return out;
}

function write<T extends Store>(keys: Record<keyof T, string>, patch: Partial<T>) {
  for (const [k, v] of Object.entries(patch)) {
    localStorage.setItem(keys[k as keyof T], typeof v === "boolean" ? (v ? "1" : "0") : String(v));
  }
  window.dispatchEvent(new Event(SETTINGS_EVENT));
}

// Komponen yang bergantung pada pengaturan mendengarkan event ini.
export const SETTINGS_EVENT = "pm-settings";

export const readDevSettings = () => read(DEV_DEFAULTS, DEV_KEYS);
export const writeDevSettings = (patch: Partial<DevSettings>) => write(DEV_KEYS, patch);
export const readPreferences = () => read(PREF_DEFAULTS, PREF_KEYS);
export const writePreferences = (patch: Partial<Preferences>) => write(PREF_KEYS, patch);

// Kontrak §5 "Reset pengaturan": hanya pengaturan browser, tidak menyentuh data cloud.
export function resetSettings() {
  for (const key of [...Object.values(DEV_KEYS), ...Object.values(PREF_KEYS)]) localStorage.removeItem(key);
  window.dispatchEvent(new Event(SETTINGS_EVENT));
}

export const isDeterministic = () => readDevSettings().deterministic;

// FR-PAYM-14 / FR-PAY-07: notifikasi browser bila diizinkan & preferensi "Notifikasi pesanan" aktif.
export function notify(text: string) {
  if (readPreferences().orderNotifications && typeof Notification !== "undefined" && Notification.permission === "granted") {
    new Notification(text);
  }
}

export const VA_TIMEOUT_MS: Record<DevSettings["vaTimeout"], number> = { "30s": 30_000, "2m": 120_000, "15m": 900_000 };

// Architecture §9: overlay pembayaran ±2 dtk × latency.
export const processingDelayMs = () => 2_000 * readDevSettings().latency;

// Kontrak §5 "Peluang error server" (Cek Status VA, Top Up): deterministik → permintaan ke-1 gagal, ke-2 berhasil, dst.
let serverCalls = 0;
export function serverFails(): boolean {
  const { errorRate, deterministic } = readDevSettings();
  if (!errorRate) return false;
  return deterministic ? serverCalls++ % 2 === 0 : Math.random() * 100 < errorRate;
}

export const URL_HOOK_KEYS = ["deterministic", "latency", "animations", "flaky", "va", "interval", "hint"];
export const hasUrlHooks = (params: URLSearchParams) => URL_HOOK_KEYS.some((k) => params.has(k));

// DEV-02: /settings?deterministic=true&latency=0&animations=false&flaky=0 (juga va, interval, hint).
// Mengembalikan true bila ada parameter yang dikenali.
export function applyUrlHooks(params: URLSearchParams): boolean {
  const patch: Partial<DevSettings> = {};
  const bool = (v: string | null) => (v === "true" || v === "1" ? true : v === "false" || v === "0" ? false : undefined);
  const set = <K extends keyof DevSettings>(k: K, v: unknown, allowed: readonly unknown[]) => {
    if (v !== undefined && allowed.includes(v)) patch[k] = v as DevSettings[K];
  };
  set("deterministic", bool(params.get("deterministic")), [true, false]);
  set("animations", bool(params.get("animations")), [true, false]);
  set("locatorHint", bool(params.get("hint")), [true, false]);
  set("latency", params.has("latency") ? Number(params.get("latency")) : undefined, OPTIONS.latency);
  set("errorRate", params.has("flaky") ? Number(params.get("flaky")) : undefined, OPTIONS.errorRate);
  set("vaTimeout", params.get("va") ?? undefined, OPTIONS.vaTimeout);
  set("orderInterval", params.get("interval") ?? undefined, OPTIONS.orderInterval);
  if (!Object.keys(patch).length) return false;
  writeDevSettings(patch);
  return true;
}

// Terapkan bahasa, tema, dan animasi ke <html> (dipanggil saat start & setiap pengaturan berubah).
export function applyDocumentSettings() {
  const prefs = readPreferences();
  const dev = readDevSettings();
  const root = document.documentElement;
  root.lang = prefs.language;
  if (prefs.theme === "system") delete root.dataset.theme;
  else root.dataset.theme = prefs.theme;
  root.dataset.animations = dev.animations ? "on" : "off";
}
