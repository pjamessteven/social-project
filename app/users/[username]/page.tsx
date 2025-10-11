"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Skeleton } from "../../components/ui/skeleton";
import { ArrowLeft } from "lucide-react";

interface User {
  username: string;
  activeSince: string;
  sex: "m" | "f";
  experienceSummary: string | null;
  experience: string | null;
  redFlagsReport: string | null;
  tags: string[];
}

export default function UserPage() {
  const params = useParams();
  const username = params.username as string;
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await fetch(`/api/users/${encodeURIComponent(username)}`);
        
        if (!response.ok) {
          if (response.status === 404) {
            setError("User not found");
          } else {
            setError("Failed to load user");
          }
          return;
        }

        const data = await response.json();
        setUser(data.user);
      } catch (error) {
        console.error("Error fetching user:", error);
        setError("Failed to load user");
      } finally {
        setLoading(false);
      }
    };

    if (username) {
      fetchUser();
    }
  }, [username]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Skeleton className="h-8 w-32 mb-6" />
        <div className="space-y-6">
          <div>
            <Skeleton className="h-8 w-48 mb-4" />
            <div className="flex gap-4 mb-4">
              <Skeleton className="h-6 w-20" />
              <Skeleton className="h-6 w-32" />
            </div>
            <div className="flex gap-2 mb-6">
              <Skeleton className="h-6 w-16" />
              <Skeleton className="h-6 w-20" />
              <Skeleton className="h-6 w-24" />
            </div>
          </div>
          <div>
            <Skeleton className="h-6 w-32 mb-4" />
            <Skeleton className="h-32 w-full" />
          </div>
          <div>
            <Skeleton className="h-6 w-40 mb-4" />
            <Skeleton className="h-64 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Link href="/users">
          <Button variant="ghost" className="mb-6">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Users
          </Button>
        </Link>
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold mb-4">
            {error || "User not found"}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            The user you're looking for doesn't exist or couldn't be loaded.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Link href="/users">
        <Button variant="ghost" className="mb-6">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Users
        </Button>
      </Link>

      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold mb-4">{user.username}</h1>
          <div className="flex flex-wrap gap-4 mb-4 text-sm text-gray-600 dark:text-gray-400">
            <div className="flex items-center gap-2">
              <Badge variant="outline">
                {user.sex === "f" ? "Female" : "Male"}
              </Badge>
            </div>
            <div>Active since {formatDate(user.activeSince)}</div>
          </div>
          
          {user.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-6">
              {user.tags.map((tag) => (
                <Badge key={tag} variant="secondary">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* Experience Summary */}
        {user.experienceSummary && (
          <div>
            <h2 className="text-xl font-semibold mb-4">Summary</h2>
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6">
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                {user.experienceSummary}
              </p>
            </div>
          </div>
        )}

        {/* Full Experience */}
        {user.experience && (
          <div>
            <h2 className="text-xl font-semibold mb-4">Full Experience</h2>
            <div className="bg-white dark:bg-gray-900 border rounded-lg p-6">
              <div className="prose dark:prose-invert max-w-none">
                {user.experience.split('\n').map((paragraph, index) => (
                  <p key={index} className="mb-4 last:mb-0 leading-relaxed">
                    {paragraph}
                  </p>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Red Flags Report */}
        {user.redFlagsReport && (
          <div>
            <h2 className="text-xl font-semibold mb-4">Authenticity Assessment</h2>
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-6">
              <p className="text-yellow-800 dark:text-yellow-200 leading-relaxed">
                {user.redFlagsReport}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
