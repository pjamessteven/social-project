import { getStudiesPath } from "@/app/lib/study-slugs";
import { getLocale } from "next-intl/server";
import Link from "next/link";

/**
 * Shown when a /studies/[slug] URL no longer resolves (stale slug after a
 * headline edit, or a broken link). Served with a real 404 status so old
 * URLs drop out of search indexes, while humans get pointed back to the
 * archive. Numeric /studies/{id} URLs never land here — they redirect to
 * the study's current slug.
 */
export default async function StudyNotFound() {
  const locale = await getLocale();

  return (
    <div className="pb-16 lg:pt-8">
      <div className="mb-4">
        <Link
          href={getStudiesPath(locale)}
          className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
        >
          ← Back to studies
        </Link>
      </div>
      <h1 className="text-2xl font-bold">This study has moved</h1>
      <p className="mt-3 text-gray-600 dark:text-gray-400">
        This study has moved or is no longer available at this address. It may
        have been renamed or removed — you can find all current studies on the{" "}
        <Link
          href={getStudiesPath(locale)}
          className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
        >
          studies page
        </Link>
        .
      </p>
    </div>
  );
}
