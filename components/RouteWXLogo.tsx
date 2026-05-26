// Each letter tilts progressively more, as if being blown by wind left-to-right.
// Three shrinking lines after "X" act as wind streaks.
// No "use client" needed — purely static markup.

export function RouteWXLogo({ className }: { className?: string }) {
  // [char, rotation-deg, vertical-lift-em]
  const letters: [string, number, number][] = [
    ["R",  0,  0.00],
    ["o",  2,  0.03],
    ["u",  3,  0.06],
    ["t",  5,  0.09],
    ["e",  7,  0.13],
    ["W",  9,  0.17],
    ["X", 13,  0.23],
  ];

  return (
    <span
      className={className}
      aria-label="RouteWX"
      style={{ display: "inline-flex", alignItems: "flex-end", lineHeight: 1 }}
    >
      {letters.map(([char, deg, lift], i) => (
        <span
          key={i}
          aria-hidden="true"
          style={{
            display: "inline-block",
            transform: `rotate(${deg}deg) translateY(-${lift}em)`,
            transformOrigin: "50% 100%",
          }}
        >
          {char}
        </span>
      ))}

      {/* Wind streaks */}
      <span
        aria-hidden="true"
        style={{
          display: "inline-flex",
          flexDirection: "column",
          justifyContent: "center",
          gap: "0.13em",
          marginLeft: "0.15em",
          marginBottom: "0.06em",
          transform: "rotate(11deg)",
          opacity: 0.35,
        }}
      >
        {([0.38, 0.27, 0.18] as number[]).map((w, i) => (
          <span
            key={i}
            style={{
              display: "block",
              width: `${w}em`,
              height: "0.07em",
              background: "currentColor",
              borderRadius: "1px",
            }}
          />
        ))}
      </span>
    </span>
  );
}
