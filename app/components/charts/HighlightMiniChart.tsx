"use client";

/**
 * Tiny decorative charts for the "What stands out" cards. They sit in the
 * card's bottom row beside the Explore link; the card text carries the
 * actual numbers (aria-hidden here).
 */

const PRIMARY = "#3b82f6";
const SECONDARY = "#93c5fd";
const NEGATIVE = "#f87171";
/** Women's bars; men use PRIMARY (blue), as in the full charts. */
const WOMEN = "#ec4899";
/** Unfilled track: currentColor at low opacity works in both themes. */
const TRACK_OPACITY = 0.15;

/** Fits beside the card's Explore button, below the body text. */
const SIZE = 36;
const TIMELINE_WIDTH = 84;

function Svg({
  children,
  width = SIZE,
}: {
  children: React.ReactNode;
  width?: number;
}) {
  return (
    <svg
      width={width}
      height={SIZE}
      viewBox={`0 0 ${width} ${SIZE}`}
      className="text-muted-foreground"
      aria-hidden
    >
      {children}
    </svg>
  );
}

/** Donut with up to two stacked segments (percentages of the whole). */
export function MiniDonut({
  primary,
  secondary = 0,
}: {
  primary: number;
  secondary?: number;
}) {
  const r = 14;
  const c = 2 * Math.PI * r;
  const clamp = (v: number) => Math.max(0, Math.min(100, v));
  const a = (clamp(primary) / 100) * c;
  const b = (clamp(Math.min(secondary, 100 - primary)) / 100) * c;
  const center = SIZE / 2;
  return (
    <Svg>
      <circle
        cx={center}
        cy={center}
        r={r}
        fill="none"
        stroke="currentColor"
        strokeOpacity={TRACK_OPACITY}
        strokeWidth={6}
      />
      <g transform={`rotate(-90 ${center} ${center})`}>
        {b > 0 && (
          <circle
            cx={center}
            cy={center}
            r={r}
            fill="none"
            stroke={SECONDARY}
            strokeWidth={6}
            strokeDasharray={`${b} ${c - b}`}
            strokeDashoffset={-a}
          />
        )}
        <circle
          cx={center}
          cy={center}
          r={r}
          fill="none"
          stroke={PRIMARY}
          strokeWidth={6}
          strokeDasharray={`${a} ${c - a}`}
        />
      </g>
    </Svg>
  );
}

/** Vertical bars scaled to the largest value (or `max` when given). */
export function MiniBars({
  values,
  colors,
  max,
}: {
  values: number[];
  colors: string[];
  max?: number;
}) {
  const top = max ?? Math.max(...values, 1);
  const gap = 3;
  const width = (SIZE - gap * (values.length - 1)) / values.length;
  const height = SIZE - 2;
  return (
    <Svg>
      {values.map((value, i) => {
        const h = Math.max(2, (value / top) * height);
        return (
          <rect
            key={i}
            x={i * (width + gap)}
            y={SIZE - h}
            width={width}
            height={h}
            rx={2}
            fill={colors[i % colors.length]}
          />
        );
      })}
    </Svg>
  );
}

/** Age timeline: milestones placed on a line from the first to the last. */
export function MiniTimeline({ ages }: { ages: (number | null)[] }) {
  const known = ages.filter((age): age is number => age !== null);
  if (known.length < 2) return null;
  const min = Math.min(...known);
  const max = Math.max(...known);
  const pad = 8;
  const x = (age: number) =>
    max === min
      ? TIMELINE_WIDTH / 2
      : pad + ((age - min) / (max - min)) * (TIMELINE_WIDTH - pad * 2);
  const y = SIZE - 8;
  const colors = [SECONDARY, PRIMARY, NEGATIVE];
  return (
    <Svg width={TIMELINE_WIDTH}>
      <line
        x1={pad}
        x2={TIMELINE_WIDTH - pad}
        y1={y}
        y2={y}
        stroke="currentColor"
        strokeOpacity={0.35}
        strokeWidth={2}
        strokeLinecap="round"
      />
      {ages.map((age, i) =>
        age === null ? null : (
          <g key={i}>
            <circle cx={x(age)} cy={y} r={4} fill={colors[i % colors.length]} />
            <text
              x={x(age)}
              y={y - 10}
              textAnchor="middle"
              fontSize={11}
              fill="currentColor"
            >
              {Math.round(age)}
            </text>
          </g>
        ),
      )}
    </Svg>
  );
}

export const MINI_COLORS = { PRIMARY, SECONDARY, NEGATIVE, WOMEN } as const;
