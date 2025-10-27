import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { Badge } from "./ui/badge";

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

interface UserCardProps {
  user: User;
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString();
}

export default function UserCard({ user }: UserCardProps) {
  return (
    <>
      <div className="-mx-4 border-t pt-4 sm:hidden" />
      <Link
        href={`/stories/${encodeURIComponent(user.username)}`}
        className="block transition-colors sm:rounded-lg sm:border sm:p-6 sm:pt-6 sm:hover:bg-gray-50 sm:dark:hover:bg-gray-800/80"
      >
        <div className="flex w-full grow flex-row items-center justify-between">
          <div className="mb-2 flex grow flex-col items-start justify-between sm:flex-row">
            <h3 className="text-lg font-semibold">
              /u/{user.username}
            </h3>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">
                {user.commentCount} comments • Posting since{" "}
                {formatDate(user.activeSince)}
              </span>
            </div>
          </div>
          <ChevronRight className="mb-3 h-6 sm:hidden" />
        </div>
        <div className="mt-4 mb-2 font-medium text-gray-700 sm:mt-2 dark:text-gray-300">
          {user.transitionAge &&
            "Transitioned at " + user.transitionAge}
          {user.detransitionAge && user.transitionAge && " -> "}
          {user.detransitionAge &&
            (user.tags.includes("only transitioned socially")
              ? "Desisted at "
              : "Detransitioned at ") + user.detransitionAge}
        </div>
        {user.experienceSummary && (
          <p className="prose-base mb-4 text-gray-700 dark:text-gray-300">
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
    </>
  );
}
