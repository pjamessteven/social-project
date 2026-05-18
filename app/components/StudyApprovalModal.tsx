"use client";

import { Study } from "@/app/types/study";
import { useState, useCallback } from "react";

interface StudyApprovalModalProps {
  study: Study;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (updatedStudy: Study) => void;
}

export function StudyApprovalModal({
  study,
  isOpen,
  onClose,
  onSuccess,
}: StudyApprovalModalProps) {
  const isEditing = study.approved;

  const [formData, setFormData] = useState({
    fullText: study.fullText || "",
    abstract: study.abstract || "",
    conclusion: study.conclusion || "",
    summary: study.summary || "",
    keyPoints: (study.keyPoints || []).join("\n"),
    title: study.title || "",
    authors: study.authors || "",
    year: study.year?.toString() || "",
    journal: study.journal || "",
    headline: study.headline || "",
    description: study.description || "",
  });

  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [regenerateEmbedding, setRegenerateEmbedding] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setPdfFile(file);
  };

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setIsSubmitting(true);
      setError(null);

      const keyPoints = formData.keyPoints
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.length > 0);

      if (keyPoints.length === 0) {
        setError("At least one key point is required");
        setIsSubmitting(false);
        return;
      }

      // Build FormData for multipart upload
      const payload = new FormData();
      payload.append("abstract", formData.abstract);
      payload.append("conclusion", formData.conclusion);
      payload.append("summary", formData.summary);
      payload.append("keyPoints", formData.keyPoints);
      payload.append("title", formData.title);
      payload.append("authors", formData.authors);
      payload.append("year", formData.year);
      payload.append("journal", formData.journal);
      payload.append("headline", formData.headline);
      payload.append("description", formData.description);
      payload.append("fullText", formData.fullText);

      if (pdfFile) {
        payload.append("pdf", pdfFile);
      }

      if (isEditing && regenerateEmbedding) {
        payload.append("regenerateEmbedding", "on");
      }

      try {
        const response = await fetch(`/api/studies/${study.id}/approve`, {
          method: "POST",
          body: payload,
        });

        const data = await response.json();

        if (response.ok) {
          onSuccess({
            ...study,
            ...formData,
            year: formData.year ? parseInt(formData.year, 10) : 0,
            approved: true,
            keyPoints,
          });
        } else {
          setError(data.error || "Failed to approve study");
        }
      } catch (err) {
        setError("Failed to approve study");
      } finally {
        setIsSubmitting(false);
      }
    },
    [formData, pdfFile, study, onSuccess],
  );

  if (!isOpen) return null;

  const hasFullText = formData.fullText.trim().length > 0;
  const hasPdf = pdfFile !== null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 pt-10">
      <div className="w-full max-w-3xl rounded-lg bg-white p-6 shadow-xl dark:bg-gray-900">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold">
            {isEditing ? "Edit Study" : "Approve Study"}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <svg
              className="h-6 w-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded bg-red-100 p-3 text-sm text-red-800 dark:bg-red-900/30 dark:text-red-200">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium">
                Title
              </label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                className="w-full rounded border px-3 py-2 dark:border-gray-700 dark:bg-gray-800"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">
                Headline
              </label>
              <input
                type="text"
                name="headline"
                value={formData.headline}
                onChange={handleChange}
                className="w-full rounded border px-3 py-2 dark:border-gray-700 dark:bg-gray-800"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">
                Authors
              </label>
              <input
                type="text"
                name="authors"
                value={formData.authors}
                onChange={handleChange}
                className="w-full rounded border px-3 py-2 dark:border-gray-700 dark:bg-gray-800"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">
                Year
              </label>
              <input
                type="number"
                name="year"
                value={formData.year}
                onChange={handleChange}
                className="w-full rounded border px-3 py-2 dark:border-gray-700 dark:bg-gray-800"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">
                Journal
              </label>
              <input
                type="text"
                name="journal"
                value={formData.journal}
                onChange={handleChange}
                className="w-full rounded border px-3 py-2 dark:border-gray-700 dark:bg-gray-800"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">
                URL
              </label>
              <input
                type="text"
                value={study.url}
                readOnly
                className="w-full rounded border bg-gray-100 px-3 py-2 dark:border-gray-700 dark:bg-gray-800"
              />
            </div>
          </div>

          <div className="rounded border border-dashed border-gray-400 p-4 dark:border-gray-600">
            <label className="mb-2 block text-sm font-medium">
              Upload PDF (optional)
            </label>
            <input
              type="file"
              accept=".pdf"
              onChange={handleFileChange}
              className="w-full text-sm"
            />
            {hasPdf && (
              <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
                PDF uploaded: {pdfFile.name}. Text will be extracted and used as
                full text unless you also paste text below.
              </p>
            )}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">
              Full Text
              {!hasPdf && <span className="text-red-500">*</span>}
            </label>
            <textarea
              name="fullText"
              value={formData.fullText}
              onChange={handleChange}
              required={!hasPdf}
              rows={8}
              className="w-full rounded border px-3 py-2 dark:border-gray-700 dark:bg-gray-800"
              placeholder={
                hasPdf
                  ? "Optional: paste text here to override the PDF extraction..."
                  : "Paste the full study text here..."
              }
            />
            <p className="mt-1 text-xs text-gray-500">
              {hasPdf
                ? "If left empty, text will be extracted from the uploaded PDF. If you paste text here, it takes precedence over the PDF."
                : "Required when no PDF is uploaded."}
            </p>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">
              Abstract <span className="text-red-500">*</span>
            </label>
            <textarea
              name="abstract"
              value={formData.abstract}
              onChange={handleChange}
              required
              rows={3}
              className="w-full rounded border px-3 py-2 dark:border-gray-700 dark:bg-gray-800"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">
              Conclusion <span className="text-red-500">*</span>
            </label>
            <textarea
              name="conclusion"
              value={formData.conclusion}
              onChange={handleChange}
              required
              rows={3}
              className="w-full rounded border px-3 py-2 dark:border-gray-700 dark:bg-gray-800"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">
              Summary <span className="text-red-500">*</span>
            </label>
            <textarea
              name="summary"
              value={formData.summary}
              onChange={handleChange}
              required
              rows={3}
              className="w-full rounded border px-3 py-2 dark:border-gray-700 dark:bg-gray-800"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">
              Key Points <span className="text-red-500">*</span>
              <span className="text-xs text-gray-500"> (one per line)</span>
            </label>
            <textarea
              name="keyPoints"
              value={formData.keyPoints}
              onChange={handleChange}
              required
              rows={5}
              className="w-full rounded border px-3 py-2 dark:border-gray-700 dark:bg-gray-800"
              placeholder="Point 1\nPoint 2\nPoint 3"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">
              Description (Public-facing)
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={3}
              className="w-full rounded border px-3 py-2 dark:border-gray-700 dark:bg-gray-800"
            />
          </div>

          {isEditing && (
            <div className="flex items-center gap-2 rounded border p-3 dark:border-gray-700">
              <input
                type="checkbox"
                id="regenerateEmbedding"
                checked={regenerateEmbedding}
                onChange={(e) => setRegenerateEmbedding(e.target.checked)}
                className="h-4 w-4"
              />
              <label htmlFor="regenerateEmbedding" className="text-sm">
                <span className="font-medium">Regenerate embedding</span>
                <span className="ml-1 text-gray-500">
                  — Check this if you changed the full text, abstract, or key
                  points and want to update the vector database.
                </span>
              </label>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded border px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded bg-green-600 px-4 py-2 text-white hover:bg-green-700 disabled:opacity-50"
            >
              {isSubmitting
                ? "Processing..."
                : isEditing
                  ? "Save Changes"
                  : "Approve & Embed"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
