import { Link } from "@/i18n/routing";
import { ChevronRight, HandCoins } from "lucide-react";
import { useTranslations } from "next-intl";
import { Card, CardDescription, CardHeader, CardTitle } from "../ui/card";

export default function DonationCard({
  mode,
}: {
  mode: "detrans";
}) {
  const t = useTranslations("home.donate.card");
  return (
    <Link href="/donate" className="no-underline">
      <Card className="group !border-destructive/40 bg-destructive/5 dark:bg-destructive/40 relative cursor-pointer overflow-hidden rounded-xl border transition-all duration-500 hover:brightness-110">
        <div className="pointer-events-none absolute inset-0 left-0 w-[300%] translate-x-[-100%] bg-gradient-to-r from-white/20 via-white/10 to-transparent transition-transform duration-500 ease-in-out group-hover:translate-x-[0%] dark:via-white/10" />
        <CardHeader className="z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <HandCoins className="text-foreground mr-2 h-5 w-5" />
              <CardTitle className="text-foreground leading-normal dark:text-white">
                {t("title", {
                  site: "detrans.ai",
                })}
              </CardTitle>
            </div>
            <div className="flex items-center space-x-1">
              <ChevronRight className="text-destructive h-4 min-w-4 dark:text-white/40 dark:opacity-80" />
            </div>
          </div>
          <CardDescription className="z-10 mt-2">
            {t("description")}
            <br className="hidden md:inline" />
            {t("description2")}
          </CardDescription>
        </CardHeader>
      </Card>
    </Link>
  );
}
