import { ExternalLink } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

export interface SeeAlsoLink {
  label: string;
  /** Absolute URL (external) or an already-localized site path */
  href: string;
  external?: boolean;
}

/**
 * Page intro with a "See also" link column beside it, separated by a hairline
 * divider on large screens (stacked under a horizontal hairline on tablets).
 * Phones skip the links entirely to keep the intro short; `wideOnly` skips
 * them on tablets too, instead of stacking them under the intro.
 */
export function IntroWithSeeAlso({
  children,
  title,
  links,
  className = "",
  wideOnly = false,
}: {
  /** The intro (description etc.), shown on the left */
  children: ReactNode;
  title: string;
  links: SeeAlsoLink[];
  className?: string;
  wideOnly?: boolean;
}) {
  const linkClass =
    "hover:text-foreground relative inline-flex items-center gap-1.5 text-base text-gray-700 decoration-1 underline-offset-4 hover:underline dark:text-gray-300";

  return (
    <div
      // Own line height: `not-prose` doesn't reset what a surrounding `prose`
      // block passes down by inheritance, so pages would otherwise differ
      className={`not-prose flex flex-col gap-6 leading-relaxed lg:flex-row lg:gap-10 ${className}`}
    >
      <div className="max-w-3xl lg:flex-1">{children}</div>
      <aside
        // Not stretched, so the side divider is only as tall as the links
        className={`hidden border-t pt-5 lg:block lg:w-72 lg:shrink-0 lg:self-start lg:border-t-0 lg:border-l lg:pt-0 lg:pl-10 ${wideOnly ? "" : "md:block"}`}
      >
        <h2 className="text-muted-foreground mb-3 text-sm font-medium">
          {title}
        </h2>
        <ul className="space-y-2.5">
          {links.map((link) => (
            <li key={link.href}>
              {link.external ? (
                <a
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={linkClass}
                >
                  {link.label}
                  <ExternalLink
                    className="h-3.5 w-3.5 shrink-0 opacity-60"
                    aria-hidden
                  />
                  {/* Inside a `relative` link so it can't stretch the page */}
                  <span className="sr-only">(opens in new tab)</span>
                </a>
              ) : (
                <Link href={link.href} className={linkClass}>
                  {link.label}
                </Link>
              )}
            </li>
          ))}
        </ul>
      </aside>
    </div>
  );
}
