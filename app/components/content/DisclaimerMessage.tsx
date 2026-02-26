import { useTranslations } from "next-intl";

export default function DisclaimerMessage() {
  const t = useTranslations();

  return (
    <div className="max-w-screen">
      <div className="flex flex-col items-center justify-center gap-2 border-b px-4 pb-4 sm:flex-row sm:items-center sm:px-0">
        <div className="text-muted-foreground text-left text-sm sm:text-center">
          {t("home.privacyDisclaimer")}
        </div>
      </div>
    </div>
  );
}
