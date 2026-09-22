"use client";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/app/components/ui/collapsible";
import { cn } from "@/app/components/ui/lib/utils";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/app/components/ui/sidebar";
import { ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";

export interface WikiTocNode {
  id: string;
  text: string;
  children: { id: string; text: string }[];
}

/**
 * Wiki table-of-contents links ("sidebar" desktop or "mobile" jump-to
 * variant) with scroll-spy: the currently viewed section renders bold.
 */
export function WikiTocLinks({
  items,
  variant,
}: {
  items: WikiTocNode[];
  variant: "sidebar" | "mobile";
}) {
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    const ids = items.flatMap((item) => [
      item.id,
      ...item.children.map((child) => child.id),
    ]);
    const elements = ids
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => Boolean(el));
    if (!elements.length) return;

    // A heading is "current" while it sits in the top band of the viewport.
    // Works for any scroll container (the page scrolls inside <main>).
    const visible = new Set<string>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) visible.add(entry.target.id);
          else visible.delete(entry.target.id);
        }
        const firstVisible = ids.find((id) => visible.has(id));
        if (firstVisible) setActiveId(firstVisible);
      },
      { rootMargin: "0px 0px -65% 0px" },
    );
    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [items]);

  if (variant === "mobile") {
    return (
      <div className="space-y-0.5">
        {items.map((item) => (
          <div key={item.id}>
            <a
              href={`#${item.id}`}
              className={cn(
                "text-muted-foreground hover:text-foreground block text-sm",
                activeId === item.id && "text-foreground font-semibold",
              )}
            >
              {item.text}
            </a>
            {item.children.length > 0 && (
              <div className="mt-0.5 ml-4 space-y-0.5">
                {item.children.map((child) => (
                  <a
                    key={child.id}
                    href={`#${child.id}`}
                    className={cn(
                      "text-muted-foreground hover:text-foreground block text-sm",
                      activeId === child.id && "text-foreground font-semibold",
                    )}
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
  }

  return (
    <SidebarMenu className="gap-0.5">
      {items.map((item) => (
        <SidebarMenuItem key={item.id}>
          {item.children.length > 0 ? (
            <Collapsible defaultOpen className="group/collapsible">
              <CollapsibleTrigger asChild>
                <SidebarMenuButton
                  className={cn(
                    "h-auto w-full justify-between overflow-visible py-1 whitespace-normal",
                    activeId === item.id && "font-semibold",
                  )}
                >
                  <a href={`#${item.id}`} className="flex-1">
                    {item.text}
                  </a>
                  <ChevronRight className="ml-auto transition-transform group-data-[state=open]/collapsible:rotate-90" />
                </SidebarMenuButton>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <SidebarMenuSub className="mt-0.5 gap-0.5">
                  {item.children.map((child) => (
                    <SidebarMenuSubItem key={child.id}>
                      <SidebarMenuSubButton
                        asChild
                        className={cn(
                          "h-auto overflow-visible py-1 whitespace-normal",
                          activeId === child.id && "font-semibold",
                        )}
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
              className={cn(
                "h-auto overflow-visible py-1 whitespace-normal",
                activeId === item.id && "font-semibold",
              )}
            >
              <a href={`#${item.id}`}>{item.text}</a>
            </SidebarMenuButton>
          )}
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  );
}
