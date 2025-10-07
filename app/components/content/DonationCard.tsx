import { ExternalLink, HandCoins } from "lucide-react";
import Link from "next/link";
import { Button } from "../ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "../ui/card";

export default function DonationCard({ mode }: { mode: "detrans" | "affirm" }) {
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
            <CardTitle className="text-foreground">
              Donations needed to keep{" "}
              {mode === "detrans" ? "detrans.ai" : "genderaffirming.ai"} alive!
            </CardTitle>
          </div>
          <div
            className={
              "text-destructive flex items-center space-x-1 no-underline"
            }
          ></div>
        </div>
        <CardDescription className="mt-2 text-destructive/80 dark:text-primary/80 brightness-50 hover:underline dark:brightness-150">
          If you beleive in the cause please make a donation from the{" "}
          <Link href={"/donate"}>donation page.</Link> The site will be run in
          cache-only mode if I run out of money, with no ability to ask your own
          questions.
        </CardDescription>

        <Link href={"/donate"} className="mt-2">
          <Button variant={"destructive"}>
            Make a donation <ExternalLink className="ml-2 h-4" />
          </Button>
        </Link>
      </CardHeader>
    </Card>
  );
}
