import { getAllPagesWithSlugs, getLocalizedValue } from "@/app/lib/pages";
import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

/**
 * Share image for a wiki page (/api/og/topic?path=...&locale=...): the page
 * title in the style of the site card (public/x_card_lg.png), with its lizard.
 */

const WIDTH = 1200;
const HEIGHT = 630;

// The default ImageResponse font only covers Latin; other scripts fall back
// to the English title rather than rendering missing glyphs.
const LATIN_ONLY = /^[\p{Script=Latin}\p{N}\p{P}\p{S}\p{Zs}]+$/u;

let interSemiBold: Promise<Buffer> | null = null;
function getInterSemiBold(): Promise<Buffer> {
  // Inter is the site font; the default ImageResponse font has no bold.
  interSemiBold ??= readFile(
    join(process.cwd(), "public", "fonts", "Inter-SemiBold.otf"),
  );
  return interSemiBold;
}

let cardDataUrl: Promise<string> | null = null;
function getCardDataUrl(): Promise<string> {
  cardDataUrl ??= readFile(join(process.cwd(), "public", "x_card_lg.png")).then(
    (data) => `data:image/png;base64,${data.toString("base64")}`,
  );
  return cardDataUrl;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const path = searchParams.get("path") ?? "";
  const locale = searchParams.get("locale") ?? "en";

  const entry = (await getAllPagesWithSlugs()).find(
    (item) => item.page.path === path && item.page.published,
  );
  if (!entry) return new Response("Not found", { status: 404 });

  const localized =
    getLocalizedValue(entry.page.titleTranslation, locale, entry.page.title) ??
    entry.page.title;
  const title = LATIN_ONLY.test(localized) ? localized : entry.page.title;
  const [card, font] = await Promise.all([
    getCardDataUrl(),
    getInterSemiBold(),
  ]);

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        background: "#ffffff",
        fontFamily: "Inter",
        padding: "0 72px",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          flex: 1,
          paddingRight: 32,
        }}
      >
        <div
          style={{
            fontSize: 48,
            fontWeight: 600,
            color: "#d1d5db",
            marginBottom: 12,
          }}
        >
          detrans.ai
        </div>
        <div
          style={{
            fontSize: title.length > 60 ? 54 : 66,
            fontWeight: 600,
            color: "#000000",
            lineHeight: 1.12,
            letterSpacing: -1,
          }}
        >
          {title}
        </div>
      </div>
      {/* Lizard: the right-hand part of the site card, cropped. */}
      <div
        style={{
          display: "flex",
          width: 300,
          height: 400,
          overflow: "hidden",
          position: "relative",
        }}
      >
        <img
          src={card}
          width={764}
          height={400}
          alt=""
          style={{ position: "absolute", left: -470, top: 0 }}
        />
      </div>
    </div>,
    {
      width: WIDTH,
      height: HEIGHT,
      fonts: [{ name: "Inter", data: font, weight: 600, style: "normal" }],
      headers: {
        "Cache-Control":
          "public, s-maxage=86400, stale-while-revalidate=604800",
      },
    },
  );
}
