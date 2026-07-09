"use client";

import { useTranslations } from "next-intl";

export default function TermsPage() {
  const t = useTranslations("terms");
  const tOS = useTranslations("termsOfService");

  return (
    <div className="prose dark:prose-invert pb-16 lg:pt-8">
      <h1 className="text-3xl font-bold">{t("title")}</h1>
      <p>{t("intro")}</p>
      <ol>
        <li>
          <b>{t("sections.informationWeCollect.title")}</b>
          <ol type="a">
            <li>
              <b>{t("sections.informationWeCollect.chatMessages.title")}</b>
              <br />
              {t("sections.informationWeCollect.chatMessages.content")}
            </li>
            <li>
              <b>{t("sections.informationWeCollect.cookies.title")}</b> <br />
              {t.rich("sections.informationWeCollect.cookies.content", {
                em: (chunks) => <em>{chunks}</em>,
              })}
            </li>
            <li>
              <b>{t("sections.informationWeCollect.ipAddresses.title")}</b>
              <br />
              {t("sections.informationWeCollect.ipAddresses.content")}
            </li>
            <li>
              <b>{t("sections.informationWeCollect.optionalData.title")}</b>
              <br />
              {t("sections.informationWeCollect.optionalData.content")}
            </li>
            <li>
              <b>{t("sections.informationWeCollect.aiProviders.title")}</b>
              <br />
              {t("sections.informationWeCollect.aiProviders.content")}
            </li>
            <li>
              <b>{t("sections.informationWeCollect.captcha.title")}</b>
              <br />
              {t.rich("sections.informationWeCollect.captcha.content", {
                em: (chunks) => <em>{chunks}</em>,
              })}
            </li>
          </ol>
        </li>

        <li>
          <b>{t("sections.legalBases.title")}</b>
          <ol type="a">
            <li>
              {t.rich("sections.legalBases.item1", {
                em: (chunks) => <em>{chunks}</em>,
              })}
            </li>
            <li>
              {t.rich("sections.legalBases.item2", {
                em: (chunks) => <em>{chunks}</em>,
              })}
            </li>
          </ol>
        </li>

        <li>
          <b>{t("sections.dataRetention.title")}</b>
          <br />
          {t("sections.dataRetention.content")}
        </li>

        <li>
          <b>{t("sections.thirdPartySharing.title")}</b>
          <br />
          {t("sections.thirdPartySharing.content")}
        </li>

        <li>
          <b>{t("sections.security.title")}</b>
          <br />
          {t("sections.security.content")}
        </li>

        <li>
          <b>{t("sections.internationalTransfers.title")}</b>
          <br />
          {t("sections.internationalTransfers.content")}
        </li>

        <li>
          <b>{t("sections.childrensPrivacy.title")}</b>
          <br />
          {t("sections.childrensPrivacy.content")}
        </li>

        <li>
          <b>{t("sections.changes.title")}</b> <br />
          {t("sections.changes.content")}
        </li>

        <li>
          <b>{t("sections.contact.title")}</b> <br />
          {t.rich("sections.contact.content", {
            email: (chunks) => <b>{chunks}</b>,
          })}
        </li>
      </ol>

      <div className="mt-12 border-t pt-8">
        <h2 className="text-2xl font-bold">{tOS("title")}</h2>
        <p>{tOS("intro")}</p>
        <ol>
          <li>
            <b>{tOS("sections.acceptableUse.title")}</b>
            <br />
            {tOS("sections.acceptableUse.content")}
          </li>
          <li>
            <b>{tOS("sections.publicConversations.title")}</b>
            <br />
            {tOS("sections.publicConversations.content")}
          </li>
          <li>
            <b>{tOS("sections.disclaimer.title")}</b>
            <br />
            {tOS("sections.disclaimer.content")}
          </li>
          <li>
            <b>{tOS("sections.liability.title")}</b>
            <br />
            {tOS("sections.liability.content")}
          </li>
          <li>
            <b>{tOS("sections.changes.title")}</b>
            <br />
            {tOS("sections.changes.content")}
          </li>
        </ol>
      </div>
    </div>
  );
}
