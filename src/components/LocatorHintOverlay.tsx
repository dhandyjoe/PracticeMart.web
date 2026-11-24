import { useEffect, useState } from "react";
import { useSettings } from "../sim/useSettings";

type Hint = { key: string; text: string; top: number; left: number };

const MAX_HINTS = 300;

function collect(): Hint[] {
  const hints: Hint[] = [];
  for (const el of document.querySelectorAll<HTMLElement>("[data-testid]")) {
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height || r.bottom < 0 || r.top > innerHeight || r.right < 0 || r.left > innerWidth) continue;
    hints.push({ key: `${hints.length}`, text: el.dataset.testid!, top: Math.max(0, r.top), left: Math.max(0, r.right) });
    if (hints.length >= MAX_HINTS) break;
  }
  return hints;
}

// DEV-03 / design §4.20: label data-testid di pojok kanan atas elemen; hanya saat opsi ON.
export function LocatorHintOverlay() {
  const { dev } = useSettings();
  const [hints, setHints] = useState<Hint[]>([]);

  useEffect(() => {
    if (!dev.locatorHint) return;
    const update = () => setHints(collect());
    update();
    const t = setInterval(update, 500);
    addEventListener("scroll", update, true);
    addEventListener("resize", update);
    return () => {
      clearInterval(t);
      removeEventListener("scroll", update, true);
      removeEventListener("resize", update);
      setHints([]);
    };
  }, [dev.locatorHint]);

  if (!dev.locatorHint) return null;
  return (
    <div aria-hidden="true" style={{ position: "fixed", inset: 0, zIndex: 100, pointerEvents: "none" }}>
      {hints.map((h) => (
        <span
          key={h.key}
          style={{
            position: "absolute",
            top: h.top,
            left: h.left,
            transform: "translate(-100%, 0)",
            padding: "1px 4px",
            borderRadius: 4,
            background: "var(--pm-hint-bg)",
            color: "var(--pm-hint-fg)",
            font: "600 10px/1.3 var(--pm-font-mono)",
            whiteSpace: "nowrap",
          }}
        >
          {h.text}
        </span>
      ))}
    </div>
  );
}
