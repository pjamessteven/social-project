import { useTranslations } from "next-intl";
import { ChevronRight, MessageCircleQuestion } from "lucide-react";
import Link from "next/link";
import { Card, CardDescription, CardHeader, CardTitle } from "../ui/card";

export default function ParticipateCard() {
  const t = useTranslations();
  return (
    <Link prefetch={false} href={"/participate"} className="no-underline">
      <Card className="group bg-lizard-200/30 border-lizard-400 dark:border-lizard-600 dark:bg-lizard-900/70 relative cursor-pointer overflow-hidden rounded-xl border transition-all duration-500 hover:brightness-110">
        <div className="dark:[#17315b]/30 pointer-events-none absolute inset-0 left-0 w-[300%] translate-x-[-100%] bg-gradient-to-r from-white/20 via-white/10 to-transparent transition-transform duration-500 ease-in-out group-hover:translate-x-[0%] dark:via-white/10"></div>
        <CardHeader className="z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <MessageCircleQuestion className="text-foreground mr-2 h-5 w-5" />
              <CardTitle className="text-foreground dark:text-white">
                {t("participate.card.title")}
              </CardTitle>
            </div>
            <div className="flex items-center space-x-1">
              <ChevronRight className="h-4 min-w-4 text-[#1d3e72] dark:text-white/40 dark:opacity-80" />
            </div>
          </div>
          <CardDescription className="z-10 mt-2">
            {t("participate.card.description")}
            <span className="hidden sm:inline">
              {" "}
              {t("participate.card.description2")}
            </span>
          </CardDescription>
        </CardHeader>
      </Card>
    </Link>
  );
}
