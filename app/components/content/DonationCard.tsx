import { useTranslations } from "next-intl";
import { ExternalLink, HandCoins } from "lucide-react";
import Link from "next/link";
import { Button } from "../ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "../ui/card";

export default function DonationCard({ 
  mode,
}: {
  mode: "detrans" | "affirm" | "compare";
}) {
  return (
    <Card
      className={
        "!border-destructive reddit-card bg-destructive/5 dark:bg-destructive/40 border transition-all duration-300"
      }
    >
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <HandCoins className="text-foreground mr-2 h-5 w-5" />
            <CardTitle className="text-foreground dark:text-white">
              {t("donate.card.title", {
                site: mode === "affirm" ? "genderaffirming.ai" : "detrans.ai",
              })}
            </CardTitle>
          </div>
        </div>
        <CardDescription className="mt-2">
          {t("donate.card.description")}
          <br className="hidden md:inline" />
          {t("donate.card.description2")}
        </CardDescription>

        <Link href={"/donate"} className="mt-2">
          <Button variant={"destructive"}>
            {t("donate.card.button")} <ExternalLink className="ml-2 h-4" />
          </Button>
        </Link>
      </CardHeader>
    </Card>
  );
}
