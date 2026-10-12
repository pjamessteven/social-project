import type { WikiTocItem } from "@/app/lib/markdown";
import type { ReactNode } from "react";
import { WikiTocAside, WikiTocLinks, type WikiTocNode } from "./WikiToc";

/**
 * Shared shell for article pages (wiki topics and the support page): a
 * sticky desktop table-of-contents sidebar that floats in the margin to the
 * left of the prose, plus a "jump to" box below the `xl` breakpoint.
 * The prose column is centered on screen; the TOC is taken out of flow so it
 * never pushes the article off-center. It needs ~14rem of clear margin, so it
 * only floats from `xl` up — narrower screens fall back to the in-article
 * jump-to box. The TOC is generated dynamically from the page's own headings
 * (or passed in as navigation items) and lists h2 sections only. The sidebar
 * is plain: no background or divider between it and the article.
 */
export function DocsLayout({
  toc,
  sidebarTitle,
  mobileTitle,
  sidebarExtras,
  preface,
  header,
  children,
}: {
  toc: WikiTocItem[];
  /** Optional label shown above the sidebar TOC (e.g. the support page's). */
  sidebarTitle?: ReactNode;
  /** Optional label shown in the mobile jump-to box. */
  mobileTitle?: ReactNode;
  /** Compact sections (e.g. child/related pages) shown under the TOC. */
  sidebarExtras?: ReactNode;
  /**
   * Content above the title (breadcrumbs, notices). Rendered above the
   * TOC/article block so the desktop TOC lines up with the title.
   */
  preface?: ReactNode;
  /** Title block; on narrow screens it renders above the jump-to box. */
  header?: ReactNode;
  children: ReactNode;
}) {
  // Only h2 sections are listed; h3+ subsections stay out of the TOC.
  const tocItems: WikiTocNode[] = toc
    .filter((entry) => entry.level === 2)
    .map((entry) => ({ id: entry.id, text: entry.text }));

  const prose = (
    <div className="prose dark:prose-invert w-full !max-w-4xl pb-16 [&_.wiki-callout_p]:my-1 [&_.wiki-callout>*:first-child]:mt-0 [&_.wiki-callout>*:last-child]:mb-0 [&_details]:cursor-pointer [&_summary]:cursor-pointer">
      {header}
      {tocItems.length > 0 && (
        <div className="prose-none bg-muted/50 mb-8 rounded-lg border p-4 xl:hidden">
          {mobileTitle && (
            <h3 className="mt-0 mb-3 text-sm font-semibold">{mobileTitle}</h3>
          )}
          <WikiTocLinks items={tocItems} />
        </div>
      )}
      {children}
    </div>
  );

  return (
    // The article column is centered on screen. On very wide screens it grows
    // past the page container (symmetrically, so it stays centered) to use the
    // free space. The desktop TOC is pinned to the column's left edge and taken
    // out of flow, so it never pushes the prose off-center; its inner box is
    // what sticks while scrolling.
    <div className="flex min-h-full w-full justify-center">
      <div className="w-full max-w-4xl lg:pt-8 2xl:-mx-16 2xl:w-[calc(100%_+_8rem)]">
        {preface && <div className="max-w-4xl">{preface}</div>}
        <div className="relative">
          {(tocItems.length > 0 || sidebarExtras) && (
            <WikiTocAside
              items={tocItems}
              title={sidebarTitle}
              extras={sidebarExtras}
            />
          )}
          {prose}
        </div>
      </div>
    </div>
  );
}
