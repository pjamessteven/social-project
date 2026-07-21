"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useCaptcha } from "@/app/hooks/useCaptcha";
import { HCaptchaDialog } from "../../components/ui/hcaptcha-dialog";
import { Input } from "../../components/ui/input";
import { Textarea } from "../../components/ui/textarea";

export default function ContactForm() {
  const t = useTranslations("contact");
  const [form, setForm] = useState({
    name: "",
    subject: "",
    email: "",
    message: "",
  });
  const [status, setStatus] = useState("");

  const { showCaptchaDialog, setShowCaptchaDialog, verifyCaptcha } =
    useCaptcha();

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const submitForm = async () => {
    const res = await fetch("/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, site: "detrans" }),
    });

    return res;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus(t("form.sending"));

    try {
      const res = await submitForm();
      const data = await res.json();

      if (res.status === 402 && data.requiresCaptcha) {
        setShowCaptchaDialog(true);
        setStatus("");
        return;
      }

      setStatus(data.success ? t("form.success") : t("form.error"));
    } catch {
      setStatus(t("form.error"));
    }
  };

  const handleCaptchaVerify = async (token: string) => {
    const result = await verifyCaptcha(token);

    if (result.success) {
      setShowCaptchaDialog(false);
      setStatus(t("form.sending"));

      try {
        const res = await submitForm();
        const data = await res.json();
        setStatus(data.success ? t("form.success") : t("form.error"));
      } catch {
        setStatus(t("form.error"));
      }
    }
  };

  const handleCaptchaClose = () => {
    setShowCaptchaDialog(false);
  };

  return (
    <div className="prose dark:prose-invert pb-16 lg:pt-8">
      <h1 className="text-3xl font-bold">{t("title")}</h1>
      <p>{t("intro")}</p>
      <div className="mx-auto w-full max-w-2xl rounded-2xl border bg-white p-8 pb-16 lg:pt-8 dark:border-none dark:bg-gray-900">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              {t("form.to")}
            </label>
            <Input
              readOnly
              value="Peter James Steven"
              className="pointer-events-none w-full rounded-lg bg-gray-100 p-3 opacity-50 dark:bg-gray-800 dark:text-gray-100"
            />
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {" "}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t("form.name")}
              </label>
              <Input
                name="name"
                type="text"
                placeholder={t("form.namePlaceholder")}
                value={form.name}
                onChange={handleChange}
                required
                className="w-full rounded-lg border-gray-300 p-3 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t("form.email")}
              </label>
              <Input
                name="email"
                type="email"
                placeholder={t("form.emailPlaceholder")}
                value={form.email}
                onChange={handleChange}
                required
                className="w-full rounded-lg border-gray-300 p-3 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              {t("form.subject")}
            </label>
            <Input
              name="subject"
              type="text"
              placeholder={t("form.subjectPlaceholder")}
              value={form.subject}
              onChange={handleChange}
              required
              className="w-full rounded-lg border-gray-300 p-3 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              {t("form.message")}
            </label>
            <Textarea
              name="message"
              placeholder={t("form.messagePlaceholder")}
              value={form.message}
              onChange={handleChange}
              required
              rows={5}
              className="w-full rounded-lg border-gray-300 p-3 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
            />
          </div>

          <button
            type="submit"
            className="w-full rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white transition hover:bg-blue-700"
          >
            {t("form.sendButton")}
          </button>
        </form>

        {status && (
          <p className="mt-4 text-center text-sm text-gray-600 dark:text-gray-400">
            {status}
          </p>
        )}
      </div>

      <HCaptchaDialog
        isOpen={showCaptchaDialog}
        onClose={handleCaptchaClose}
        onVerify={handleCaptchaVerify}
        siteKey={process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY || ""}
      />
    </div>
  );
}
