"use client";

import { Study } from "@/app/types/study";
import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";

interface StudyApprovalFormProps {
  study: Study;
  locale: string;
}

export function StudyApprovalForm({ study, locale }: StudyApprovalFormProps) {
  const router = useRouter();
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
    tags: (study.tags || []).join(", "),
    limitations: (study.limitations || []).join("\n"),
  });

  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [regenerateEmbedding, setRegenerateEmbedding] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);
  const [isExtractingPdf, setIsExtractingPdf] = useState(false);
  const [pdfExtractError, setPdfExtractError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setPdfFile(file);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
        setPdfFile(file);
      }
    }
  };

  const handleExtractPdf = async () => {
    if (!pdfFile) return;
    console.log("[Extract PDF] Starting PDF extraction");
    setIsExtractingPdf(true);
    setPdfExtractError(null);

    const payload = new FormData();
    payload.append("pdf", pdfFile);

    try {
      console.log("[Extract PDF] Sending POST to /api/pdf/extract");
      const response = await fetch("/api/pdf/extract", {
        method: "POST",
        body: payload,
      });
      console.log("[Extract PDF] Response received, status:", response.status);

      const data = await response.json();
      console.log("[Extract PDF] Response body parsed, keys:", Object.keys(data));

      if (response.ok) {
        console.log("[Extract PDF] Success - text length:", data.text?.length);
        setFormData((prev) => ({
          ...prev,
          fullText: data.text || prev.fullText,
        }));
      } else {
        console.error("[Extract PDF] Server error:", data.error);
        setPdfExtractError(data.error || "Failed to extract PDF text");
      }
    } catch (err) {
      console.error("[Extract PDF] Client-side fetch error:", err);
      setPdfExtractError("Failed to extract PDF text");
    } finally {
      console.log("[Extract PDF] Finished, setting isExtractingPdf=false");
      setIsExtractingPdf(false);
    }
  };

  const handleAutoFill = async () => {
    console.log("[Autofill] Starting autofill process");
    setIsExtracting(true);
    setExtractError(null);

    const payload = new FormData();
    payload.append("fullText", formData.fullText);
    console.log("[Autofill] Full text length in form:", formData.fullText.length);

    try {
      console.log("[Autofill] Sending POST request to /api/studies/" + study.id + "/extract");
      const response = await fetch(`/api/studies/${study.id}/extract`, {
        method: "POST",
        body: payload,
      });
      console.log("[Autofill] Response received, status:", response.status);

      const data = await response.json();
      console.log("[Autofill] Response body parsed, keys:", Object.keys(data));

      if (response.ok) {
        console.log("[Autofill] Success - updating form data");
        if (data.errors && data.errors.length > 0) {
          console.warn("[Autofill] Partial errors:", data.errors);
        }
        setFormData((prev) => ({
          ...prev,
          title: data.title ?? prev.title,
          authors: data.authors ?? prev.authors,
          year: data.year?.toString() ?? prev.year,
          journal: data.journal ?? prev.journal,
          abstract: data.abstract ?? prev.abstract,
          conclusion: data.conclusion ?? prev.conclusion,
          summary: data.summary ?? prev.summary,
          keyPoints: Array.isArray(data.keyPoints)
            ? data.keyPoints.join("\n")
            : prev.keyPoints,
          tags: Array.isArray(data.tags)
            ? data.tags.join(", ")
            : prev.tags,
          limitations: Array.isArray(data.limitations)
            ? data.limitations.join("\n")
            : prev.limitations,
        }));
        if (data.errors && data.errors.length > 0) {
          setExtractError(
            "Some fields could not be extracted: " + data.errors.join(", ")
          );
        }
      } else {
        console.error("[Autofill] Server error:", data.error);
        setExtractError(data.error || "Failed to auto-fill study metadata");
      }
    } catch (err) {
      console.error("[Autofill] Client-side fetch error:", err);
      setExtractError("Failed to auto-fill study metadata");
    } finally {
      console.log("[Autofill] Finished, setting isExtracting=false");
      setIsExtracting(false);
    }
  };

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setIsSubmitting(true);
      setError(null);

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
      payload.append("tags", formData.tags);
      payload.append("limitations", formData.limitations);

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
          router.push(`/${locale}/studies`);
        } else {
          setError(data.error || "Failed to approve study");
          setIsSubmitting(false);
        }
      } catch (err) {
        setError("Failed to approve study");
        setIsSubmitting(false);
      }
    },
    [formData, pdfFile, study.id, isEditing, regenerateEmbedding, router, locale],
  );

  const hasFullText = formData.fullText.trim().length > 0;
  const hasPdf = pdfFile !== null;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded bg-red-100 p-3 text-sm text-red-800 dark:bg-red-900/30 dark:text-red-200">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium">Title</label>
          <input
            type="text"
            name="title"
            value={formData.title}
            onChange={handleChange}
            className="w-full rounded border px-3 py-2 dark:border-gray-700 dark:bg-gray-800"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Headline</label>
          <input
            type="text"
            name="headline"
            value={formData.headline}
            onChange={handleChange}
            className="w-full rounded border px-3 py-2 dark:border-gray-700 dark:bg-gray-800"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Authors</label>
          <input
            type="text"
            name="authors"
            value={formData.authors}
            onChange={handleChange}
            className="w-full rounded border px-3 py-2 dark:border-gray-700 dark:bg-gray-800"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Year</label>
          <input
            type="number"
            name="year"
            value={formData.year}
            onChange={handleChange}
            className="w-full rounded border px-3 py-2 dark:border-gray-700 dark:bg-gray-800"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Journal</label>
          <input
            type="text"
            name="journal"
            value={formData.journal}
            onChange={handleChange}
            className="w-full rounded border px-3 py-2 dark:border-gray-700 dark:bg-gray-800"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">URL</label>
          <input
            type="text"
            value={study.url}
            readOnly
            className="w-full rounded border bg-gray-100 px-3 py-2 dark:border-gray-700 dark:bg-gray-800"
          />
        </div>
      </div>

      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`rounded border border-dashed p-4 transition-colors dark:border-gray-600 ${
          isDragging
            ? "border-blue-500 bg-blue-50 dark:border-blue-400 dark:bg-blue-900/20"
            : "border-gray-400"
        }`}
      >
        <label className="mb-2 block text-sm font-medium">
          Upload PDF (optional)
        </label>
        <input
          type="file"
          accept=".pdf"
          onChange={handleFileChange}
          className="w-full text-sm"
        />
        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
          Or drag and drop a PDF file here
        </p>
        {hasPdf && (
          <div className="mt-3 space-y-2">
            <p className="text-xs text-gray-600 dark:text-gray-400">
              PDF uploaded: {pdfFile.name}
            </p>
            <button
              type="button"
              onClick={handleExtractPdf}
              disabled={isExtractingPdf}
              className="rounded bg-indigo-600 px-3 py-1.5 text-sm text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {isExtractingPdf ? "Extracting text..." : "Extract PDF text"}
            </button>
            {pdfExtractError && (
              <p className="text-xs text-red-600">{pdfExtractError}</p>
            )}
          </div>
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
              ? "Click Extract PDF text above, or paste text here..."
              : "Paste the full study text here..."
          }
        />
        <p className="mt-1 text-xs text-gray-500">
          {hasPdf
            ? "Click Extract PDF text above to populate this field, or paste text manually."
            : "Required when no PDF is uploaded."}
        </p>
        {hasFullText && (
          <button
            type="button"
            onClick={handleAutoFill}
            disabled={isExtracting}
            className="mt-2 rounded bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {isExtracting ? "Processing..." : "Auto-fill with AI"}
          </button>
        )}
        {extractError && (
          <p className="mt-1 text-xs text-red-600">{extractError}</p>
        )}
      </div>

      {/* Tags */}
      <div>
        <label className="mb-1 block text-sm font-medium">
          Tags
          <span className="text-xs text-gray-500"> (comma-separated)</span>
        </label>
        <input
          type="text"
          name="tags"
          value={formData.tags}
          onChange={handleChange}
          placeholder="puberty blockers, mental health, detransition..."
          className="w-full rounded border px-3 py-2 dark:border-gray-700 dark:bg-gray-800"
        />
      </div>

      {/* Limitations */}
      <div>
        <label className="mb-1 block text-sm font-medium">
          Methodological Limitations
          <span className="text-xs text-gray-500"> (one per line)</span>
        </label>
        <textarea
          name="limitations"
          value={formData.limitations}
          onChange={handleChange}
          rows={4}
          placeholder="Small sample size\nShort follow-up period\nConflict of interest"
          className="w-full rounded border px-3 py-2 dark:border-gray-700 dark:bg-gray-800"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Abstract</label>
        <textarea
          name="abstract"
          value={formData.abstract}
          onChange={handleChange}
          rows={3}
          className="w-full rounded border px-3 py-2 dark:border-gray-700 dark:bg-gray-800"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Conclusion</label>
        <textarea
          name="conclusion"
          value={formData.conclusion}
          onChange={handleChange}
          rows={3}
          className="w-full rounded border px-3 py-2 dark:border-gray-700 dark:bg-gray-800"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Summary</label>
        <textarea
          name="summary"
          value={formData.summary}
          onChange={handleChange}
          rows={3}
          className="w-full rounded border px-3 py-2 dark:border-gray-700 dark:bg-gray-800"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">
          Key Points
          <span className="text-xs text-gray-500"> (one per line)</span>
        </label>
        <textarea
          name="keyPoints"
          value={formData.keyPoints}
          onChange={handleChange}
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
          onClick={() => router.push(`/${locale}/studies`)}
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
  );
}
