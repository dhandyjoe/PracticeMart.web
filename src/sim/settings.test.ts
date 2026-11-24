// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import {
  applyDocumentSettings,
  applyUrlHooks,
  DEV_DEFAULTS,
  DEV_KEYS,
  isDeterministic,
  PREF_DEFAULTS,
  processingDelayMs,
  readDevSettings,
  readPreferences,
  resetSettings,
  serverFails,
  SETTINGS_EVENT,
  writeDevSettings,
  writePreferences,
} from "./settings";

describe("settings (kontrak §5)", () => {
  it("default kontrak bila belum ada", () => {
    expect(readDevSettings()).toEqual(DEV_DEFAULTS);
    expect(DEV_DEFAULTS).toMatchObject({ latency: 1, errorRate: 0, vaTimeout: "15m", orderInterval: "10", animations: true });
    expect(readPreferences()).toEqual(PREF_DEFAULTS);
  });

  it("tulis → baca, event dikirim", () => {
    const listener = vi.fn();
    window.addEventListener(SETTINGS_EVENT, listener);
    writeDevSettings({ deterministic: true, latency: 0, vaTimeout: "30s" });
    writePreferences({ theme: "dark", orderNotifications: false });
    expect(readDevSettings()).toMatchObject({ deterministic: true, latency: 0, vaTimeout: "30s" });
    expect(readPreferences()).toMatchObject({ theme: "dark", orderNotifications: false });
    expect(isDeterministic()).toBe(true);
    expect(processingDelayMs()).toBe(0);
    expect(listener).toHaveBeenCalledTimes(2);
    window.removeEventListener(SETTINGS_EVENT, listener);
  });

  it("nilai rusak → default", () => {
    localStorage.setItem(DEV_KEYS.latency, "7");
    localStorage.setItem(DEV_KEYS.deterministic, "yes");
    localStorage.setItem(DEV_KEYS.vaTimeout, "1h");
    expect(readDevSettings()).toMatchObject({ latency: 1, deterministic: false, vaTimeout: "15m" });
    expect(processingDelayMs()).toBe(2_000);
  });

  it("reset hanya pengaturan", () => {
    writeDevSettings({ latency: 3 });
    localStorage.setItem("pm.rememberEmail", "rina@mail.com");
    resetSettings();
    expect(readDevSettings().latency).toBe(1);
    expect(localStorage.getItem("pm.rememberEmail")).toBe("rina@mail.com");
  });

  it("URL hook DEV-02", () => {
    expect(applyUrlHooks(new URLSearchParams("foo=1"))).toBe(false);
    expect(
      applyUrlHooks(new URLSearchParams("deterministic=true&latency=0&animations=false&flaky=0&va=30s&interval=manual&hint=1")),
    ).toBe(true);
    expect(readDevSettings()).toEqual({
      deterministic: true,
      latency: 0,
      animations: false,
      errorRate: 0,
      vaTimeout: "30s",
      orderInterval: "manual",
      locatorHint: true,
    });
    // Nilai tak dikenal diabaikan.
    expect(applyUrlHooks(new URLSearchParams("latency=9&flaky=10&deterministic=maybe"))).toBe(false);
  });

  it("applyDocumentSettings: lang, tema, animasi", () => {
    writePreferences({ language: "en", theme: "dark" });
    writeDevSettings({ animations: false });
    applyDocumentSettings();
    const root = document.documentElement;
    expect(root.lang).toBe("en");
    expect(root.dataset.theme).toBe("dark");
    expect(root.dataset.animations).toBe("off");
    writePreferences({ theme: "system" });
    applyDocumentSettings();
    expect(root.dataset.theme).toBeUndefined();
  });
});

describe("serverFails (kontrak §5 Peluang error server)", () => {
  it("0% tidak pernah gagal; deterministik: gagal, berhasil, gagal, …; acak memakai peluang", () => {
    writeDevSettings({ errorRate: 0, deterministic: true });
    expect([serverFails(), serverFails()]).toEqual([false, false]);

    writeDevSettings({ errorRate: 30 });
    const first = serverFails();
    expect([serverFails(), serverFails(), serverFails()]).toEqual([!first, first, !first]);

    writeDevSettings({ errorRate: 50, deterministic: false });
    const random = vi.spyOn(Math, "random").mockReturnValue(0.49);
    expect(serverFails()).toBe(true);
    random.mockReturnValue(0.5);
    expect(serverFails()).toBe(false);
    random.mockRestore();
  });
});
