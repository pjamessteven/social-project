"use server";

import { Inter } from "next/font/google";
import Script from "next/script";

import "@llamaindex/chat-ui/styles/editor.css";
import "@llamaindex/chat-ui/styles/markdown.css";
import "@llamaindex/chat-ui/styles/pdf.css";
import { clsx } from "clsx";
import { ThemeProvider } from "next-themes";
import { headers } from "next/headers";
import ScrollRestoration from "./components/content/ScrollRestoration";
import { CustomChatInput } from "./components/ui/chat/custom-chat-input";
import Header from "./components/ui/chat/layout/header";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const h = await headers(); // both calls are async-safe
  const host = h.get("host") ?? ""; // genderaffirming.ai |
  const path = (await headers()).get("x-pathname") ?? "";
  const baseMode =
    host.includes("genderaffirming.ai") || path.includes("/affirm")
      ? "affirm"
      : "detrans";

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta
          name="theme-color"
          content="#FFFFFF"
          media="(prefers-color-scheme: light)"
        />

        <meta
          name="theme-color"
          content="#000000"
          media="(prefers-color-scheme: dark)"
        />
      </head>
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
          <div className="relative flex h-[100dvh] flex-col">
            <Header mode={baseMode} />
            <main
              className={
                "flex h-full min-h-0 flex-1 flex-row justify-center overflow-x-hidden overflow-y-auto"
              }
            >
              <div className="h-full w-full overflow-x-hidden overflow-y-visible p-4 sm:overflow-x-visible md:w-3xl">
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
