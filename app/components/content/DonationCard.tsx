"use client";

import { ExternalLink, HandCoins } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { Button } from "../ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "../ui/card";

export default function DonationCard({
  mode,
}: {
  mode: "detrans" | "affirm" | "compare";
}) {
  const t = useTranslations("donate");
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
              {t("title", {
                site: "detrans.ai",
              })}
            </CardTitle>
          </div>
        </div>
        <CardDescription className="mt-2">
          {t("description")}
          <br className="hidden md:inline" />
          {t("description2")}
        </CardDescription>

        <Link href={"/donate"} className="mt-2">
          <Button variant={"destructive"}>
            {t("button")} <ExternalLink className="ml-2 h-4" />
          </Button>
        </Link>
      </CardHeader>
    </Card>
  );
}
