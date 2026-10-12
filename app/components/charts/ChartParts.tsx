"use client";

import { createContext, useContext, type ReactNode } from "react";

/** Card surface shared with the /videos cards: white (secondary in dark
 * mode), rounded, bordered, with a light shadow. */
export const CARD_SURFACE =
  "rounded-2xl border bg-white shadow-sm dark:bg-secondary";

/** The same surface while loading: identical radius, border and shadow,
 * with a muted, pulsing fill. */
export const CARD_LOADING_SURFACE =
  "rounded-2xl border shadow-sm bg-muted dark:bg-muted animate-pulse";

const CARD_SHAPE = "p-5 sm:p-8";

/** Heading scale for the stats page, largest first. */
export const SECTION_TITLE = "text-2xl font-bold sm:text-3xl";
export const CHART_TITLE = "text-xl font-bold tracking-tight sm:text-2xl";
export const ROW_GROUP_TITLE = "text-lg font-semibold";

/** True inside a ChartCard, so skeletons can turn the card itself grey. */
const InCardContext = createContext(false);

/**
 * The shared surface every chart sits on (see CARD_SURFACE), padded.
 *
 * While any chart inside it is loading (a ChartSkeleton is rendered), the
 * card itself becomes the loading placeholder: same radius, border and
 * shadow, muted and pulsing, with its content (titles included) hidden, so
 * every loading state looks the same.
 */
export function ChartCard({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <InCardContext.Provider value={true}>
      <div
        className={`text-card-foreground ${CARD_SURFACE} ${CARD_SHAPE} has-[[data-chart-loading]]:bg-muted dark:has-[[data-chart-loading]]:bg-muted has-[[data-chart-loading]]:animate-pulse has-[[data-chart-loading]]:*:invisible ${className}`}
      >
        {children}
      </div>
    </InCardContext.Provider>
  );
}

/**
 * A chart on its card, with an optional title and description. Controls
 * (selectors, search, pickers) render above the card so the surface only
 * frames the graph itself.
 */
export function ChartBlock({
  title,
  description,
  controls,
  children,
}: {
  title?: ReactNode;
  description?: ReactNode;
  controls?: ReactNode;
  children: ReactNode;
}) {
  const card = (
    <ChartCard>
      {(title || description) && (
        <div className="mb-6">
          {title && <h3 className={CHART_TITLE}>{title}</h3>}
          {description && (
            <p className="text-muted-foreground mt-2 text-base">
              {description}
            </p>
          )}
        </div>
      )}
      {children}
    </ChartCard>
  );
  if (!controls) return card;
  return (
    <div className="space-y-4">
      {controls}
      {card}
    </div>
  );
}

/**
 * Loading placeholder, always shaped like a chart card. Outside a card it
 * draws the card-shaped pulse itself; inside one it only reserves height and
 * marks the surrounding card as loading (see ChartCard).
 */
export function ChartSkeleton({ height = "h-64" }: { height?: string }) {
  const inCard = useContext(InCardContext);
  if (inCard) return <div data-chart-loading className={`w-full ${height}`} />;
  return (
    <div
      aria-busy
      className={`w-full ${CARD_LOADING_SURFACE} ${CARD_SHAPE} ${height}`}
    />
  );
}

export function ChartMessage({ children }: { children: ReactNode }) {
  return <p className="text-muted-foreground text-base">{children}</p>;
}

export function ChartFootnote({ children }: { children: ReactNode }) {
  return <p className="text-muted-foreground text-sm">{children}</p>;
}
