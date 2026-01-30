import type { Metadata } from "next";
import Script from "next/script";

import { locales, type Locale } from "@/i18n/routing";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { AuthInitializer } from "../components/auth/AuthInitializer";
import ScrollRestoration from "../components/content/ScrollRestoration";
import Header from "../components/ui/common/layout/header";
import { ContentWarningDialog } from "../components/ui/content-warning-dialog";
import { CustomChatInput } from "../components/ui/custom-chat-input";
import { isBot } from "../lib/isBot";

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const messages = await getMessages({ locale });

  return {
    title: (messages.metadata as { title: string }).title,
    description: (messages.metadata as { description: string }).description,
    openGraph: {
      title: (messages.metadata as { title: string }).title,
      description: (messages.metadata as { description: string }).description,
      url: "https://detrans.ai/",
      images: ["https://detrans.ai/x_card_lg.png"],
      siteName: "detrans.ai",
      locale: locale === "en" ? "en_US" : locale === "es" ? "es_ES" : "fr_FR",
      type: "website",
    },
    twitter: {
      images: ["https://detrans.ai/x_card_lg.png"],
      card: "summary_large_image",
      title: (messages.metadata as { title: string }).title,
      description: (messages.metadata as { description: string }).description,
    },
    alternates: {
      canonical: `https://detrans.ai/${locale}`,
      languages: {
        "en-US": "https://detrans.ai/en",
        "es-ES": "https://detrans.ai/es",
        "fr-FR": "https://detrans.ai/fr",
      },
    },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  // Ensure that the incoming `locale` is valid
  if (!locales.includes(locale as Locale)) {
    notFound();
  }

  // Enable static rendering
  setRequestLocale(locale as Locale);

  // Load messages for the current locale
  const messages = await getMessages({ locale });

  const h = await headers();
  const host = h.get("host") ?? "";
  const ua = h.get("user-agent");
  const bot = isBot(ua);

  return (
    <>
      <Script
        strategy="afterInteractive"
        src="https://cloud.umami.is/script.js"
        data-website-id={
          locale === "en"
            ? "01d08ff7-3d26-4387-9306-5fa1494bc272"
            : "fc721904-3b3a-479c-a5b6-34c76b32a457"
        }
      />
      <NextIntlClientProvider messages={messages} locale={locale}>
        <AuthInitializer />
        <ScrollRestoration />
        {!bot && <ContentWarningDialog host={host} />}
        <div className="relative flex h-[100dvh] flex-col">
          <Header mode="detrans" locale={locale} />
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
      </NextIntlClientProvider>
    </>
  );
}
