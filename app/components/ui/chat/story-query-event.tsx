"use client";

import { ChatMessage } from "@llamaindex/chat-ui";
import { DynamicEvents } from "./custom/events/dynamic-events";
import { ComponentDef } from "./custom/events/types";

import { usePart } from "@llamaindex/chat-ui";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "../accordion";
import Link from "next/link";
import UserCard from "../../UserCard";
import { useEffect, useState, useMemo } from "react";

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


async function fetchUserByUsername(username: string): Promise<User | null> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    const response = await fetch(`${baseUrl}/api/users/${encodeURIComponent(username)}`);
    
    if (!response.ok) {
      return null;
    }
    
    const user = await response.json();
    return user;
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
        user: { username: string }; 
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
      const userPromises = results.map(({ user }) => 
        fetchUserByUsername(user.username)
      );
      
      const fetchedUsers = await Promise.all(userPromises);
      const validUsers = fetchedUsers.filter((user): user is User => user !== null);
      setUsers(validUsers);
      setLoading(false);
    };

    fetchUsers();
  }, [results]);

  if (!eventPart) return null;

  return (
    <Accordion type="single" collapsible className="mt- mt-4 mb-4 w-full">
      <AccordionItem value="disclaimer" className="overflow-hidden border-none">
        <AccordionTrigger
          indicatorStart
          className="prose dark:prose-invert py-3 text-base !font-normal italic opacity-60 hover:no-underline"
        >
          {eventPart.data.title}
        </AccordionTrigger>
        <AccordionContent className="prose dark:prose-invert max-w-full pb-3 text-base">
                        {JSON.stringify(results)}

          {loading ? (
            <p>Loading user...</p>
          ) : (
            <div className="space-y-4">
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

