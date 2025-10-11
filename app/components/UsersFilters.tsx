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
import { MultiSelect } from "./ui/multi-select";

interface UsersFiltersProps {
  availableTags: string[];
}

export default function UsersFilters({ availableTags }: UsersFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const selectedSex = searchParams.get("sex") || "";
  const selectedTags = searchParams.getAll("tag").flatMap(tag => tag.split(',').filter(Boolean));

  const updateSexFilter = (value: string) => {
    const params = new URLSearchParams(searchParams);
    
    if (value && value !== "all") {
      params.set("sex", value);
    } else {
      params.delete("sex");
    }
    
    // Reset to page 1 when filters change
    params.delete("page");
    
    const queryString = params.toString();
    router.push(`/stories${queryString ? `?${queryString}` : ""}`);
  };

  const updateTagsFilter = (tags: string[]) => {
    const params = new URLSearchParams(searchParams);
    
    // Clear existing tag params
    params.delete("tag");
    
    // Add new tags
    if (tags.length > 0) {
      params.set("tag", tags.join(','));
    }
    
    // Reset to page 1 when filters change
    params.delete("page");
    
    const queryString = params.toString();
    router.push(`/stories${queryString ? `?${queryString}` : ""}`);
  };

  const clearFilters = () => {
    router.push("/stories");
  };

  return (
    <div className="mb-6 space-y-4">
      <div className="flex flex-wrap gap-4 items-start">
        {/* Sex Filter */}
        <div className="flex flex-col gap-2 min-w-[120px]">
          <label className="text-sm font-medium">Sex</label>
          <Select
            value={selectedSex || "all"}
            onValueChange={updateSexFilter}
          >
            <SelectTrigger>
              <SelectValue placeholder="Male and Female" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Male and Female</SelectItem>
              <SelectItem value="f">Female</SelectItem>
              <SelectItem value="m">Male</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Tag Filter */}
        <div className="flex flex-col gap-2 min-w-[300px] flex-1">
          <label className="text-sm font-medium">Tags</label>
          <MultiSelect
            options={availableTags}
            selected={selectedTags}
            onChange={updateTagsFilter}
            placeholder="Select tags to filter by..."
          />
        </div>

        {/* Clear Filters */}
        {(selectedSex || selectedTags.length > 0) && (
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium invisible">Clear</label>
            <Button variant="outline" onClick={clearFilters}>
              Clear Filters
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
