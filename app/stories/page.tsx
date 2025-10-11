import { ChevronRight } from "lucide-react";
import { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import AgeDistributionChart from "../components/charts/AgeDistributionChart";
import { Badge } from "../components/ui/badge";
import UsersFilters from "../components/UsersFilters";
import UsersPagination from "../components/UsersPagination";
import { isBot } from "../lib/isBot";

interface User {
  username: string;
  activeSince: string;
  sex: "m" | "f";
  experienceSummary: string | null;
  tags: string[];
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

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
  const response = await fetch(`${baseUrl}/api/users?${params}`, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Failed to fetch users");
  }

  return response.json() as Promise<UsersResponse>;
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString();
}

export const metadata: Metadata = {
  title: "detrans.ai | Detransition Stories and Timelines",
  description:
    "Browse detransition experiences from members of the /r/detrans Reddit community, the largest open collection of detransition stories on the internet.",
  openGraph: {
    title: "detrans.ai | Detransition Stories and Timelines",
    description:
      "Browse detransition experiences from members of the /r/detrans Reddit community, the largest open collection of detransition stories on the internet.",
    url: "https://detrans.ai/stories",
    siteName: "detrans.ai",
    images: ["https://detrans.ai/x_lg.png"],
    locale: "en_US",
    type: "website",
  },
};

export default async function UsersPage({ searchParams }: UsersPageProps) {
  const resolvedSearchParams = await searchParams;
  const data = await fetchUsers(resolvedSearchParams);
  const { users, pagination } = data;

  const h = await headers(); // both calls are async-safe
  const ua = (await headers()).get("user-agent");
  const bot = isBot(ua);

  return (
    <div className="container mx-auto px-0 pb-8 lg:pt-8">
      <div className="prose sm:prose-base prose-sm dark:prose-invert mb-8 max-w-full">
        <h1 className="text-3xl font-bold">
          {bot && searchParams.tag + " "}Detransition Stories and Timelines
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Browse detransition experiences from members of the{" "}
          <a
            href="https://reddit.com/r/detrans"
            target="_blank"
            className="underline"
          >
            /r/detrans
          </a>{" "}
          Reddit community, the largest open collection of detransition stories
          on the internet.
        </p>
        <p className="text-gray-600 dark:text-gray-400">
          On Reddit, people often share their experiences across multiple
          comments or posts. To make this information more accessible, our AI
          gathers all of those scattered pieces into a single, easy-to-read
          summary and timeline. All system prompts are noted on the{" "}
          <Link href={"/prompts"}>prompts page</Link>.
        </p>
        <p className="text-gray-600 dark:text-gray-400">
          Every user has been analysed for signs of bot generated or inauthentic
          content. Any account that does not appear to be a genuine
          de-transitioner is flagged 'suspicious'. These accounts will be
          reviewed and removed from the detrans.ai dataset. Accounts that have
          made fewer than five comments have been ommitted from analysis.
        </p>
      </div>

      <UsersFilters />

      <AgeDistributionChart 
        className="mb-8" 
        minAge={typeof resolvedSearchParams.minAge === "string" ? parseInt(resolvedSearchParams.minAge) : 10}
        maxAge={typeof resolvedSearchParams.maxAge === "string" ? parseInt(resolvedSearchParams.maxAge) : 40}
      />

      {/* Results count */}
      <div className="mb-6 text-sm text-gray-600 dark:text-gray-400">
        Showing {users.length} of {pagination.total} users
      </div>

      {/* Users List */}
      {users.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-gray-500">No users found matching your filters.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {users.map((user) => (
            <Link
              key={user.username}
              href={`/stories/${encodeURIComponent(user.username)}`}
              className="block border-t pt-6 transition-colors sm:rounded-lg sm:border sm:p-6 sm:hover:bg-gray-50 sm:dark:hover:bg-gray-800"
            >
              <div className="flex w-full grow flex-row items-center justify-between">
                <div className="mb-2 flex grow flex-col items-start justify-between sm:flex-row">
                  <h3 className="text-lg font-semibold">/u/{user.username}</h3>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">
                      {user.commentCount} comments • Posting since{" "}
                      {formatDate(user.activeSince)}
                    </span>
                  </div>
                </div>
                <ChevronRight className="mb-3 h-6 sm:hidden" />
              </div>
              <div className="font-medium mb-2 text-sm sm:text-base text-gray-700 dark:text-gray-300">
                {user.transitionAge && "Transitioned at " + user.transitionAge}
                {user.detransitionAge && user.transitionAge && " -> "}
                {user.detransitionAge &&
                  (user.tags.includes('only transitioned socially') ? "Desisted at " : "Detransitioned at ") + user.detransitionAge}
              </div>
              {user.experienceSummary && (
                <p className="prose-sm sm:prose-base mb-4 text-gray-700 dark:text-gray-300">
                  {user.experienceSummary}
                </p>
              )}

              {user.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  <Badge variant={"inverted"}>
                    {user.sex === "f" ? "female" : "male"}
                  </Badge>
                  {user.tags.map((tag) => (
                    <Badge
                      key={tag}
                      variant={
                        tag === "suspicious account"
                          ? "destructive"
                          : "inverted"
                      }
                    >
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
            </Link>
          ))}
        </div>
      )}

      <UsersPagination pagination={pagination} />
    </div>
  );
}
