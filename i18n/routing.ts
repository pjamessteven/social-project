import { createNavigation } from "next-intl/navigation";
import { defineRouting } from "next-intl/routing";
import { defaultLocale, locales, type Locale } from "./locales";

export { defaultLocale, locales };
export type { Locale };

// Define localized pathnames for each route (3 languages)
export const pathnames = {
  // Home
  "/": "/",

  // Static routes with translations
  "/about": {    en: "/about",    es: "/acerca-de",    fr: "/a-propos",  },
  "/contact": {    en: "/contact",    es: "/contacto",    fr: "/contact",  },
  "/support": {    en: "/support",    es: "/apoyo",    fr: "/aide",  },
  "/videos": {    en: "/videos",    es: "/videos",    fr: "/videos",  },
  "/stories": {    en: "/stories",    es: "/historias",    fr: "/histoires",  },
  "/studies": {    en: "/studies",    es: "/estudios",    fr: "/etudes",  },
  "/definitions": {    en: "/definitions",    es: "/definiciones",    fr: "/definitions",  },
  "/donate": {    en: "/donate",    es: "/donar",    fr: "/faire-un-don",  },
  "/terms": {    en: "/terms",    es: "/terminos",    fr: "/conditions",  },
  "/prompts": {    en: "/prompts",    es: "/instrucciones",    fr: "/instructions",  },
  "/participate": {    en: "/participate",    es: "/participar",    fr: "/participer",  },
  "/conversations": {    en: "/conversations",    es: "/conversaciones",    fr: "/conversations",  },
  // Dynamic routes - keep data-driven parts as-is
  "/stories/[username]": {    en: "/stories/[username]",    es: "/historias/[username]",    fr: "/histoires/[username]",  },
  "/videos/[slug]": {    en: "/videos/[slug]",    es: "/videos/[slug]",    fr: "/videos/[slug]",  },
  "/chat": {    en: "/chat",    es: "/chat",    fr: "/chat",  },
  "/chat/[uuid]": {    en: "/chat/[uuid]",    es: "/chat/[uuid]",    fr: "/chat/[uuid]",  },
  "/research": {    en: "/research",    es: "/investigacion",    fr: "/recherche",  },
  "/research/[question]": {    en: "/research/[question]",    es: "/investigacion/[question]",    fr: "/recherche/[question]",  },
  "/login": {    en: "/login",    es: "/iniciar-sesion",    fr: "/connexion",  },} as const;

export const routing = defineRouting({
  locales: locales as readonly string[],
  defaultLocale,
  localePrefix: "always", // Use "as-needed" if you don't want /en in URL for default locale
  pathnames,
});

// Lightweight wrappers around Next.js' navigation APIs
// that consider the routing configuration
export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);

/**
 * Maps locale codes to full language names
 * Supports 3 languages for translation purposes
 */
export const getLanguageName = (locale: string): string => {
  const languageNames: Record<string, string> = {
    en: "English",
    es: "Spanish",
    fr: "French",
  };
  return languageNames[locale] || locale.toUpperCase();
};
