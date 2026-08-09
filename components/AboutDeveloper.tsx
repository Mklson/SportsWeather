"use client";

import { useState } from "react";
import { Modal } from "@/components/Modal";
import { useLanguage } from "@/lib/i18n/LanguageProvider";

export function AboutDeveloper() {
  const [open, setOpen] = useState(false);
  const { t } = useLanguage();

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs text-gray-500 hover:text-gray-700 font-medium transition-colors"
      >
        {t.front.aboutDeveloper}
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title={t.front.aboutDeveloperTitle}>
        <p className="text-sm text-gray-600 leading-relaxed">{t.front.aboutDeveloperText}</p>
      </Modal>
    </>
  );
}
