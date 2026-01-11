"use server";

import { ConversationSummary } from "./ConversationsPage";

interface SeoConversationsPageProps {
  conversations?: ConversationSummary[];
  featuredConversations?: ConversationSummary[];
  currentConversationId?: string;
}

interface MessagePart {
  type: "text";
  text: string;
}

interface Message {
  parts: MessagePart[];
  id: string;
  role: "user" | "model" | "assistant";
}

function parseMessages(messagesString: string): Message[] {
  try {
    const parsed = JSON.parse(messagesString);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error("Failed to parse messages:", error);
    return [];
  }
}

function renderMessage(message: Message) {
  const text = message.parts?.[0]?.text || "";
  const isUser = message.role === "user";

  return (
    <div
      key={message.id}
      className={`mb-4 rounded-lg p-4 ${
        isUser
          ? "border border-blue-100 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20"
          : "border border-gray-100 bg-gray-50 dark:border-gray-600 dark:bg-gray-700"
      }`}
    >
      <div className="flex items-start">
        <div
          className={`mt-1 mr-3 flex h-8 w-8 items-center justify-center rounded-full ${
            isUser
              ? "bg-blue-100 text-blue-600 dark:bg-blue-800 dark:text-blue-300"
              : "bg-gray-100 text-gray-600 dark:bg-gray-600 dark:text-gray-300"
          }`}
        >
          {isUser ? "U" : "A"}
        </div>
        <div className="flex-1">
          <div className="mb-1 text-sm font-medium">
            {isUser ? "User" : "detrans.ai"}
          </div>
          <div className="prose dark:prose-invert max-w-none">
            {text.split("\n").map((line, i) => (
              <p key={i} className="mb-2 last:mb-0">
                {line}
              </p>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default async function SeoConversationsPage({
  conversations = [],
  featuredConversations = [],
  currentConversationId,
}: SeoConversationsPageProps) {
  const allConversations = [...conversations, ...featuredConversations];
  const currentConversation = allConversations.find(
    (conv) => conv.uuid === currentConversationId,
  );

  return (
    <div className="container mx-auto px-4 py-8">
      <header className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
          Conversations Archive
        </h1>
        <p className="mt-2 text-lg text-gray-600 dark:text-gray-300">
          Browse through conversations about gender identity, detransitioning,
          gender-affirming care, and affirmation.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Sidebar with conversation list */}
        <aside className="lg:col-span-1">
          <div className="rounded-lg bg-white p-6 shadow dark:bg-gray-800">
            <h2 className="mb-4 text-2xl font-semibold text-gray-900 dark:text-white">
              Conversations
            </h2>

            {featuredConversations.length > 0 && (
              <div className="mb-6">
                <h3 className="mb-2 flex items-center text-lg font-medium text-gray-900 dark:text-white">
                  <span className="mr-2">⭐</span> Featured Conversations
                </h3>
                <ul className="space-y-2">
                  {featuredConversations.map((conversation) => (
                    <li key={conversation.uuid}>
                      <a
                        href={`/chat/${conversation.uuid}`}
                        className="block rounded-lg bg-yellow-50 p-3 transition-colors hover:bg-yellow-100 dark:bg-yellow-900/20 dark:hover:bg-yellow-900/30"
                      >
                        <h4 className="font-medium text-gray-900 dark:text-white">
                          {conversation.title || "Untitled Conversation"}
                        </h4>
                        <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                          {conversation.conversationSummary ||
                            "No summary available"}
                        </p>
                        <div className="mt-2 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                          <span>{conversation.mode}</span>
                          <time dateTime={conversation.updatedAt}>
                            {new Date(
                              conversation.updatedAt,
                            ).toLocaleDateString()}
                          </time>
                        </div>
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <h3 className="mb-2 text-lg font-medium text-gray-900 dark:text-white">
              All Conversations
            </h3>
            {conversations.length > 0 ? (
              <ul className="space-y-2">
                {conversations.map((conversation) => (
                  <li key={conversation.uuid}>
                    <a
                      href={`/chat/${conversation.uuid}`}
                      className="block rounded-lg bg-gray-50 p-3 transition-colors hover:bg-gray-100 dark:bg-gray-700 dark:hover:bg-gray-600"
                    >
                      <h4 className="font-medium text-gray-900 dark:text-white">
                        {conversation.title || "Untitled Conversation"}
                      </h4>
                      <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                        {conversation.conversationSummary ||
                          "No summary available"}
                      </p>
                      <div className="mt-2 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                        <span>{conversation.mode}</span>
                        <time dateTime={conversation.updatedAt}>
                          {new Date(
                            conversation.updatedAt,
                          ).toLocaleDateString()}
                        </time>
                      </div>
                    </a>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-500 italic dark:text-gray-400">
                No conversations available.
              </p>
            )}
          </div>
        </aside>

        {/* Main content area */}
        <main className="lg:col-span-2">
          {currentConversation ? (
            <div className="rounded-lg bg-white p-6 shadow dark:bg-gray-800">
              <article>
                <header className="mb-6">
                  <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
                    {currentConversation.title || "Untitled Conversation"}
                  </h2>
                  <div className="mt-2 flex items-center text-sm text-gray-600 dark:text-gray-300">
                    <span className="mr-4">
                      Mode: {currentConversation.mode}
                    </span>
                    <time dateTime={currentConversation.updatedAt}>
                      Updated:{" "}
                      {new Date(
                        currentConversation.updatedAt,
                      ).toLocaleDateString()}
                    </time>
                    {currentConversation.featured && (
                      <span className="ml-4 rounded-full bg-yellow-100 px-2 py-1 text-xs font-medium text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                        Featured
                      </span>
                    )}
                  </div>
                </header>

                <div className="prose dark:prose-invert max-w-none">
                  <h3>Conversation Summary</h3>
                  <p className="text-lg">
                    {currentConversation.conversationSummary ||
                      "No summary available for this conversation."}
                  </p>

                  {currentConversation.messages && (
                    <>
                      <h3 className="mt-8">Conversation</h3>
                      <div className="mt-4 space-y-4">
                        {(() => {
                          const messages = parseMessages(
                            currentConversation.messages,
                          );
                          if (messages.length === 0) {
                            return (
                              <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-700">
                                <p className="text-gray-600 italic dark:text-gray-300">
                                  Unable to parse conversation messages.
                                </p>
                              </div>
                            );
                          }
                          return messages.map(renderMessage);
                        })()}
                      </div>
                    </>
                  )}
                </div>

                <div className="mt-8 border-t border-gray-200 pt-6 dark:border-gray-700">
                  <p className="text-gray-600 dark:text-gray-300">
                    This is a conversation from our archive. To view the full
                    conversation and participate in discussions, please visit
                    the interactive version of this page.
                  </p>
                </div>
              </article>
            </div>
          ) : (
            <div className="rounded-lg bg-white p-8 text-center shadow dark:bg-gray-800">
              <h2 className="mb-4 text-2xl font-bold text-gray-900 dark:text-white">
                Welcome to Conversations Archive
              </h2>
              <p className="mb-6 text-gray-600 dark:text-gray-300">
                Select a conversation from the sidebar to view its details. This
                archive contains discussions about gender identity,
                detransitioning experiences, and affirmation journeys.
              </p>
              <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="rounded-lg bg-blue-50 p-4 dark:bg-blue-900/20">
                  <h3 className="font-semibold text-blue-900 dark:text-blue-200">
                    Featured Conversations
                  </h3>
                  <p className="mt-1 text-sm text-blue-700 dark:text-blue-300">
                    Highlighted discussions marked by our community
                  </p>
                </div>
                <div className="rounded-lg bg-green-50 p-4 dark:bg-green-900/20">
                  <h3 className="font-semibold text-green-900 dark:text-green-200">
                    All Conversations
                  </h3>
                  <p className="mt-1 text-sm text-green-700 dark:text-green-300">
                    Browse through all available discussions
                  </p>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      <footer className="mt-12 border-t border-gray-200 pt-8 dark:border-gray-700">
        <p className="text-center text-gray-600 dark:text-gray-400">
          This page provides SEO-friendly content for search engines and bots.
          For the full interactive experience, please visit with a modern web
          browser.
        </p>
      </footer>
    </div>
  );
}
