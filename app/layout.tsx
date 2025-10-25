
import { Inter } from "next/font/google";
import Script from "next/script";

import "@llamaindex/chat-ui/styles/editor.css";
import "@llamaindex/chat-ui/styles/markdown.css";
import "@llamaindex/chat-ui/styles/pdf.css";
import { clsx } from "clsx";
import { Metadata, Viewport } from "next";
import { ThemeProvider } from "next-themes";
import { headers } from "next/headers";
import ScrollRestoration from "./components/content/ScrollRestoration";
import { CustomChatInput } from "./components/ui/research/custom-chat-input";
import Header from "./components/ui/common/layout/header";
import { ContentWarningDialog } from "./components/ui/content-warning-dialog";
import "./globals.css";
import { isBot } from "./lib/isBot";

const inter = Inter({ subsets: ["latin"] });

const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: 'white' },
    { media: '(prefers-color-scheme: dark)', color: 'black' },
  ],
}

export async function generateViewport(): Promise<Viewport> {
  return viewport
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const h = await headers(); // both calls are async-safe
  const host = h.get("host") ?? ""; // genderaffirming.ai |
  const ua = (await headers()).get("user-agent");
  const bot = isBot(ua);
  const path = (await headers()).get("x-pathname") ?? "";
  const baseMode =
    host.includes("genderaffirming.ai") || path.includes("/affirm")
      ? "affirm"
      : "detrans";

  return (
    <html lang="en" suppressHydrationWarning>
      <Script
        strategy="afterInteractive" // Change strategy
        src="https://cloud.umami.is/script.js"
        data-website-id={
          baseMode == "detrans"
            ? "01d08ff7-3d26-4387-9306-5fa1494bc272"
            : "fc721904-3b3a-479c-a5b6-34c76b32a457"
        }
      />
      <body
        className={clsx(
          inter.className,
          baseMode == "affirm"
            ? "bg-gradient-to-r from-[#5BCEFA]/15 via-[#FFFFFF]/15 to-[#F5A9B8]/15 dark:bg-gradient-to-r dark:from-[#5BCEFA]/10 dark:via-[#2D2D2D]/10 dark:to-[#F5A9B8]/10"
            : "bg-white dark:bg-black",
        )}
      >
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <ScrollRestoration />
          {!bot && <ContentWarningDialog host={host} />}
          <div className="relative flex h-[100dvh] flex-col">
            <Header mode={baseMode} />
            <main
              className={
                "flex h-full min-h-0 flex-1 flex-row justify-center overflow-x-hidden overflow-y-auto"
              }
            >
              <div className="h-full w-full overflow-x-hidden overflow-x-visible overflow-y-visible p-4 md:w-3xl">
                {children}
              </div>
            </main>
            <CustomChatInput host={host} />
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
