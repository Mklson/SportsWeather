"use client";

import { useState } from "react";
import { Modal } from "@/components/Modal";
import { useLanguage } from "@/lib/i18n/LanguageProvider";

type Status = "idle" | "sending" | "sent" | "error" | "rateLimited";

interface Props {
  variant?: "icon" | "link";
}

export function FeedbackButton({ variant = "icon" }: Props) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const { t } = useLanguage();

  function handleClose() {
    setOpen(false);
    setMessage("");
    setStatus("idle");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!message.trim()) return;

    setStatus("sending");
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });
      if (res.status === 429) {
        setStatus("rateLimited");
        return;
      }
      if (!res.ok) throw new Error();
      setStatus("sent");
      setMessage("");
    } catch {
      setStatus("error");
    }
  }

  return (
    <>
      {variant === "link" ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="text-xs text-gray-500 hover:text-gray-700 font-medium transition-colors whitespace-nowrap"
        >
          💬 {t.feedback.shortLabel}
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={t.feedback.ariaLabel}
          className="text-white/80 hover:text-white transition-colors text-lg leading-none px-1"
          title={t.feedback.buttonLabel}
        >
          💬
        </button>
      )}

      <Modal open={open} onClose={handleClose} title={t.feedback.title}>
        {status === "sent" ? (
          <p className="text-sm text-gray-600">{t.feedback.sent}</p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <p className="text-sm text-gray-500">{t.feedback.intro}</p>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={t.feedback.placeholder}
              rows={5}
              required
              className="w-full rounded-xl border border-gray-200 p-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-navy resize-none"
            />
            {status === "error" && (
              <p className="text-sm text-red-600">{t.feedback.error}</p>
            )}
            {status === "rateLimited" && (
              <p className="text-sm text-red-600">{t.feedback.rateLimited}</p>
            )}
            <button
              type="submit"
              disabled={status === "sending"}
              className="w-full bg-brand-navy hover:bg-brand-navy-dark disabled:opacity-60 text-white font-medium text-sm px-4 py-2.5 rounded-xl transition-colors"
            >
              {status === "sending" ? t.feedback.sending : t.feedback.send}
            </button>
          </form>
        )}
      </Modal>
    </>
  );
}
