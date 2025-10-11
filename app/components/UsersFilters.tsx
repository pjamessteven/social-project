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
import { Badge } from "./ui/badge";
import { X } from "lucide-react";

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

  const toggleTag = (tag: string) => {
    const params = new URLSearchParams(searchParams);
    const currentTags = params.getAll("tag").flatMap(t => t.split(',').filter(Boolean));
    
    let newTags;
    if (currentTags.includes(tag)) {
      // Remove tag
      newTags = currentTags.filter(t => t !== tag);
    } else {
      // Add tag
      newTags = [...currentTags, tag];
    }
    
    // Clear existing tag params
    params.delete("tag");
    
    // Add new tags
    if (newTags.length > 0) {
      params.set("tag", newTags.join(','));
    }
    
    // Reset to page 1 when filters change
    params.delete("page");
    
    const queryString = params.toString();
    router.push(`/stories${queryString ? `?${queryString}` : ""}`);
  };

  const removeTag = (tagToRemove: string) => {
    toggleTag(tagToRemove);
  };

  const clearFilters = () => {
    router.push("/stories");
  };

  return (
    <div className="mb-6 space-y-4">
      <div className="flex flex-wrap gap-4 items-start">
        {/* Sex Filter */}
        <div className="flex flex-col gap-2 min-w-[120px]">
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
        <div className="flex flex-col gap-2 min-w-[200px] flex-1">
          <Select onValueChange={toggleTag}>
            <SelectTrigger>
              <SelectValue placeholder="Select tags to filter by" />
            </SelectTrigger>
            <SelectContent>
              {availableTags.map((tag) => (
                <SelectItem 
                  key={tag} 
                  value={tag}
                  className={selectedTags.includes(tag) ? "bg-accent" : ""}
                >
                  <div className="flex items-center justify-between w-full">
                    <span>{tag}</span>
                    {selectedTags.includes(tag) && (
                      <span className="ml-2 text-xs">✓</span>
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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

      {/* Selected Tags Display */}
      {selectedTags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <span className="text-sm font-medium">Selected tags:</span>
          {selectedTags.map((tag) => (
            <Badge key={tag} variant="secondary" className="flex items-center gap-1">
              {tag}
              <button
                onClick={() => removeTag(tag)}
                className="ml-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
