"use client";

import { useRef, useCallback, useEffect } from "react";
import type { WeatherSegment, SportType } from "@/types";
import { SegmentCard } from "./SegmentCard";

interface Props {
  segments: WeatherSegment[];
  activeIndex: number | null;
  sport: SportType;
  onActiveChange: (index: number) => void;
}

export function SegmentList({ segments, activeIndex, sport, onActiveChange }: Props) {
  const listRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  // Track whether a user scroll is in progress (vs. programmatic flyTo)
  const isUserScrolling = useRef(true);

  // Set up IntersectionObserver so scrolling the card list drives the map
  useEffect(() => {
    if (!listRef.current) return;

    observerRef.current?.disconnect();

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (!isUserScrolling.current) return;

        // Find the most visible card
        let maxRatio = 0;
        let mostVisible: number | null = null;
        for (const entry of entries) {
          if (entry.intersectionRatio > maxRatio) {
            maxRatio = entry.intersectionRatio;
            mostVisible = Number(
              (entry.target as HTMLElement).dataset.segmentIndex
            );
          }
        }
        if (mostVisible !== null && mostVisible !== activeIndex) {
          onActiveChange(mostVisible);
        }
      },
      {
        root: listRef.current,
        threshold: [0, 0.5, 1],
      }
    );

    const cards = listRef.current.querySelectorAll("[data-segment-index]");
    cards.forEach((c) => observerRef.current!.observe(c));

    return () => observerRef.current?.disconnect();
  }, [segments, activeIndex, onActiveChange]);

  // When map drives the active segment, briefly pause the scroll observer
  const handleCardClick = useCallback(
    (index: number) => {
      isUserScrolling.current = false;
      onActiveChange(index);
      setTimeout(() => {
        isUserScrolling.current = true;
      }, 800);
    },
    [onActiveChange]
  );

  if (!segments.length) {
    return (
      <div className="flex items-center justify-center h-32 text-gray-400 text-sm">
        Laster værdata…
      </div>
    );
  }

  return (
    <div
      ref={listRef}
      className="overflow-y-auto flex-1 space-y-2 px-3 py-3 pb-8 overscroll-contain bg-gray-50"
      style={{ maxHeight: "calc(var(--map-height-mobile) * 1.2)" }}
    >
      {segments.map((seg) => (
        <div key={seg.index} data-segment-index={seg.index}>
          <SegmentCard
            segment={seg}
            isActive={activeIndex === seg.index}
            sport={sport}
            onClick={() => handleCardClick(seg.index)}
          />
        </div>
      ))}
    </div>
  );
}
