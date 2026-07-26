"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MailIcon, MapPinIcon, ClockIcon, PlusIcon } from "lucide-react";
import styles from "./Craft.module.css";

interface ContactModalProps {
  onClose: () => void;
}

const CONTACT_INFO = [
  { icon: MailIcon,    label: "Email",         value: "hello@techzilla.dev"     },
  { icon: MapPinIcon,  label: "Location",      value: "Remote / Worldwide"      },
  { icon: ClockIcon,   label: "Response Time", value: "As soon as possible"     },
];

export default function ContactModal({ onClose }: ContactModalProps) {
  const [name,    setName]    = useState("");
  const [email,   setEmail]   = useState("");
  const [message, setMessage] = useState("");
  const [sent,    setSent]    = useState(false);
  const [sending, setSending] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    setError(null);

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, message }),
      });

      if (!res.ok) {
        throw new Error("Failed to send");
      }

      setSent(true);
    } catch {
      setError("Something went wrong. Please try again or email us directly.");
    } finally {
      setSending(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        className={styles.modalOverlay}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        <motion.div
          className={styles.contactCard}
          initial={{ opacity: 0, y: 40, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.97 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        >
          {/* ── Corner + icons (exactly as ContactCard) ── */}
          <PlusIcon className={styles.ccPlusTL} />
          <PlusIcon className={styles.ccPlusTR} />
          <PlusIcon className={styles.ccPlusBL} />
          <PlusIcon className={styles.ccPlusBR} />

          <button className={styles.modalClose} onClick={onClose} aria-label="Close">✕</button>

          {/* ── Left column — title / description / contact info ── */}
          <div className={styles.ccLeft}>
            <div className={styles.ccLeftInner}>
              <h1 className={styles.ccTitle}>Contact With Us</h1>
              <p className={styles.ccDesc}>
                If you have any questions regarding our Services or need help,
                please fill out the form here. We respond as soon as possible.
              </p>
              <div className={styles.ccInfoGrid}>
                {CONTACT_INFO.map((info, i) => (
                  <div key={i} className={styles.ccInfoItem}>
                    <div className={styles.ccInfoIcon}>
                      <info.icon size={18} />
                    </div>
                    <div>
                      <p className={styles.ccInfoLabel}>{info.label}</p>
                      <p className={styles.ccInfoValue}>{info.value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── Right column — form ── */}
          <div className={styles.ccRight}>
            {sent ? (
              <div className={styles.successMsg}>
                <strong>Message received 🎉</strong>
                We&apos;ll get back to you as soon as possible. Looking forward to creating
                something extraordinary together.
              </div>
            ) : (
              <form onSubmit={handleSubmit} className={styles.ccForm}>
                <div className={styles.field}>
                  <label className={styles.fieldLabel}>Full Name</label>
                  <input
                    className={styles.fieldInput}
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your full name"
                    required
                    autoComplete="name"
                  />
                </div>
                <div className={styles.field}>
                  <label className={styles.fieldLabel}>Email Address</label>
                  <input
                    className={styles.fieldInput}
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    autoComplete="email"
                  />
                </div>
                <div className={styles.field}>
                  <label className={styles.fieldLabel}>Message</label>
                  <textarea
                    className={styles.fieldTextarea}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Describe your project, goals, or just say hello…"
                    required
                  />
                </div>
                {error && (
                  <p style={{ color: "#f12b30", fontSize: "0.78rem", margin: "0 0 8px" }}>
                    {error}
                  </p>
                )}
                <button
                  type="submit"
                  className={styles.submitBtn}
                  disabled={sending}
                >
                  {sending ? "Sending…" : "Send Message"}
                </button>
              </form>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
