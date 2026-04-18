"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // Get redirect URL from query parameter or default to conversations
  const redirectTo = searchParams.get("redirect") || "/conversations";
  const errorParam = searchParams.get("error");

  // Map error codes to user-friendly messages
  const errorMessages: Record<string, string> = {
    missing_token: "Invalid login link. Please request a new one.",
    invalid_or_expired:
      "This login link has expired or is invalid. Please request a new one.",
    server_error: "An error occurred. Please try again.",
  };

  const displayError =
    error ||
    (errorParam ? errorMessages[errorParam] || "An error occurred." : "");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/auth/magic-link", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(true);
      } else {
        setError(data.error || "Failed to send magic link. Please try again.");
      }
    } catch (err) {
      setError("An error occurred. Please try again.");
      console.error("Magic link request error:", err);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="w-full max-w-sm space-y-6 p-8">
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
              <svg
                className="h-6 w-6 text-green-600 dark:text-green-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
              Check Your Email
            </h1>
            <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">
              If you have an account, you will receive a magic link to log in.
              The link will expire in 15 minutes.
            </p>
            <button
              onClick={() => setSuccess(false)}
              className="mt-6 text-sm text-blue-600 hover:text-blue-500 dark:text-blue-400"
            >
              Didn&apos;t receive it? Try again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-sm space-y-6 p-8">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
            Login to detrans.ai
          </h1>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          {displayError && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/30 dark:text-red-400">
              {displayError}
            </div>
          )}

          <div>
            <input
              id="email"
              name="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md border border-gray-300 bg-transparent px-3 py-2 text-sm placeholder:text-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none dark:border-gray-600 dark:text-white"
              placeholder="you@example.com"
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:opacity-50"
          >
            {loading ? "Sending..." : "Send Magic Link"}
          </button>
          <div className="bg-secondary mt-4 rounded-md border p-4 text-center">
            <p className="text-muted-foreground text-sm">
              Sign in for private conversations.
            </p>
            <p className="text-muted-foreground mt-3 text-sm">
              Access is subject to fair use.
            </p>

            <p className="text-muted-foreground mt-3 text-sm">
              <Link
                href="contact"
                className="text-blue-500 underline hover:text-blue-600"
              >
                Contact me
              </Link>{" "}
              to request access.
            </p>
          </div>
          <div className="pt-4 text-center">
            <button
              type="button"
              onClick={() => router.push(redirectTo)}
              className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400"
            >
              ← Back to Chat
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
