import { featureTaxonomy } from "./feature-taxonomy";

/**
 * Canonical tag names derived from the v2 feature taxonomy
 * (see app/lib/feature-taxonomy.ts), the same source that seeds
 * `detrans_features` and the tag sync (scripts/sync-features-to-tags.ts).
 *
 * Deriving the list keeps it from drifting from the actual `detrans_tags`
 * contents whenever the taxonomy changes.
 */
const tagNames = new Set<string>();

for (const feature of featureTaxonomy) {
  if (feature.tag) {
    tagNames.add(feature.tag);
  }
  if (feature.choiceTagMap) {
    for (const name of Object.values(feature.choiceTagMap)) {
      tagNames.add(name);
    }
  }
}

export const availableTags = [...tagNames].sort((a, b) => a.localeCompare(b));
