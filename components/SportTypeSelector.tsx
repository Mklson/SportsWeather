"use client";

import type { SportType } from "@/types";
import { SPORT_CONFIGS } from "@/types";
import clsx from "clsx";

interface Props {
  value: SportType;
  onChange: (sport: SportType) => void;
}

export function SportTypeSelector({ value, onChange }: Props) {
  return (
    <div className="flex gap-1 bg-gray-100 rounded-xl p-1 border border-gray-200">
      {SPORT_CONFIGS.map((s) => (
        <button
          key={s.type}
          onClick={() => onChange(s.type)}
          className={clsx(
            "flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg",
            "text-sm font-medium transition-all duration-150",
            value === s.type
              ? "bg-white text-blue-900 shadow-sm border border-gray-200"
              : "text-gray-500 hover:text-gray-800"
          )}
        >
          <span>{s.emoji}</span>
          <span className="hidden sm:inline">{s.label}</span>
        </button>
      ))}
    </div>
  );
}
