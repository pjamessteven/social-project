"use server";

import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { headers } from "next/headers";
import StoriesCharts from "../../components/charts/StoriesCharts";
import UserCard from "../../components/UserCard";
import UsersFilters from "../../components/UsersFilters";
import UsersPagination from "../../components/UsersPagination";
import { isBot } from "../../lib/isBot";

interface Tag {
  name: string;
  nameTranslation: string | null;
}

interface User {
  username: string;
  activeSince: string;
  sex: "m" | "f";
  experienceSummary: string | null;
  experienceSummaryTranslation: string | null;
  tags: Tag[];
  commentCount: number;
  transitionAge: number | null;
  detransitionAge: number | null;
}

interface UsersResponse {
  users: User[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

interface UsersPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

async function fetchUsers(searchParams: {
  [key: string]: string | string[] | undefined;
}) {
  const params = new URLSearchParams();

  const page = typeof searchParams.page === "string" ? searchParams.page : "1";
  params.set("page", page);
  params.set("limit", "20");

  if (searchParams.sex && typeof searchParams.sex === "string") {
    params.set("sex", searchParams.sex);
  }

  if (searchParams.tag && typeof searchParams.tag === "string") {
    params.set("tag", searchParams.tag);
  }

  if (searchParams.minAge && typeof searchParams.minAge === "string") {
    params.set("minAge", searchParams.minAge);
  }

  if (searchParams.maxAge && typeof searchParams.maxAge === "string") {
    params.set("maxAge", searchParams.maxAge);
  }

  if (searchParams.search && typeof searchParams.search === "string") {
    params.set("search", searchParams.search);
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
  const response = await fetch(`${baseUrl}/api/users?${params}`, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Failed to fetch users");
  }

  return response.json() as Promise<UsersResponse>;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "stories.metadata" });

  return {
    title: t("title"),
    description: t("description"),
    openGraph: {
      title: t("title"),
      description: t("description"),
      url: "https://detrans.ai/stories",
      siteName: "detrans.ai",
      images: ["https://detrans.ai/x_card_lg.png"],
      locale: locale === "es" ? "es_ES" : locale === "fr" ? "fr_FR" : "en_US",
      type: "website",
    },
  };
}

export default async function UsersPage({
  searchParams,
  params,
}: UsersPageProps & { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "stories" });

  const resolvedSearchParams = await searchParams;
  const data = await fetchUsers(resolvedSearchParams);
  const { users, pagination } = data;

  const h = await headers(); // both calls are async-safe
  const ua = (await headers()).get("user-agent");
  const bot = isBot(ua);

  return (
    <div className="container mx-auto px-0 pb-8 lg:pt-8">
      <div className="prose prose-base dark:prose-invert mb-8 max-w-full">
        <h1 className="text-3xl font-bold">
          {bot && (resolvedSearchParams.tag as string) + " "}
          {t("title")}
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          {t("subtitle", { count: pagination.total })}
        </p>
        <details className="cursor-pointer text-sm sm:text-base">
          <summary>
            <i>{t("disclaimer.summary")}</i>
          </summary>
          <div className="mt-2 mb-8 py-3 text-sm text-gray-600 sm:text-base dark:text-gray-400">
            {t("disclaimer.details")}
            <p />
            {t("disclaimer.accuracy")}
            <p />
            {t("disclaimer.inclusion")}
            <p />
            {t("disclaimer.verification")}
          </div>
        </details>
      </div>

      <StoriesCharts resolvedSearchParams={resolvedSearchParams} />

      <UsersFilters />

      {/* Results count */}
      <div className="mb-6 text-sm text-gray-600 dark:text-gray-400">
        {t("results", { showing: users.length, total: pagination.total })}
      </div>

      {/* Users List */}
      {users.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-gray-500">{t("noResults")}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {users.map((user) => (
            <UserCard key={user.username} user={user} />
          ))}
        </div>
      )}

      <UsersPagination pagination={pagination} />
    </div>
  );
}
