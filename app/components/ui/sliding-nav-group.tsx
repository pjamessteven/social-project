"use client";

import { cn } from "@/app/components/ui/lib/utils";
import { Link } from "@/i18n/routing";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";

export interface TabDef {
  key: string;
  href?: string;
  label: React.ReactNode;
  isActive: boolean;
  icon?: React.ReactNode;
}

interface SlidingNavGroupProps {
  tabs: TabDef[];
  moreDropdown?: React.ReactNode;
  onTabClick?: (key: string) => void;
  className?: string;
  pillClassName?: string;
  activeTextClassName?: string;
  tabClassName?: string;
}

export function SlidingNavGroup({
  tabs,
  moreDropdown,
  onTabClick,
  className,
  pillClassName = "dark:bg-secondary bg-white shadow-[0px_0px_0px_1px_rgba(14,63,126,0.06),0px_1px_1px_-0.5px_rgba(42,51,70,0.03),0px_2px_2px_-1px_rgba(42,51,70,0.04),0px_3px_3px_-1.5px_rgba(42,51,70,0.04),0px_5px_5px_-2.5px_rgba(42,51,70,0.03),0px_10px_10px_-5px_rgba(42,51,70,0.03),0px_24px_24px_-8px_rgba(42,51,70,0.03)]",
  activeTextClassName = "text-secondary-foreground",
  tabClassName,
}: SlidingNavGroupProps) {
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);
  const [moreHovered, setMoreHovered] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const bgRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<Map<string, HTMLElement>>(new Map());
  const moreRef = useRef<HTMLDivElement>(null);

  const activeKey = useMemo(
    () => tabs.find((t) => t.isActive)?.key ?? null,
    [tabs.map((t) => `${t.key}:${t.isActive}`).join(",")],
  );
  const targetKey = moreHovered ? "more" : (hoveredKey ?? activeKey);

  const moveBg = useCallback((key: string | null) => {
    if (!bgRef.current || !containerRef.current) return;
    if (!key) {
      bgRef.current.style.opacity = "0";
      return;
    }
    const el = key === "more" ? moreRef.current : tabRefs.current.get(key);
    if (!el) return;
    const containerRect = containerRef.current.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();
    bgRef.current.style.left = `${elRect.left - containerRect.left}px`;
    bgRef.current.style.width = `${elRect.width}px`;
    bgRef.current.style.opacity = "1";
  }, []);

  // Move background whenever target tab changes (hover or active)
  useLayoutEffect(() => {
    moveBg(targetKey);
  }, [targetKey, moveBg]);

  // Keep background aligned on window resize
  useEffect(() => {
    const handleResize = () => moveBg(targetKey);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [targetKey, moveBg]);

  const commonTabClass = cn(
    "relative z-10 flex items-center gap-1.5 rounded-full px-4 py-3 text-sm font-medium transition-colors",
    tabClassName,
  );

  const getTabColorClass = (tabKey: string) =>
    targetKey === tabKey
      ? activeTextClassName
      : "text-muted-foreground hover:text-foreground";

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative flex items-center gap-0 rounded-full bg-transparent p-0 px-1",
        className,
      )}
      onMouseLeave={() => {
        setHoveredKey(null);
        setMoreHovered(false);
      }}
    >
      {/* Sliding jelly background */}
      <div
        ref={bgRef}
        className={cn(
          "pointer-events-none absolute top-1 bottom-1 rounded-full dark:border",
          pillClassName,
        )}
        style={{
          left: 0,
          width: 0,
          opacity: 0,
          transition:
            "left 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), width 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.2s ease",
        }}
      />

      {tabs.map((tab) => {
        const isClickable = !!onTabClick;
        const tabKey = tab.key;
        const commonProps = {
          ref: (el: HTMLElement | null) => {
            if (el) tabRefs.current.set(tabKey, el);
          },
          onMouseEnter: () => {
            setHoveredKey(tabKey);
            setMoreHovered(false);
          },
          className: cn(commonTabClass, getTabColorClass(tabKey)),
          children: (
            <>
              {tab.icon}
              {tab.label}
            </>
          ),
        };

        if (isClickable) {
          return (
            <button
              key={tabKey}
              {...commonProps}
              onClick={() => onTabClick(tabKey)}
              type="button"
            />
          );
        }

        return (
          <Link key={tabKey} {...commonProps} href={(tab.href ?? "/") as "/"} />
        );
      })}

      {moreDropdown && (
        <div
          ref={moreRef}
          onMouseEnter={() => setMoreHovered(true)}
          className={cn(
            "relative z-10 rounded-full py-1 text-sm font-medium transition-colors",
            targetKey === "more"
              ? activeTextClassName
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {moreDropdown}
        </div>
      )}
    </div>
  );
}
