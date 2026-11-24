import { createContext, use, useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Link } from "react-router";
import styles from "./Snackbar.module.css";
import { tid } from "./testid";

// design §14.3: snackbar web, auto-hide 4 dtk, satu aksi ("Lihat" / "Urungkan").
export const SNACKBAR_MS = 4_000;

type Action = { label: string; testid: string } & ({ to: string } | { onClick: () => void });
type Message = { text: string; testid?: string; action?: Action };

const Context = createContext<(m: Message) => void>(() => {});
export const useSnackbar = () => use(Context);

export function SnackbarProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState<Message & { id: number }>();
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const show = useCallback((m: Message) => {
    clearTimeout(timer.current);
    setMessage({ ...m, id: Date.now() });
    timer.current = setTimeout(() => setMessage(undefined), SNACKBAR_MS);
  }, []);

  useEffect(() => () => clearTimeout(timer.current), []);

  const close = () => {
    clearTimeout(timer.current);
    setMessage(undefined);
  };
  const action = message?.action;

  return (
    <Context value={show}>
      {children}
      <div className={styles.region} role="status" aria-live="polite">
        {message && (
          <div key={message.id} className={styles.snackbar} {...tid(message.testid ?? "shop_snackbar")}>
            <span {...tid("shop_txt_snackbar")}>{message.text}</span>
            {action &&
              ("to" in action ? (
                <Link to={action.to} className={styles.action} onClick={close} {...tid(action.testid)}>
                  {action.label}
                </Link>
              ) : (
                <button
                  type="button"
                  className={styles.action}
                  {...tid(action.testid)}
                  onClick={() => {
                    close();
                    action.onClick();
                  }}
                >
                  {action.label}
                </button>
              ))}
          </div>
        )}
      </div>
    </Context>
  );
}
