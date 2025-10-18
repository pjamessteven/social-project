"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { MultiSelect } from "./ui/multi-select";
import { Slider } from "./ui/slider";
import { Search, Loader2 } from "lucide-react";

interface Tag {
  id: number;
  name: string;
  userCount: number;
}

interface UsersFiltersProps {}

export default function UsersFilters({}: UsersFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchLoading, setSearchLoading] = useState(false);
  
  const selectedSex = searchParams.get("sex") || "";
  const selectedTags = searchParams.getAll("tag").flatMap(tag => tag.split(',').filter(Boolean));
  const [searchQuery, setSearchQuery] = useState(searchParams.get("search") || "");
  const [ageRange, setAgeRange] = useState(() => {
    const minAge = searchParams.get("minAge") ? parseInt(searchParams.get("minAge")!) : 5;
    const maxAge = searchParams.get("maxAge") ? parseInt(searchParams.get("maxAge")!) : 80;
    return [minAge, maxAge];
  });

  useEffect(() => {
    async function fetchTags() {
      try {
        const response = await fetch('/api/tags');
        if (response.ok) {
          const data = await response.json();
          setTags(data.tags);
        }
      } catch (error) {
        console.error('Failed to fetch tags:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchTags();
  }, []);

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

  const updateAgeFilter = (newRange: number[]) => {
    setAgeRange(newRange);
    
    const params = new URLSearchParams(searchParams);
    params.set('minAge', newRange[0].toString());
    params.set('maxAge', newRange[1].toString());
    params.delete('page'); // Reset to first page when filtering
    
    const queryString = params.toString();
    router.push(`/stories${queryString ? `?${queryString}` : ""}`);
  };

  const updateSearchFilter = useCallback((query: string) => {
    setSearchLoading(true);
    
    const params = new URLSearchParams(searchParams);
    
    if (query.trim()) {
      params.set("search", query.trim());
    } else {
      params.delete("search");
    }
    
    // Reset to page 1 when search changes
    params.delete("page");
    
    const queryString = params.toString();
    router.push(`/stories${queryString ? `?${queryString}` : ""}`);
    
    // Reset loading state after a short delay to allow for navigation
    setTimeout(() => setSearchLoading(false), 100);
  }, [searchParams, router]);

  // Debounced search effect
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      const currentSearch = searchParams.get("search") || "";
      if (searchQuery !== currentSearch) {
        updateSearchFilter(searchQuery);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, updateSearchFilter, searchParams]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateSearchFilter(searchQuery);
  };

  const clearFilters = () => {
    setAgeRange([5, 80]);
    setSearchQuery("");
    setSearchLoading(false);
    router.push("/stories");
  };

  return (
    <div className="mb-6 space-y-4">
      {/* Search Bar */}
      <form onSubmit={handleSearchSubmit} className="relative">
        <div className="relative">
          {searchLoading ? (
            <Loader2 className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4 animate-spin" />
          ) : (
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          )}
          <Input
            type="text"
            placeholder="Search user experiences..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-4"
          />
        </div>
      </form>

      {/* Age Range Filter */}
      <div className=" flex flex-col sm:flex-row bg-background sm:items-center border rounded-md p-3">
        <label className="text-sm  whitespace-nowrap">
          <span className="font-semibold">Age Range: </span> {ageRange[0]} - {ageRange[1]} years
        </label>
        <div className="mb-1 sm:ml-4 mt-4 sm:mt-2 w-full">
        <Slider
          value={ageRange}
          onValueChange={updateAgeFilter}
          min={5}
          max={80}
          step={1}
          className="w-full "
        />

        </div>
      </div>
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
        <div className="flex flex-col gap-2 min-w-[300px] flex-1">
          {loading ? (
            <div className="h-10 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
          ) : (
            <MultiSelect
              options={tags.map(tag => `${tag.name} (${tag.userCount})`)}
              selected={selectedTags}
              onChange={(selectedWithCounts) => {
                // Extract tag names from "tagname (count)" format
                const tagNames = selectedWithCounts.map(item => 
                  item.replace(/ \(\d+\)$/, '')
                );
                updateTagsFilter(tagNames);
              }}
              placeholder="Select tags to filter by..."
            />
          )}
        </div>

        {/* Clear Filters */}
        {(selectedSex || selectedTags.length > 0 || ageRange[0] !== 5 || ageRange[1] !== 80 || searchQuery) && (
          <div className="flex flex-col gap-2">
            <Button variant="outline" onClick={clearFilters}>
              Clear Filters
            </Button>
          </div>
        )}
      </div>


    </div>
  );
}
