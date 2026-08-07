"use client";

import { useEffect } from "react";
import { useLanguage } from "@/lib/i18n/LanguageProvider";

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  widthClassName?: string;
}

export function Modal({ open, onClose, title, children, widthClassName = "max-w-md" }: Props) {
  const { t } = useLanguage();
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
      onClick={onClose}
    >
      <div
        className={`w-full ${widthClassName} max-h-[85vh] overflow-y-auto bg-white rounded-2xl shadow-2xl p-5 transition-[max-width] duration-200`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-gray-900 text-base">{title}</h2>
          <button
            onClick={onClose}
            aria-label={t.common.close}
            className="text-gray-400 hover:text-gray-700 text-2xl leading-none px-1"
          >
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
