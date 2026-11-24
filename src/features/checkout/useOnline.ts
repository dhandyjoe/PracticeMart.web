import { useSyncExternalStore } from "react";

// FR-PAYM-15: navigator.onLine + event online/offline.
const subscribe = (cb: () => void) => {
  window.addEventListener("online", cb);
  window.addEventListener("offline", cb);
  return () => {
    window.removeEventListener("online", cb);
    window.removeEventListener("offline", cb);
  };
};

export const useOnline = () => useSyncExternalStore(subscribe, () => navigator.onLine);
