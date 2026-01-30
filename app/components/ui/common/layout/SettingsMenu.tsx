"use client";

import { locales, localesInfo } from "@/i18n/locales";
import { Link, usePathname, useRouter } from "@/i18n/routing";
import { Check, Globe, Monitor, Moon, Search, Sun } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import { useParams } from "next/navigation";
import React, { useEffect, useState, useTransition } from "react";
import { Button } from "../../button";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "../../navigation-menu";

// Error boundary to catch missing intl context
class SettingsMenuErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode; fallback: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

// Inner component that uses next-intl hooks
function SettingsMenuInner() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();
  const [isPending, startTransition] = useTransition();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const t = useTranslations();
  const [mounted, setMounted] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleLocaleChange = (newLocale: string) => {
    startTransition(() => {
      // @ts-expect-error - params will match the dynamic route segments
      router.replace({ pathname, params }, { locale: newLocale });
    });
  };

  const currentLocale =
    localesInfo.find((l) => l.code === locale) ?? localesInfo[0];

  // Get the display icon based on resolved theme (actual light/dark applied)
  const getThemeIcon = () => {
    if (!mounted) return <Sun className="h-4 w-4" />;
    if (resolvedTheme === "dark") {
      return <Moon className="h-4 w-4" />;
    }
    return <Sun className="h-4 w-4" />;
  };

  const filteredLocales = localesInfo.filter(
    (l) =>
      l.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.code.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <>
      {/* Hreflang meta links for SEO - rendered invisibly for crawlers */}
      <link
        rel="alternate"
        hrefLang="x-default"
        href={`https://detrans.ai/en${pathname}`}
      />
      {localesInfo.map((l) => (
        <link
          key={l.code}
          rel="alternate"
          hrefLang={l.code}
          href={`https://detrans.ai/${l.code}${pathname}`}
        />
      ))}

      <NavigationMenu>
        <NavigationMenuList>
          <NavigationMenuItem>
            <NavigationMenuTrigger
              className="gap-2 rounded-full border bg-transparent px-3 text-sm font-medium"
              disabled={isPending}
            >
              <Globe className="h-4 w-4" />
              <div className="text-xs font-medium uppercase">
                {currentLocale.code}
              </div>
              <div className="ml-1 flex items-center border-l pl-3">
                {getThemeIcon()}
              </div>
            </NavigationMenuTrigger>
            <NavigationMenuContent className="">
              <div className="grid w-56 gap-1 p-2">
                {/* Theme Section */}
                <div className="px-2 pt-1 pb-1.5 text-sm font-semibold">
                  {t("theme.title")}
                </div>
                <NavigationMenuLink asChild>
                  <button
                    onClick={() => setTheme("light")}
                    className="hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground flex cursor-pointer flex-row items-center justify-between rounded-md px-2 py-2 text-left text-sm transition-colors outline-none select-none"
                  >
                    <div className="flex items-center gap-2">
                      <Sun className="h-4 w-4" />
                      <span>{t("theme.light")}</span>
                    </div>
                    {theme === "light" && <Check className="h-4 w-4" />}
                  </button>
                </NavigationMenuLink>
                <NavigationMenuLink asChild>
                  <button
                    onClick={() => setTheme("dark")}
                    className="hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground flex cursor-pointer flex-row items-center justify-between rounded-md px-2 py-2 text-left text-sm transition-colors outline-none select-none"
                  >
                    <div className="flex items-center gap-2">
                      <Moon className="h-4 w-4" />
                      <span>{t("theme.dark")}</span>
                    </div>
                    {theme === "dark" && <Check className="h-4 w-4" />}
                  </button>
                </NavigationMenuLink>
                <NavigationMenuLink asChild>
                  <button
                    onClick={() => setTheme("system")}
                    className="hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground flex cursor-pointer flex-row items-center justify-between rounded-md px-2 py-2 text-left text-sm transition-colors outline-none select-none"
                  >
                    <div className="flex items-center gap-2">
                      <Monitor className="h-4 w-4" />
                      <span className="capitalize">{t("theme.auto")}</span>
                    </div>
                    {theme === "system" && <Check className="h-4 w-4" />}
                  </button>
                </NavigationMenuLink>

                <div className="bg-border my-1 h-px" />
                {/* Language Section */}
                <div className="px-2 py-1.5 text-sm font-semibold">
                  {t("language.title")}
                </div>
                {/* Search Input */}
                <div className="flex items-center px-2 pb-2">
                  <div className="relative flex-1">
                    <Search className="text-muted-foreground absolute top-1/2 left-2 h-3.5 w-3.5 -translate-y-1/2" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder={t("language.search", {
                        count: locales.length,
                      })}
                      className="focus:ring-ring w-full rounded-md border bg-transparent py-1.5 pr-2 pl-7 text-sm outline-none focus:ring-2"
                    />
                  </div>
                </div>
                {/* Scrollable Language List */}
                <div className="max-h-48 overflow-y-auto md:max-h-88">
                  {filteredLocales.map((l) => (
                    <NavigationMenuLink asChild key={l.code}>
                      <button
                        onClick={() => handleLocaleChange(l.code)}
                        className="hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground flex w-full cursor-pointer flex-row items-center justify-between rounded-md px-2 py-2 text-left text-sm transition-colors outline-none select-none"
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-6 text-xs font-medium uppercase">
                            {l.code}
                          </span>
                          <span>{l.label}</span>
                        </div>
                        {l.code === locale && <Check className="h-4 w-4" />}
                      </button>
                    </NavigationMenuLink>
                  ))}
                  {filteredLocales.length === 0 && (
                    <div className="text-muted-foreground px-2 py-3 text-center text-sm">
                      No languages found
                    </div>
                  )}
                </div>
              </div>
            </NavigationMenuContent>
          </NavigationMenuItem>
        </NavigationMenuList>
      </NavigationMenu>
    </>
  );
}

// Simple fallback when no intl context is available
function SettingsMenuFallback() {
  return (
    <Link href="/">
      <Button
        variant="outline"
        size="sm"
        className="border-border gap-2 rounded-full border px-3"
      >
        <Globe className="h-4 w-4" />
        <span className="text-xs font-medium uppercase">EN</span>
        <div className="flex items-center">
          <Sun className="h-3.5 w-3.5" />
          <Moon className="-ml-1 h-4 w-4" />
        </div>
      </Button>
    </Link>
  );
}

// Main export with error boundary
export function SettingsMenu() {
  return (
    <SettingsMenuErrorBoundary fallback={<SettingsMenuFallback />}>
      <SettingsMenuInner />
    </SettingsMenuErrorBoundary>
  );
}
