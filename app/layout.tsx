"use server";

import { Inter } from "next/font/google";
import Script from "next/script";

import "@llamaindex/chat-ui/styles/editor.css";
import "@llamaindex/chat-ui/styles/markdown.css";
import "@llamaindex/chat-ui/styles/pdf.css";
import { clsx } from "clsx";
import { ThemeProvider } from "next-themes";
import { headers } from "next/headers";
import Header from "./components/ui/chat/layout/header";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const h = await headers(); // both calls are async-safe
  const host = h.get("host") ?? ""; // genderaffirmation.ai | the-other.one
  const path = (await headers()).get("x-pathname") ?? "";
  const mode =
    host.includes("genderaffirmation.ai") || path.includes("/affirm")
      ? "affirm"
      : "detrans";

  return (
    <html lang="en" suppressHydrationWarning>
      <Script
        strategy="afterInteractive" // Change strategy
        src="https://cloud.umami.is/script.js"
        data-website-id={
          mode == "detrans"
            ? "01d08ff7-3d26-4387-9306-5fa1494bc272"
            : "fc721904-3b3a-479c-a5b6-34c76b32a457"
        }
      />
      <body
        className={clsx(
          inter.className,
          mode == "affirm"
            ? "bg-gradient-to-r from-[#5BCEFA]/20 via-[#FFFFFF]/20 to-[#F5A9B8]/20 dark:bg-gradient-to-r dark:from-[#5BCEFA]/20 dark:via-[#2D2D2D]/20 dark:to-[#F5A9B8]/20"
            : "bg-white dark:bg-black",
        )}
      >
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <Header mode={mode} />
          <div className="h-screen pt-14">
            <main className="flex h-full justify-center overflow-auto">
              <div className="w-full overflow-x-hidden p-4 sm:overflow-x-visible md:w-3xl">
                {children}
              </div>
            </main>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
