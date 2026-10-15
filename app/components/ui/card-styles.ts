/**
 * Card class strings, in a plain module (not "use client") so server
 * components can use them too.
 */

/** The one card surface used across the site (stats, studies, topics,
 * videos…): white (secondary in dark mode), rounded, bordered, with a light
 * shadow. */
export const CARD_SURFACE =
  "rounded-2xl border bg-white shadow-sm dark:bg-secondary";

/** Hover treatment for cards that are links. */
export const CARD_INTERACTIVE =
  "transition-[border-color,box-shadow] hover:border-foreground/25 hover:shadow-md";
