"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "./ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";

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
    
    if (value && value !== "all") {
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
      <div className="flex flex-wrap gap-4 items-end">
        {/* Sex Filter */}
        <div className="flex flex-col gap-2 min-w-[120px]">
          <label className="text-sm font-medium">Sex:</label>
          <Select
            value={selectedSex || "all"}
            onValueChange={(value) => updateFilters("sex", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="All" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="f">Female</SelectItem>
              <SelectItem value="m">Male</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Tag Filter */}
        <div className="flex flex-col gap-2 min-w-[200px]">
          <label className="text-sm font-medium">Tag:</label>
          <Select
            value={selectedTag || "all"}
            onValueChange={(value) => updateFilters("tag", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="All tags" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All tags</SelectItem>
              {availableTags.map((tag) => (
                <SelectItem key={tag} value={tag}>
                  {tag}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Clear Filters */}
        {(selectedSex || selectedTag) && (
          <Button variant="outline" onClick={clearFilters}>
            Clear Filters
          </Button>
        )}
      </div>
    </div>
  );
}
