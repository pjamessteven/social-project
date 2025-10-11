"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Skeleton } from "../components/ui/skeleton";

interface User {
  username: string;
  activeSince: string;
  sex: "m" | "f";
  experienceSummary: string | null;
  tags: string[];
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

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const availableTags = [
    "trauma",
    "autism",
    "ocd",
    "puberty discomfort",
    "top surgery",
    "bottom surgery",
    "internalised homophobia",
    "autogynephilia (AGP)",
    "started as non-binary",
    "escapism",
    "depression",
    "low self-esteem",
    "anxiety",
    "eating disorder",
    "influenced online",
    "influenced by friends",
    "trans kid",
    "hormone therapy",
    "puberty blockers",
    "health complications",
    "infertility",
    "body dysmorphia",
    "retransition",
    "social transition only",
    "suspicious account"
  ];
  const [selectedSex, setSelectedSex] = useState<string>("");
  const [selectedTag, setSelectedTag] = useState<string>("");
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false,
  });

  const fetchUsers = async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "20",
      });
      
      if (selectedSex) params.append("sex", selectedSex);
      if (selectedTag) params.append("tag", selectedTag);

      const response = await fetch(`/api/users?${params}`);
      const data: UsersResponse = await response.json();
      
      setUsers(data.users);
      setPagination(data.pagination);
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setLoading(false);
    }
  };


  useEffect(() => {
    fetchUsers(1);
  }, [selectedSex, selectedTag]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const clearFilters = () => {
    setSelectedSex("");
    setSelectedTag("");
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-4">Detrans Users</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Browse experiences from the detransition community
        </p>
      </div>

      {/* Filters */}
      <div className="mb-6 space-y-4">
        <div className="flex flex-wrap gap-4">
          {/* Sex Filter */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">Sex:</label>
            <select
              value={selectedSex}
              onChange={(e) => setSelectedSex(e.target.value)}
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
              onChange={(e) => setSelectedTag(e.target.value)}
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

        {/* Results count */}
        <div className="text-sm text-gray-600 dark:text-gray-400">
          {loading ? (
            <Skeleton className="h-4 w-32" />
          ) : (
            `Showing ${users.length} of ${pagination.total} users`
          )}
        </div>
      </div>

      {/* Users List */}
      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="border rounded-lg p-6">
              <Skeleton className="h-6 w-32 mb-2" />
              <Skeleton className="h-4 w-24 mb-4" />
              <Skeleton className="h-16 w-full mb-4" />
              <div className="flex gap-2">
                <Skeleton className="h-6 w-16" />
                <Skeleton className="h-6 w-20" />
              </div>
            </div>
          ))}
        </div>
      ) : users.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">No users found matching your filters.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {users.map((user) => (
            <Link
              key={user.username}
              href={`/users/${encodeURIComponent(user.username)}`}
              className="block border rounded-lg p-6 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-lg font-semibold">{user.username}</h3>
                <div className="flex items-center gap-2">

                  <span className="text-sm text-gray-500">
                    Active on /r/detrans since {formatDate(user.activeSince)}
                  </span>
                </div>
              </div>
              
              {user.experienceSummary && (
                <p className="text-gray-700 dark:text-gray-300 mb-4 line-clamp-3">
                  {user.experienceSummary}
                </p>
              )}
              
              {user.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                                    <Badge variant="secondary">
                    {user.sex === "f" ? "Female" : "Male"}
                  </Badge>
                  {user.tags.slice(0, 5).map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                  {user.tags.length > 5 && (
                    <Badge variant="secondary" className="text-xs">
                      +{user.tags.length - 5} more
                    </Badge>
                  )}
                </div>
              )}
            </Link>
          ))}
        </div>
      )}

      {/* Pagination */}
      {!loading && pagination.totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-8">
          <Button
            variant="outline"
            disabled={!pagination.hasPrev}
            onClick={() => fetchUsers(pagination.page - 1)}
          >
            Previous
          </Button>
          
          <span className="flex items-center px-4">
            Page {pagination.page} of {pagination.totalPages}
          </span>
          
          <Button
            variant="outline"
            disabled={!pagination.hasNext}
            onClick={() => fetchUsers(pagination.page + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
