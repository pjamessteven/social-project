"use client";

import { Study } from "@/app/types/study";
import { ReactNode, useState } from "react";
import { StudyApprovalModal } from "./StudyApprovalModal";

interface StudyAdminWrapperProps {
  study: Study;
  children: ReactNode;
}

export function StudyAdminWrapper({ study, children }: StudyAdminWrapperProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this study?")) return;

    try {
      const response = await fetch(`/api/studies/${study.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        alert(data.error || "Failed to delete study");
      } else {
        // Remove from DOM
        const el = document.getElementById(`study-${study.id}`);
        if (el) el.remove();
      }
    } catch (error) {
      alert("Failed to delete study");
    }
  };

  return (
    <div id={`study-${study.id}`}>
      {children}
      <div className="mt-2 flex gap-2">
        <button
          onClick={() => setIsModalOpen(true)}
          className={`rounded px-3 py-1 text-sm text-white ${
            study.approved
              ? "bg-blue-600 hover:bg-blue-700"
              : "bg-green-600 hover:bg-green-700"
          }`}
        >
          {study.approved ? "Edit" : "Approve"}
        </button>
        <button
          onClick={handleDelete}
          className="rounded bg-red-600 px-3 py-1 text-sm text-white hover:bg-red-700"
        >
          Delete
        </button>
      </div>

      {isModalOpen && (
        <StudyApprovalModal
          study={study}
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSuccess={() => {
            setIsModalOpen(false);
            window.location.reload();
          }}
        />
      )}
    </div>
  );
}
