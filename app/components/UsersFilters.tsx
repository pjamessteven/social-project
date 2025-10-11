"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "./ui/button";

interface UsersFiltersProps {
  availableTags: string[];
}

export default function UsersFilters({ availableTags }: UsersFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const selectedSex = searchParams.get("sex") || "";
  const selectedTag = searchParams.get("tag") || "";

  const updateFilters = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams);
    
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    
    // Reset to page 1 when filters change
    params.delete("page");
    
    const queryString = params.toString();
    router.push(`/users${queryString ? `?${queryString}` : ""}`);
  };

  const clearFilters = () => {
    router.push("/users");
  };

  return (
    <div className="mb-6 space-y-4">
      <div className="flex flex-wrap gap-4">
        {/* Sex Filter */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium">Sex:</label>
          <select
            value={selectedSex}
            onChange={(e) => updateFilters("sex", e.target.value)}
            className="px-3 py-2 border rounded-md bg-background"
          >
            <option value="">All</option>
            <option value="f">Female</option>
            <option value="m">Male</option>
          </select>
        </div>

        {/* Tag Filter */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium">Tag:</label>
          <select
            value={selectedTag}
            onChange={(e) => updateFilters("tag", e.target.value)}
            className="px-3 py-2 border rounded-md bg-background"
          >
            <option value="">All tags</option>
            {availableTags.map((tag) => (
              <option key={tag} value={tag}>
                {tag}
              </option>
            ))}
          </select>
        </div>

        {/* Clear Filters */}
        {(selectedSex || selectedTag) && (
          <div className="flex flex-col justify-end">
            <Button variant="outline" onClick={clearFilters}>
              Clear Filters
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
