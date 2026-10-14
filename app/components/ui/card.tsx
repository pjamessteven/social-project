"use client";

import Link from "next/link";
import { type ComponentProps, forwardRef } from "react";
import { cn } from "./lib/utils";

/** The one card surface used across the site (stats, studies, topics…):
 * white (secondary in dark mode), rounded, bordered, with a light shadow. */
export const CARD_SURFACE =
  "rounded-2xl border bg-white shadow-sm dark:bg-secondary";

/** Hover treatment for cards that are links. */
export const CARD_INTERACTIVE =
  "transition-[border-color,box-shadow] hover:border-foreground/25 hover:shadow-md";

const Card = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(CARD_SURFACE, "text-card-foreground", className)}
      {...props}
    />
  ),
);
Card.displayName = "Card";

/** A whole card that is one link: padded column layout, and a `group` so
 * children can react to hovering the card. */
function LinkCard({ className, ...props }: ComponentProps<typeof Link>) {
  return (
    <Link
      className={cn(
        CARD_SURFACE,
        CARD_INTERACTIVE,
        "group flex flex-col p-5 no-underline",
        className,
      )}
      {...props}
    />
  );
}

const CardHeader = forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "flex flex-col space-y-1.5 p-4 text-sm md:p-6 md:text-base",
      className,
    )}
    {...props}
  />
));
CardHeader.displayName = "CardHeader";

const CardTitle = forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("leading-none font-semibold tracking-tight", className)}
    {...props}
  />
));
CardTitle.displayName = "CardTitle";

const CardDescription = forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-sm text-neutral-500 dark:text-neutral-400", className)}
    {...props}
  />
));
CardDescription.displayName = "CardDescription";

const CardContent = forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
));
CardContent.displayName = "CardContent";

const CardFooter = forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center p-6 pt-0", className)}
    {...props}
  />
));
CardFooter.displayName = "CardFooter";

export {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  LinkCard,
};
