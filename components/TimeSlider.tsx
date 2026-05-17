"use client";

import { useCallback, useId, useMemo } from "react";
import { format, addHours, startOfHour } from "date-fns";
import { enUS } from "date-fns/locale";

interface Props {
  value: Date;
  onChange: (date: Date) => void;
  rangeHours?: number;
}

export function TimeSlider({ value, onChange, rangeHours = 48 }: Props) {
  const sliderId = useId();
  // Stable reference within the same hour so handleChange doesn't recreate every render.
  const base = useMemo(() => startOfHour(new Date()), []);

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

  const formattedDate = format(value, "EEEE, MMMM d, HH:mm", { locale: enUS });
  const inputValue = format(value, "yyyy-MM-dd'T'HH:mm");

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Start time</span>
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
        className="w-full h-1.5 rounded-full appearance-none cursor-pointer bg-gray-200 accent-blue-600 touch-none"
        aria-label="Select start time"
      />

      <input
        type="datetime-local"
        value={inputValue}
        onChange={handleDateInput}
        className="w-full bg-white border border-gray-200 rounded-lg
                   px-2.5 py-1 text-gray-600 text-xs focus:outline-none
                   focus:ring-2 focus:ring-blue-400"
      />
    </div>
  );
}
