import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/app/components/ui/collapsible";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
} from "@/app/components/ui/sidebar";
import type { WikiTocItem } from "@/app/lib/markdown";
import { ChevronRight } from "lucide-react";
import type { ReactNode } from "react";

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
  const nested: Array<{ item: WikiTocItem; children: WikiTocItem[] }> = [];
  for (const entry of toc) {
    if (entry.level === 2 || nested.length === 0) {
      nested.push({ item: entry, children: [] });
    } else {
      nested[nested.length - 1].children.push(entry);
    }
  }

  if (!nested.length && !sidebarExtras) {
    return (
      <div className="flex min-h-full w-full">
        <main className="w-full flex-1">
          <div className="prose dark:prose-invert w-full pb-16 lg:pt-8 [&_details]:cursor-pointer [&_summary]:cursor-pointer">
            {children}
          </div>
        </main>
      </div>
    );
  }

  const jumpLinks = (
    <div className="space-y-2">
      {nested.map(({ item, children }) => (
        <div key={item.id}>
          <a
            href={`#${item.id}`}
            className="text-muted-foreground hover:text-foreground block text-sm"
          >
            {item.text}
          </a>
          {children.length > 0 && (
            <div className="mt-2 ml-4 space-y-2">
              {children.map((child) => (
                <a
                  key={child.id}
                  href={`#${child.id}`}
                  className="text-muted-foreground hover:text-foreground block text-sm"
                >
                  {child.text}
                </a>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );

  const sidebar = (
    <Sidebar className="to-secondary w-64 bg-gradient-to-b from-white dark:from-black">
      <SidebarContent>
        {nested.length > 0 && (
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu className="gap-2">
                <div className="mt-2 mb-1 ml-2 font-semibold">On this page</div>
                {nested.map(({ item, children }) => (
                  <SidebarMenuItem key={item.id}>
                    {children.length > 0 ? (
                      <Collapsible defaultOpen className="group/collapsible">
                        <CollapsibleTrigger asChild>
                          <SidebarMenuButton className="h-auto w-full justify-between overflow-visible whitespace-normal">
                            <a href={`#${item.id}`} className="flex-1">
                              {item.text}
                            </a>
                            <ChevronRight className="ml-auto transition-transform group-data-[state=open]/collapsible:rotate-90" />
                          </SidebarMenuButton>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <SidebarMenuSub className="mt-2 gap-2">
                            {children.map((child) => (
                              <SidebarMenuSubItem key={child.id}>
                                <SidebarMenuSubButton
                                  asChild
                                  className="h-auto overflow-visible whitespace-normal"
                                >
                                  <a href={`#${child.id}`}>{child.text}</a>
                                </SidebarMenuSubButton>
                              </SidebarMenuSubItem>
                            ))}
                          </SidebarMenuSub>
                        </CollapsibleContent>
                      </Collapsible>
                    ) : (
                      <SidebarMenuButton
                        asChild
                        className="h-auto overflow-visible whitespace-normal"
                      >
                        <a href={`#${item.id}`}>{item.text}</a>
                      </SidebarMenuButton>
                    )}
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
        {sidebarExtras && (
          <SidebarGroup>
            <SidebarGroupContent>
              <div className="bg-border mb-3 h-px" />
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
          <div className="prose dark:prose-invert w-full pb-16 lg:pt-8 [&_details]:cursor-pointer [&_summary]:cursor-pointer">
            {nested.length > 0 && (
              <div className="prose-none bg-muted/50 mb-8 rounded-lg border p-4 lg:hidden">
                <h3 className="mt-0 mb-3 text-sm font-semibold">
                  On this page
                </h3>
                {jumpLinks}
              </div>
            )}
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
