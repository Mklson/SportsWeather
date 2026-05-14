"use client";

import { useCallback, useId } from "react";
import { format, addHours, startOfHour } from "date-fns";
import { nb } from "date-fns/locale";

interface Props {
  value: Date;
  onChange: (date: Date) => void;
  rangeHours?: number;
}

export function TimeSlider({ value, onChange, rangeHours = 48 }: Props) {
  const sliderId = useId();
  const base = startOfHour(new Date());

  const currentOffset = Math.round(
    (value.getTime() - base.getTime()) / (1000 * 60 * 60)
  );
  const clampedOffset = Math.max(0, Math.min(rangeHours, currentOffset));

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange(addHours(base, Number(e.target.value)));
    },
    [base, onChange]
  );

  const handleDateInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const d = new Date(e.target.value);
      if (!isNaN(d.getTime())) onChange(d);
    },
    [onChange]
  );

  const formattedDate = format(value, "EEEE d. MMMM, HH:mm", { locale: nb });
  const inputValue = format(value, "yyyy-MM-dd'T'HH:mm");

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Starttid</span>
        <span className="text-xs text-blue-600 font-semibold capitalize">{formattedDate}</span>
      </div>

      <input
        id={sliderId}
        type="range"
        min={0}
        max={rangeHours}
        step={1}
        value={clampedOffset}
        onChange={handleChange}
        className="w-full h-1.5 rounded-full appearance-none cursor-pointer bg-gray-200 accent-blue-600"
        aria-label="Velg starttid"
      />

      <div className="flex justify-between text-xs text-gray-400">
        <span>{format(base, "d. MMM HH:mm", { locale: nb })}</span>
        <span>{format(addHours(base, rangeHours), "d. MMM HH:mm", { locale: nb })}</span>
      </div>

      <details className="text-xs text-gray-400">
        <summary className="cursor-pointer select-none hover:text-gray-600 transition-colors">
          Velg eksakt tidspunkt
        </summary>
        <input
          type="datetime-local"
          value={inputValue}
          onChange={handleDateInput}
          className="mt-2 w-full bg-white border border-gray-300 rounded-lg
                     px-3 py-1.5 text-gray-700 text-sm focus:outline-none
                     focus:ring-2 focus:ring-blue-400"
        />
      </details>
    </div>
  );
}
