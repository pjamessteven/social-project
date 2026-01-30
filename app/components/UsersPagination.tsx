"use client";

import { useTranslations } from "next-intl";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "./ui/button";

interface UsersPaginationProps {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export default function UsersPagination({ pagination }: UsersPaginationProps) {
  const t = useTranslations("stories.pagination");
  const router = useRouter();
  const searchParams = useSearchParams();

  const navigateToPage = (page: number) => {
    const params = new URLSearchParams(searchParams);
    params.set("page", page.toString());

    const queryString = params.toString();
    router.push(`/stories?${queryString}`);
  };

  if (pagination.totalPages <= 1) {
    return null;
  }

  return (
    <div className="mt-8 flex justify-center gap-2">
      <Button
        variant="outline"
        disabled={!pagination.hasPrev}
        onClick={() => navigateToPage(pagination.page - 1)}
      >
        {t("previous")}
      </Button>

      <span className="flex items-center px-4">
        {t("pageInfo", {
          page: pagination.page,
          totalPages: pagination.totalPages,
        })}
      </span>

      <Button
        variant="outline"
        disabled={!pagination.hasNext}
        onClick={() => navigateToPage(pagination.page + 1)}
      >
        {t("next")}
      </Button>
    </div>
  );
}
