import { useEffect, useState } from "react";
import { readDevSettings, readPreferences, SETTINGS_EVENT } from "./settings";

// Pengaturan browser terbaru; ikut berubah saat ditulis dari halaman mana pun.
export function useSettings() {
  const [value, setValue] = useState(() => ({ dev: readDevSettings(), prefs: readPreferences() }));
  useEffect(() => {
    const refresh = () => setValue({ dev: readDevSettings(), prefs: readPreferences() });
    window.addEventListener(SETTINGS_EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(SETTINGS_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);
  return value;
}
