"use client";

import { useRef, useState, useLayoutEffect, useCallback } from "react";
import { motion, useMotionValue } from "framer-motion";

interface Props {
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  formatValue: (value: number) => string;
  label: string;
  ariaLabel?: string;
  footer?: React.ReactNode;
}

const THUMB_SIZE = 36;

// Generic vertical drag-slider used for both the time and pace docks in the
// mobile control bar — see components/route/MobileControlBar.tsx for how the
// two domains (hour-offset↔Date, pace↔km/h) plug into this shared primitive.
export function VerticalDragSlider({
  value, min, max, step, onChange, formatValue, label, ariaLabel, footer,
}: Props) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [trackHeight, setTrackHeight] = useState(0);
  const [dragging, setDragging] = useState(false);
  const y = useMotionValue(0);

  const travel = Math.max(trackHeight - THUMB_SIZE, 1);

  const valueToY = useCallback(
    (v: number) => {
      const fraction = (v - min) / (max - min);
      return (1 - fraction) * travel;
    },
    [min, max, travel]
  );

  const yToValue = useCallback(
    (yPos: number) => {
      const fraction = 1 - Math.min(1, Math.max(0, yPos / travel));
      const raw = min + fraction * (max - min);
      const stepped = Math.round((raw - min) / step) * step + min;
      return Math.min(max, Math.max(min, stepped));
    },
    [min, max, step, travel]
  );

  useLayoutEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    const measure = () => setTrackHeight(el.clientHeight);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Sync the thumb to external value changes, but never mid-drag — otherwise a
  // debounced/derived update from the parent would fight the user's finger.
  useLayoutEffect(() => {
    if (!dragging && trackHeight > 0) y.set(valueToY(value));
  }, [value, trackHeight, dragging, valueToY, y]);

  const jumpTo = (clientY: number) => {
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect) return;
    const relY = clientY - rect.top - THUMB_SIZE / 2;
    const newValue = yToValue(relY);
    y.set(valueToY(newValue));
    onChange(newValue);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowUp")   { e.preventDefault(); onChange(Math.min(max, value + step)); }
    if (e.key === "ArrowDown") { e.preventDefault(); onChange(Math.max(min, value - step)); }
  };

  return (
    <div className="flex flex-col items-center gap-2 h-full py-3">
      <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide text-center px-1">
        {label}
      </span>

      <div
        ref={trackRef}
        className="relative flex-1 w-2 rounded-full bg-gray-200"
        style={{ touchAction: "none" }}
        onPointerDown={(e) => { if (e.target === e.currentTarget) jumpTo(e.clientY); }}
      >
        <motion.div
          role="slider"
          aria-label={ariaLabel ?? label}
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={value}
          tabIndex={0}
          onKeyDown={handleKeyDown}
          drag="y"
          dragConstraints={{ top: 0, bottom: travel }}
          dragElastic={0}
          dragMomentum={false}
          onDragStart={() => setDragging(true)}
          onDrag={() => onChange(yToValue(y.get()))}
          onDragEnd={() => setDragging(false)}
          style={{ y, touchAction: "none", width: THUMB_SIZE, height: THUMB_SIZE }}
          className="absolute left-1/2 -translate-x-1/2 rounded-full bg-brand-green border-2 border-white shadow-md cursor-grab active:cursor-grabbing flex items-center justify-center"
        >
          <div className="w-3.5 h-0.5 rounded-full bg-white/80" />
        </motion.div>
      </div>

      <span className="text-sm font-bold text-brand-green-dark tabular-nums text-center px-1 leading-tight">
        {formatValue(value)}
      </span>

      {footer}
    </div>
  );
}
