"use client";

import { useTranslations } from "next-intl";

export default function TermsPage() {
  const t = useTranslations("terms");

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
    </div>
  );
}
