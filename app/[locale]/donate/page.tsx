"use server";

import { getTranslations } from "next-intl/server";
import DonationBox from "../../components/content/DonationBox";

export default async function DonationPage() {
  const t = await getTranslations("donatePage");

  return (
    <div className="prose dark:prose-invert pb-16 lg:pt-8">
      <h2>{t("title")}</h2>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-1">
        <div className="">
          <p>{t.rich("description1", { b: (chunks) => <b>{chunks}</b> })}</p>
          <p>{t("description2")}</p>
          <p>{t("description3")}</p>

          <div className="mt-8 flex max-w-[400px] items-center overflow-hidden rounded-xl bg-white shadow-md dark:bg-gray-800">
            <DonationBox />
          </div>
          <div className="mt-4 mb-4 flex max-w-md items-center space-x-1 rounded-xl bg-white px-4 shadow-md dark:bg-gray-800">
            <div className="mb-4 flex-1 font-mono break-all">
              <p className="text-sm font-medium opacity-70">
                {t("bankAccount")}
              </p>
              {t("accountName")}: PETER STEVEN
              <br /> {t("accountNumber")}: 38-9011-0035365-00 (KIWINZ22)
              <br /> {t("swiftCode")}: KIWINZ22
            </div>
          </div>
          <div className="flex max-w-md items-center space-x-1 rounded-xl bg-white px-4 shadow-md dark:bg-gray-800">
            <div className="flex-1">
              <p className="text-sm font-medium opacity-70">{t("bitcoin")}</p>
              <p id="btc-address" className="font-mono break-all">
                bc1qtag945t26vspn7gnh9vaczqpgpkgqwf0j2l4ys
              </p>
            </div>
          </div>
        </div>
        <div className=""></div>
      </div>
    </div>
  );
}
