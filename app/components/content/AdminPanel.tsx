"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface AdminPanelProps {
  onLogin?: () => void;
  onLogout?: () => void;
}

export default function AdminPanel({ onLogin, onLogout }: AdminPanelProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isAdmin, setIsAdmin] = useState(false);
  const [username, setUsername] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showLoginForm, setShowLoginForm] = useState(false);
  const [loginData, setLoginData] = useState({
    username: "",
    password: "",
  });
  const [loginError, setLoginError] = useState("");

  // Check admin status on mount
  useEffect(() => {
    checkAdminStatus();
  }, []);

  const checkAdminStatus = async () => {
    try {
      const response = await fetch("/api/auth/me");
      if (response.ok) {
        const data = await response.json();
        setIsAdmin(data.user?.role === "admin");
        setUsername(data.user?.username || null);
      } else {
        setIsAdmin(false);
        setUsername(null);
      }
    } catch (error) {
      console.error("Failed to check admin status:", error);
      setIsAdmin(false);
      setUsername(null);
    } finally {
      setLoading(false);
    }
  };

  const handleLoginChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setLoginData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(loginData),
      });

      const data = await response.json();

      if (data.success) {
        setIsAdmin(true);
        setUsername(data.user.username);
        setShowLoginForm(false);
        setLoginData({ username: "", password: "" });
        onLogin?.();
        router.refresh();
        // Refresh the page to update UI state
        window.location.reload();
      } else {
        setLoginError(data.error || "Login failed");
      }
    } catch (error) {
      setLoginError("An error occurred. Please try again.");
      console.error("Login error:", error);
    }
  };

  const handleLogout = async () => {
    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
      });

      if (response.ok) {
        setIsAdmin(false);
        setUsername(null);
        onLogout?.();
        router.refresh();
      }
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  if (loading) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
        <div className="flex items-center justify-center">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600"></div>
          <span className="ml-2 text-sm text-gray-500">Checking auth...</span>
        </div>
      </div>
    );
  }

  if (isAdmin) {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-900/20">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center">
              <span className="text-sm font-medium text-green-800 dark:text-green-300">
                Admin Mode
              </span>
              <span className="ml-2 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800 dark:bg-green-800 dark:text-green-200">
                {username}
              </span>
            </div>
            <p className="mt-1 text-xs text-green-600 dark:text-green-400">
              You can feature/unfeature conversations
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="rounded-md bg-green-100 px-3 py-1 text-xs font-medium text-green-800 hover:bg-green-200 dark:bg-green-800 dark:text-green-200 dark:hover:bg-green-700"
          >
            Logout
          </button>
        </div>
      </div>
    );
  }

  if (showLoginForm) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-medium text-gray-900 dark:text-white">
            Admin Login
          </h3>
          <button
            onClick={() => setShowLoginForm(false)}
            className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400"
          >
            Cancel
          </button>
        </div>

        <form onSubmit={handleLoginSubmit} className="space-y-3">
          {loginError && (
            <div className="rounded-md bg-red-50 p-2 text-xs text-red-600 dark:bg-red-900/30 dark:text-red-400">
              {loginError}
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
              Username
            </label>
            <input
              type="text"
              name="username"
              value={loginData.username}
              onChange={handleLoginChange}
              className="mt-1 block w-full rounded-md border border-gray-300 px-2 py-1 text-sm shadow-sm focus:border-blue-500 focus:ring-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              placeholder="Admin username"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
              Password
            </label>
            <input
              type="password"
              name="password"
              value={loginData.password}
              onChange={handleLoginChange}
              className="mt-1 block w-full rounded-md border border-gray-300 px-2 py-1 text-sm shadow-sm focus:border-blue-500 focus:ring-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              placeholder="Admin password"
              required
            />
          </div>

          <button
            type="submit"
            className="w-full rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none"
          >
            Sign In
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
      <div className="mb-3">
        <p className="text-sm font-medium text-gray-900 dark:text-white">
          Admin Features
        </p>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          Login to feature/unfeature conversations
        </p>
      </div>
      <div className="flex space-x-2">
        <button
          onClick={() => setShowLoginForm(true)}
          className="flex-1 rounded-md bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
        >
          Quick Login
        </button>
        <button
          onClick={() =>
            router.push(`/login?redirect=${encodeURIComponent(pathname)}`)
          }
          className="flex-1 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-500"
        >
          Full Login
        </button>
      </div>
    </div>
  );
}
