import { Inter } from "next/font/google";

import "@llamaindex/chat-ui/styles/editor.css";
import "@llamaindex/chat-ui/styles/markdown.css";
import "@llamaindex/chat-ui/styles/pdf.css";
import { clsx } from "clsx";
import { Viewport } from "next";
import { ThemeProvider } from "next-themes";
import { headers } from "next/headers";
import "./globals.css";
import { isRTL, locales, defaultLocale } from "@/i18n/locales";

const themeScript = `
  (function() {
    function getTheme() {
      const theme = localStorage.getItem('theme') || 'system';
      if (theme === 'system') {
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      }
      return theme;
    }
    const theme = getTheme();
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  })();
`;

const inter = Inter({ subsets: ["latin"] });

const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "white" },
    { media: "(prefers-color-scheme: dark)", color: "black" },
  ],
};

export async function generateViewport(): Promise<Viewport> {
  return viewport;
}

function extractLocaleFromPath(pathname: string): string {
  // Remove leading slash and get first segment
  const segments = pathname.replace(/^\//, "").split("/");
  const firstSegment = segments[0];

  // Check if it's a valid locale
  if (firstSegment && locales.includes(firstSegment)) {
    return firstSegment;
  }

  return defaultLocale;
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const h = await headers();
  const host = h.get("host") ?? "";
  const path = h.get("x-pathname") ?? "";

  const locale = extractLocaleFromPath(path);
  const dir = isRTL(locale) ? "rtl" : "ltr";

  return (
    <html lang={locale} dir={dir} suppressHydrationWarning>
      <body
        className={clsx(
          inter.className,
          "text-primary! dark:text-primary! bg-white transition-colors dark:bg-black",
        )}
      >
        <script
          dangerouslySetInnerHTML={{
            __html: themeScript,
          }}
        />
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
