"use client";

import { useRouter } from "next/navigation";

interface DeleteStudyButtonProps {
  studyId: number;
  locale: string;
}

export function DeleteStudyButton({ studyId, locale }: DeleteStudyButtonProps) {
  const router = useRouter();

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this study?")) return;

    try {
      const response = await fetch(`/api/studies/${studyId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        alert(data.error || "Failed to delete study");
      } else {
        router.push(`/${locale}/studies`);
        router.refresh();
      }
    } catch (error) {
      alert("Failed to delete study");
    }
  };

  return (
    <button
      onClick={handleDelete}
      className="rounded bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700"
    >
      Delete Study
    </button>
  );
}
