import { useEffect, useRef, type ReactNode } from "react";
import styles from "./Dialog.module.css";
import { tid } from "./testid";

// design §14.3 Modal: scrim, Esc & klik scrim menutup (kecuali `persistent`), fokus terkunci.
export function Dialog({
  label,
  testid,
  onClose,
  persistent = false,
  role = "dialog",
  wide = false,
  children,
}: {
  label: string;
  testid: string;
  onClose: () => void;
  persistent?: boolean;
  role?: "dialog" | "alertdialog";
  wide?: boolean;
  children: ReactNode;
}) {
  const box = useRef<HTMLDivElement>(null);
  const close = useRef(onClose);
  useEffect(() => {
    close.current = onClose;
  });

  useEffect(() => {
    const el = box.current!;
    const previous = document.activeElement as HTMLElement | null;
    (el.querySelector<HTMLElement>("[data-autofocus]") ?? el.querySelector<HTMLElement>("input, button, select, iframe"))?.focus();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !persistent) close.current();
      if (e.key !== "Tab") return;
      const items = [...el.querySelectorAll<HTMLElement>("button:not(:disabled), input:not(:disabled), select, iframe, a[href]")];
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      const inside = el.contains(document.activeElement);
      if (e.shiftKey && (!inside || document.activeElement === first)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (!inside || document.activeElement === last)) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      previous?.focus?.();
    };
  }, [persistent]);

  return (
    <div className={styles.scrim} onMouseDown={(e) => !persistent && e.target === e.currentTarget && onClose()}>
      <div
        ref={box}
        role={role}
        aria-modal="true"
        aria-label={label}
        className={`${styles.box} ${wide ? styles.wide : ""}`}
        {...tid(testid)}
      >
        {children}
      </div>
    </div>
  );
}

// Konfirmasi tindakan (Keluar, reset pengaturan) — design §14.4: modal, bukan window.confirm.
export function ConfirmDialog({
  title,
  message,
  confirmLabel,
  testid,
  danger = false,
  onConfirm,
  onCancel,
}: {
  title: string;
  message: string;
  confirmLabel: string;
  testid: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Dialog label={title} testid={testid} role="alertdialog" onClose={onCancel}>
      <h2 {...tid(`${testid}_title`)} className={styles.title}>{title}</h2>
      <p className={styles.message}>{message}</p>
      <div className={styles.actions}>
        <button type="button" className={styles.secondary} {...tid(`${testid}_cancel`)} onClick={onCancel} data-autofocus>
          Batal
        </button>
        <button type="button" className={danger ? styles.danger : styles.primary} {...tid(`${testid}_confirm`)} onClick={onConfirm}>
          {confirmLabel}
        </button>
      </div>
    </Dialog>
  );
}
