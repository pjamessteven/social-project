import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarProvider,
} from "@/app/components/ui/sidebar";
import type { WikiTocItem } from "@/app/lib/markdown";
import type { ReactNode } from "react";
import { WikiTocLinks, type WikiTocNode } from "./WikiToc";

/**
 * Support-page-style shell for wiki pages: desktop sidebar table of contents
 * plus a mobile "jump to" box, with the article content in a prose container.
 * The TOC is generated dynamically from the page's own headings.
 */
export function WikiPageLayout({
  toc,
  sidebarExtras,
  children,
}: {
  toc: WikiTocItem[];
  /** Compact sections (e.g. child/related pages) shown under the TOC. */
  sidebarExtras?: React.ReactNode;
  children: ReactNode;
}) {
  // Group h3s under the preceding h2 (flat when no h2 exists)
  const grouped: Array<{ item: WikiTocItem; children: WikiTocItem[] }> = [];
  for (const entry of toc) {
    if (entry.level === 2 || grouped.length === 0) {
      grouped.push({ item: entry, children: [] });
    } else {
      grouped[grouped.length - 1].children.push(entry);
    }
  }

  const tocItems: WikiTocNode[] = grouped.map(({ item, children }) => ({
    id: item.id,
    text: item.text,
    children: children.map((child) => ({ id: child.id, text: child.text })),
  }));

  if (!tocItems.length && !sidebarExtras) {
    return (
      <div className="flex min-h-full w-full">
        <main className="w-full flex-1">
          <div className="prose dark:prose-invert w-full pb-16 lg:pt-8 [&_.wiki-callout_p]:my-1 [&_.wiki-callout>*:first-child]:mt-0 [&_.wiki-callout>*:last-child]:mb-0 [&_details]:cursor-pointer [&_summary]:cursor-pointer">
            {children}
          </div>
        </main>
      </div>
    );
  }

  const sidebar = (
    <Sidebar className="to-secondary w-64 bg-gradient-to-b from-white dark:from-black">
      <SidebarContent>
        {tocItems.length > 0 && (
          <SidebarGroup>
            <SidebarGroupContent>
              <div className="mt-2 mb-1 ml-2 font-semibold">On this page:</div>
              <WikiTocLinks items={tocItems} variant="sidebar" />
            </SidebarGroupContent>
          </SidebarGroup>
        )}
        {sidebarExtras && (
          <SidebarGroup className="pt-0">
            <SidebarGroupContent>
              <div className="bg-border mb-4 h-px" />
              {sidebarExtras}
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
    </Sidebar>
  );

  return (
    <SidebarProvider>
      <div className="flex min-h-full w-full">
        <div className="hidden lg:block">{sidebar}</div>
        <main className="w-full flex-1">
          <div className="prose dark:prose-invert w-full pb-16 lg:pt-8 [&_.wiki-callout_p]:my-1 [&_.wiki-callout>*:first-child]:mt-0 [&_.wiki-callout>*:last-child]:mb-0 [&_details]:cursor-pointer [&_summary]:cursor-pointer">
            {tocItems.length > 0 && (
              <div className="prose-none bg-muted/50 mb-8 rounded-lg border p-4 lg:hidden">
                <h3 className="mt-0 mb-3 text-sm font-semibold">
                  On this page:
                </h3>
                <WikiTocLinks items={tocItems} variant="mobile" />
              </div>
            )}
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
