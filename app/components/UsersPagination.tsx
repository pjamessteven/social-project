"use client";

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
  const router = useRouter();
  const searchParams = useSearchParams();

  const navigateToPage = (page: number) => {
    const params = new URLSearchParams(searchParams);
    params.set("page", page.toString());
    
    const queryString = params.toString();
    router.push(`/users?${queryString}`);
  };

  if (pagination.totalPages <= 1) {
    return null;
  }

  return (
    <div className="flex justify-center gap-2 mt-8">
      <Button
        variant="outline"
        disabled={!pagination.hasPrev}
        onClick={() => navigateToPage(pagination.page - 1)}
      >
        Previous
      </Button>
      
      <span className="flex items-center px-4">
        Page {pagination.page} of {pagination.totalPages}
      </span>
      
      <Button
        variant="outline"
        disabled={!pagination.hasNext}
        onClick={() => navigateToPage(pagination.page + 1)}
      >
        Next
      </Button>
    </div>
  );
}
