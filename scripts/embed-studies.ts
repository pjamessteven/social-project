/**
 * (Re-)embed approved studies into the Qdrant `detrans_studies` collection,
 * replacing any existing vectors for each study. Embeds the full text where
 * we have it, else the abstract, summary and conclusion.
 *
 *   QDRANT_URL=http://localhost:6333 npx tsx scripts/embed-studies.ts 12 5121 5122
 *   npx tsx scripts/embed-studies.ts --missing   # every approved study with no vectors
 */
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config();

async function main() {
  const { db } = await import("../db");
  const { studies } = await import("../db/schema");
  const { and, eq, inArray } = await import("drizzle-orm");
  const { QdrantVectorStore } = await import("@llamaindex/qdrant");
  const { deleteStudyVectors, embedStudy, STUDIES_COLLECTION } =
    await import("../app/lib/study-embeddings");

  const args = process.argv.slice(2);
  let ids = args.filter((a) => /^\d+$/.test(a)).map(Number);

  if (args.includes("--missing")) {
    const qdrant = new QdrantVectorStore({
      url: process.env.QDRANT_URL || "http://localhost:6333",
      collectionName: STUDIES_COLLECTION,
    }).client();
    const approved = await db
      .select({ id: studies.id })
      .from(studies)
      .where(eq(studies.approved, true));
    for (const { id } of approved) {
      const { count } = await qdrant.count(STUDIES_COLLECTION, {
        filter: { must: [{ key: "studyId", match: { value: id } }] },
        exact: true,
      });
      if (count === 0) ids.push(id);
    }
  }
  ids = [...new Set(ids)];
  if (!ids.length) {
    console.log("nothing to embed");
    return;
  }

  const rows = await db
    .select()
    .from(studies)
    .where(and(inArray(studies.id, ids), eq(studies.approved, true)));

  for (const study of rows) {
    const text =
      study.fullText?.trim() ||
      [study.abstract, study.summary, study.conclusion]
        .filter(Boolean)
        .join("\n\n");
    if (!text) {
      console.log(`study ${study.id}: no text, skipped`);
      continue;
    }
    await deleteStudyVectors(study.id, STUDIES_COLLECTION);
    const chunks = await embedStudy(
      study.id,
      text,
      study.title || "",
      study.authors || "",
      study.year,
      study.url || "",
      study.abstract || "",
      study.conclusion || "",
      study.keyPoints || [],
      STUDIES_COLLECTION,
    );
    console.log(
      `study ${study.id}: ${chunks} chunks (${study.fullText ? "full text" : "abstract"})`,
    );
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
