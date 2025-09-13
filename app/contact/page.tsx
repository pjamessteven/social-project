"use client";

import { useState } from "react";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";

export default function ContactPage() {
  const [form, setForm] = useState({
    name: "",
    subject: "",
    email: "",
    message: "",
  });
  const [status, setStatus] = useState("");

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("Sending...");

    const res = await fetch("/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, site: "detrans" }),
    });

    const data = await res.json();
    setStatus(data.success ? "✅ Message sent!" : "❌ Failed to send.");
  };

  return (
    <div className="prose dark:prose-invert pb-16 lg:pt-8">
      <h2>Contact Form</h2>
      <p>
        If you have any thoughts, suggestions, or if this free service has
        helped you, your family or your friend, I would like to hear from you.
        Drop me a message below!
      </p>
      <div className="mx-auto w-full max-w-2xl rounded-2xl border bg-white p-8 pb-16 lg:pt-8 dark:border-none dark:bg-gray-900">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              To
            </label>
            <Input
              readOnly
              value="Peter James Steven"
              className="pointer-events-none w-full rounded-lg bg-gray-100 p-3 opacity-50 dark:bg-gray-800 dark:text-gray-100"
            />
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {" "}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Name
              </label>
              <Input
                name="name"
                type="text"
                placeholder="Your Name"
                value={form.name}
                onChange={handleChange}
                required
                className="w-full rounded-lg border-gray-300 p-3 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Email
              </label>
              <Input
                name="email"
                type="email"
                placeholder="you@example.com"
                value={form.email}
                onChange={handleChange}
                required
                className="w-full rounded-lg border-gray-300 p-3 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Subject
            </label>
            <Input
              name="subject"
              type="text"
              placeholder="Subject"
              value={form.subject}
              onChange={handleChange}
              required
              className="w-full rounded-lg border-gray-300 p-3 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Message
            </label>
            <Textarea
              name="message"
              placeholder="Write your message..."
              value={form.message}
              onChange={handleChange}
              required
              rows={5}
              className="w-full rounded-lg border-gray-300 p-3 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
            />
          </div>

          <button
            type="submit"
            className="w-full rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white transition hover:bg-blue-700"
          >
            Send Message
          </button>
        </form>

        {status && (
          <p className="mt-4 text-center text-sm text-gray-600 dark:text-gray-400">
            {status}
          </p>
        )}
      </div>
    </div>
  );
}
