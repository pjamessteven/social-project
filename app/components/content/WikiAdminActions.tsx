"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/app/components/ui/alert-dialog";
import { Button } from "@/app/components/ui/button";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

/**
 * Admin-only controls shown at the bottom of a wiki page. Talks to the
 * admin `/api/pages` endpoint (which enforces admin auth server-side).
 */
export function WikiAdminActions({
  path,
  published,
  locale,
}: {
  path: string;
  published: boolean;
  locale: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<"publish" | "delete" | null>(null);

  async function callApi(method: "PATCH" | "DELETE", body: object) {
    const response = await fetch("/api/pages", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await response.json().catch(() => null);
    if (!response.ok || !data?.success) {
      throw new Error(data?.error ?? `Request failed (${response.status})`);
    }
  }

  async function togglePublished() {
    setBusy("publish");
    try {
      await callApi("PATCH", { path, publish: !published });
      toast.success(published ? "Page unpublished" : "Page published");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Update failed");
    } finally {
      setBusy(null);
    }
  }

  async function deleteCurrentPage() {
    setBusy("delete");
    try {
      await callApi("DELETE", { path });
      toast.success("Page deleted");
      router.push(`/${locale}/topics`);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
      setBusy(null);
    }
  }

  return (
    <div className="not-prose mt-6 flex flex-wrap items-center gap-2 rounded-lg border border-dashed p-3">
      <span className="text-muted-foreground mr-auto text-sm">
        Admin · <code>{path}</code> · {published ? "Published" : "Draft"}
      </span>
      <Button
        variant="outline"
        size="sm"
        disabled={busy !== null}
        onClick={togglePublished}
      >
        {busy === "publish"
          ? "Saving…"
          : published
            ? "Unpublish"
            : "Publish"}
      </Button>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="destructive" size="sm" disabled={busy !== null}>
            {busy === "delete" ? "Deleting…" : "Delete"}
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this page?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes <code>{path}</code> and all its
              translations. Child pages are kept but lose their parent.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={deleteCurrentPage}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
