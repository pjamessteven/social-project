import { createNavigation } from "next-intl/navigation";
import { defineRouting } from "next-intl/routing";
import { defaultLocale, locales, type Locale } from "./locales";

export { defaultLocale, locales };
export type { Locale };

// Define localized pathnames for each route (6 languages)
export const pathnames = {
  // Home
  "/": "/",

  // Static routes with translations
  "/about": {    en: "/about",    es: "/acerca-de",    fr: "/a-propos",    nl: "/over-ons",    no: "/om-oss",    uk: "/pro-nas",  },
  "/contact": {    en: "/contact",    es: "/contacto",    fr: "/contact",    nl: "/contact",    no: "/kontakt",    uk: "/kontakty",  },
  "/support": {    en: "/support",    es: "/apoyo",    fr: "/aide",    nl: "/steun",    no: "/stotte",    uk: "/pidtrymka",  },
  "/videos": {    en: "/videos",    es: "/videos",    fr: "/videos",    nl: "/videos",    no: "/videoer",    uk: "/video",  },
  "/stories": {    en: "/stories",    es: "/historias",    fr: "/histoires",    nl: "/verhalen",    no: "/historier",    uk: "/istoriyi",  },
  "/studies": {    en: "/studies",    es: "/estudios",    fr: "/etudes",    nl: "/studies",    no: "/studier",    uk: "/doslidzhennya",  },
  "/definitions": {    en: "/definitions",    es: "/definiciones",    fr: "/definitions",    nl: "/definities",    no: "/definisjoner",    uk: "/vyznachennya",  },
  "/donate": {    en: "/donate",    es: "/donar",    fr: "/faire-un-don",    nl: "/doneren",    no: "/doner",    uk: "/pozhertvuvaty",  },
  "/terms": {    en: "/terms",    es: "/terminos",    fr: "/conditions",    nl: "/voorwaarden",    no: "/vilkar",    uk: "/umovy",  },
  "/prompts": {    en: "/prompts",    es: "/instrucciones",    fr: "/instructions",    nl: "/instructies",    no: "/instruksjoner",    uk: "/instrukciyi",  },
  "/participate": {    en: "/participate",    es: "/participar",    fr: "/participer",    nl: "/deelnemen",    no: "/delta",    uk: "/vzyaty-uchast",  },
  "/conversations": {    en: "/conversations",    es: "/conversaciones",    fr: "/conversations",    nl: "/gesprekken",    no: "/samtaler",    uk: "/rozmovy",  },
  // Dynamic routes - keep data-driven parts as-is
  "/stories/[username]": {    en: "/stories/[username]",    es: "/historias/[username]",    fr: "/histoires/[username]",    nl: "/verhalen/[username]",    no: "/historier/[username]",    uk: "/istoriyi/[username]",  },
  "/videos/[slug]": {    en: "/videos/[slug]",    es: "/videos/[slug]",    fr: "/videos/[slug]",    nl: "/videos/[slug]",    no: "/videoer/[slug]",    uk: "/video/[slug]",  },
  "/chat": {    en: "/chat",    es: "/chat",    fr: "/chat",    nl: "/chat",    no: "/chat",    uk: "/chat",  },
  "/chat/[uuid]": {    en: "/chat/[uuid]",    es: "/chat/[uuid]",    fr: "/chat/[uuid]",    nl: "/chat/[uuid]",    no: "/chat/[uuid]",    uk: "/chat/[uuid]",  },
  "/research": {    en: "/research",    es: "/investigacion",    fr: "/recherche",    nl: "/onderzoek",    no: "/forskning",    uk: "/doslidzhennya-det",  },
  "/research/[question]": {    en: "/research/[question]",    es: "/investigacion/[question]",    fr: "/recherche/[question]",    nl: "/onderzoek/[question]",    no: "/forskning/[question]",    uk: "/doslidzhennya-det/[question]",  },
  "/login": {    en: "/login",    es: "/iniciar-sesion",    fr: "/connexion",    nl: "/inloggen",    no: "/logg-inn",    uk: "/uviyty",  },
} as const;

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
 * Supports 6 languages for translation purposes
 */
export const getLanguageName = (locale: string): string => {
  const languageNames: Record<string, string> = {
    en: "English",
    es: "Spanish",
    fr: "French",
    nl: "Dutch",
    no: "Norwegian",
    uk: "Ukrainian",
  };
  return languageNames[locale] || locale.toUpperCase();
};
