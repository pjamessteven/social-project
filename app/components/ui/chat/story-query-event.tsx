"use client";

import { usePart } from "@llamaindex/chat-ui";
import { Loader2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import UserCard from "../../UserCard";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "../accordion";

type EventPart = {
  id?: string | undefined;
  type: "data-event";
  data: {
    title: string;
    query: string;
    result: any;
    status: string;
  };
};

interface Tag {
  name: string;
  nameTranslation: string | null;
}

interface User {
  username: string;
  activeSince: string;
  sex: "m" | "f";
  experienceSummary: string | null;
  experienceSummaryTranslation: string | null;
  tags: Tag[];
  commentCount: number;
  transitionAge: number | null;
  detransitionAge: number | null;
}

async function fetchUserByUsername(username: string): Promise<User | null> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    const response = await fetch(
      `${baseUrl}/api/users?username=${encodeURIComponent(username)}`,
    );

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    const users = data.users || [];

    // Should return exactly one user when username is specified
    return users.length > 0 ? users[0] : null;
  } catch (error) {
    console.error("Error fetching user:", error);
    return null;
  }
}

export default function StoryQueryEventPart() {
  // usePart returns data only if current part matches the type
  const eventPart = usePart<EventPart>("data-story-query-event");
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);

  // Memoize the parsed results to prevent unnecessary re-parsing
  const results = useMemo(() => {
    if (!eventPart?.data?.result) return [];
    try {
      return JSON.parse(eventPart.data.result) as {
        username: string;
        story: string;
      }[];
    } catch (error) {
      console.error("Error parsing event data:", error);
      return [];
    }
  }, [eventPart?.data?.result]);

  useEffect(() => {
    if (results.length === 0) {
      setUsers([]);
      setLoading(false);
      return;
    }

    const fetchUsers = async () => {
      setLoading(true);
      const userPromises = results.map(({ username }) =>
        fetchUserByUsername(username),
      );

      const fetchedUsers = await Promise.all(userPromises);
      const validUsers = fetchedUsers.filter(
        (user): user is User => user !== null,
      );
      setUsers(validUsers);
      setLoading(false);
    };

    fetchUsers();
  }, [results]);

  if (!eventPart) return null;

  return (
    <Accordion type="single" collapsible className=" w-full">
      <AccordionItem
        value="disclaimer"
        className="text-muted-foreground overflow-hidden border-none"
      >
        <AccordionTrigger
          indicatorStart
          hideIndicator={eventPart.data.title === "Querying user stories"}
          className="text-muted-foreground pt-0 hover:no-underline"
        >
          <div className="flex flex-row items-center">
            {eventPart.data.title === "Querying user stories" && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin text-blue-500 dark:text-blue-100" />
            )}
            <div className="text-base font-normal italic">
              {eventPart.data.title === "Queried user stories"
                ? `Found relevant stories`
                : "Looking for relevant stories..."}
            </div>
          </div>
        </AccordionTrigger>
        <AccordionContent className="max-w-full pb-3 flex flex-col">
          <p className="text-muted-foreground ml-6 pb-3 text-base italic">
            query: <i>"{eventPart?.data?.query}"</i>
          </p>

          {loading ? (
            <div className="flex flex-row items-center mt-3">
              <Loader2 className=" mr-2 ml-6 h-4 w-4 animate-spin text-blue-500 dark:text-blue-100" />
              <div className="text-muted-foreground text-base italic">Loading user profiles...</div>
            </div>
          ) : (
            <div className="text-primary mt-4 space-y-4">
              {users.map((user) => (
                <UserCard key={user.username} user={user} />
              ))}
            </div>
          )}
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
