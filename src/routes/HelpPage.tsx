import { useEffect, useRef, useState, type FormEvent } from "react";
import { useSnackbar } from "../components/Snackbar";
import { tid } from "../components/testid";
import styles from "../features/account/account.module.css";
import { Icon } from "../features/shop/icons";
import shop from "../features/shop/shop.module.css";

export const CS_PHONE = "1500123";

// PRD FR-HELP-03: tombol "Chat dengan CS" di halaman induk.
function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<{ me: boolean; text: string }[]>([
    { me: false, text: "Halo! Ada yang bisa kami bantu soal pesananmu?" },
  ]);
  const [text, setText] = useState("");

  const send = (e: FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    setMessages((m) => [...m, { me: true, text: text.trim() }]);
    setText("");
  };

  return (
    <div className={styles.chatDock}>
      {open && (
        <div role="dialog" aria-label="Chat dengan CS" className={styles.chat} {...tid("help_widget_chat")}>
          <h2 {...tid("help_txt_chat_title")} className={styles.chatHead}>CS PracticeMart</h2>
          <ul {...tid("help_list_chat")} className={styles.chatBody} aria-live="polite">
            {messages.map((m, i) => (
              <li key={i} className={styles.bubble} data-me={m.me} {...tid.list("help_item_chat_message")}>
                {m.text}
              </li>
            ))}
          </ul>
          <form {...tid("help_form_chat")} className={styles.chatForm} onSubmit={send}>
            <label htmlFor="help_input_chat" className={styles.srOnly}>
              Tulis pesan
            </label>
            <input {...tid("help_input_chat")} placeholder="Tulis pesan…" autoComplete="off" value={text} onChange={(e) => setText(e.target.value)} />
            <button type="submit" className={shop.primaryBtn} {...tid("help_btn_chat_send")}>
              Kirim
            </button>
          </form>
        </div>
      )}
      <button type="button" className={styles.chatBtn} aria-expanded={open} {...tid("help_btn_chat")} onClick={() => setOpen((o) => !o)}>
        <Icon name="chat" size={18} />
        {open ? "Tutup chat" : "Chat dengan CS"}
      </button>
    </div>
  );
}

// PRD FR-HELP-01: FAQ di iframe same-origin (/help/faq.html); "Hubungi kami" mengirim postMessage → toast.
export default function HelpPage() {
  const frame = useRef<HTMLIFrameElement>(null);
  const snackbar = useSnackbar();

  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== location.origin || e.source !== frame.current?.contentWindow) return;
      if ((e.data as { type?: string } | null)?.type === "contact") {
        snackbar({ text: "Menghubungkan ke CS PracticeMart…", testid: "help_txt_contact_toast" });
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [snackbar]);

  return (
    <div className={shop.pageTight}>
      <section className={styles.hero}>
        <h1 {...tid("help_txt_title")}>Halo, ada yang bisa kami bantu?</h1>
      </section>
      <div className={styles.helpLayout}>
        <iframe ref={frame} className={styles.faqFrame} src="/help/faq.html" title="Pertanyaan populer" {...tid("help_frame_faq")} />
        <aside className={styles.section} aria-labelledby="h_contact">
          <h2 data-testid="help_txt_contact_title" id="h_contact" style={{ margin: 0, fontSize: 17 }}>
            Hubungi kami
          </h2>
          <div className={styles.contactList}>
            <a href={`tel:${CS_PHONE}`} {...tid("help_link_phone")}>
              Telepon CS {CS_PHONE}
            </a>
            <span className={styles.hint}>Setiap hari 08.00–20.00 WIB</span>
            <a href="/terms" target="_blank" rel="noopener" {...tid("help_link_terms")}>
              Syarat &amp; Ketentuan
            </a>
          </div>
        </aside>
      </div>
      <ChatWidget />
    </div>
  );
}
