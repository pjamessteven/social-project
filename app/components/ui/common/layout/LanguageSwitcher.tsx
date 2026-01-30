"use client";

import { Link, usePathname, useRouter } from "@/i18n/routing";
import { localesInfo } from "@/i18n/locales";
import { ChevronDown, Globe } from "lucide-react";
import { useLocale } from "next-intl";
import { useParams } from "next/navigation";
import React, { useTransition } from "react";
import { Button } from "../../button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../dropdown-menu";

// Error boundary to catch missing intl context
class LanguageSwitcherErrorBoundary extends React.Component<
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
function LanguageSwitcherInner() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();
  const [isPending, startTransition] = useTransition();

  const handleLocaleChange = (newLocale: string) => {
    startTransition(() => {
      // @ts-expect-error - params will match the dynamic route segments
      router.replace({ pathname, params }, { locale: newLocale });
    });
  };

  const currentLocale = localesInfo.find((l) => l.code === locale) ?? localesInfo[0];

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

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="gap-2 rounded-full pr-4 pl-3"
            disabled={isPending}
          >
            <Globe className="h-4 w-4" />
            <span className="text-xs font-medium uppercase">
              {currentLocale.code}
            </span>

            <ChevronDown className="-ml-1 hidden h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-[140px]">
          {localesInfo.map((l) => (
            <DropdownMenuItem
              key={l.code}
              onClick={() => handleLocaleChange(l.code)}
              className={`cursor-pointer ${
                l.code === locale ? "bg-accent font-medium" : ""
              }`}
            >
              <span className="w-6 text-xs font-medium uppercase">
                {l.code}
              </span>
              <span>{l.label}</span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}

// Simple fallback when no intl context is available
function LanguageSwitcherFallback() {
  return (
    <Link href="/en">
      <Button variant="ghost" size="sm" className="gap-2 rounded-full px-3">
        <Globe className="h-4 w-4" />
        <span className="text-xs font-medium uppercase">EN</span>
      </Button>
    </Link>
  );
}

// Main export with error boundary
export function LanguageSwitcher() {
  return (
    <LanguageSwitcherErrorBoundary fallback={<LanguageSwitcherFallback />}>
      <LanguageSwitcherInner />
    </LanguageSwitcherErrorBoundary>
  );
}
