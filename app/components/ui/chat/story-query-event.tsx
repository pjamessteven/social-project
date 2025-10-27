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
import { useEffect, useState } from "react";

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
    const response = await fetch(`${baseUrl}/api/users?search=${encodeURIComponent(username)}&limit=1`);
    
    if (!response.ok) {
      return null;
    }
    
    const data = await response.json();
    const users = data.users || [];
    
    // Find exact username match
    return users.find((user: User) => user.username === username) || null;
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

  useEffect(() => {
    if (!eventPart) return;

    const results: { 
      user: { username: string }; 
      story: string; 
    }[] = JSON.parse(eventPart.data.result);

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
  }, [eventPart]);

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
          {loading ? (
            <p>Loading user stories...</p>
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

