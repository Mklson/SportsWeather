"use client";

import { useRef, useState, useLayoutEffect, useCallback, useMemo } from "react";
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
  // Domain spacing between reference tick marks along the track (e.g. 1 = a
  // tick every whole unit). Omit for no ticks.
  tickStep?: number;
}

const THUMB_SIZE = 36;

// Generic vertical drag-slider used for both the time and pace docks in the
// mobile control bar — see components/route/MobileControlBar.tsx for how the
// two domains (hour-offset↔Date, pace↔km/h) plug into this shared primitive.
export function VerticalDragSlider({
  value, min, max, step, onChange, formatValue, label, ariaLabel, footer, tickStep,
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

  // Reference lines along the track, evenly spaced by domain value (like a
  // coordinate axis) so they line up with the values they mark, not with pixels.
  const ticks = useMemo(() => {
    if (!tickStep) return [];
    const out: number[] = [];
    const start = Math.ceil(min / tickStep) * tickStep;
    for (let v = start; v <= max + 1e-9; v += tickStep) out.push(Math.round(v * 1000) / 1000);
    return out;
  }, [min, max, tickStep]);

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
      {/* Label + live value + optional extra (date input / total-duration readout)
          all sit above the track — a dragging thumb/finger travels the full track
          height, so anything below it would get covered mid-drag. */}
      <div className="flex flex-col items-center gap-0.5">
        <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide text-center px-1">
          {label}
        </span>
        <span className="text-sm font-bold text-brand-green-dark tabular-nums text-center px-1 leading-tight">
          {formatValue(value)}
        </span>
        {footer}
      </div>

      <div
        ref={trackRef}
        className="relative flex-1 w-2 rounded-full bg-gray-200"
        style={{ touchAction: "none" }}
        onPointerDown={(e) => { if (e.target === e.currentTarget) jumpTo(e.clientY); }}
      >
        {ticks.map((t) => (
          <div
            key={t}
            className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-px bg-gray-400/70 pointer-events-none"
            style={{ top: valueToY(t) + THUMB_SIZE / 2 }}
          />
        ))}

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
          // Horizontal centering uses left+marginLeft (not a translateX class) because
          // framer-motion writes `transform` inline for the `y` motion value — a
          // Tailwind translate-x-1/2 class targeting the same property would be
          // silently clobbered, leaving the thumb offset to the side of the track.
          style={{
            y,
            touchAction: "none",
            width: THUMB_SIZE,
            height: THUMB_SIZE,
            left: "50%",
            marginLeft: -THUMB_SIZE / 2,
          }}
          className="absolute flex items-center justify-center cursor-grab active:cursor-grabbing"
        >
          <div className="w-7 h-1.5 rounded-full bg-brand-green shadow-md" />
        </motion.div>
      </div>
    </div>
  );
}
