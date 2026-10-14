"use client";

import AgeCurves from "./AgeCurves";
import { ChartCard } from "./ChartParts";
import JourneySection from "./JourneySection";
import { useJourney } from "./useJourney";

/**
 * The "Ages" section: transition vs detransition age curves above the
 * milestone ridgeline, sharing one fetch (filtered by the enclosing
 * FilteredSection).
 */
export default function AgesSection() {
  const journey = useJourney();

  return (
    <div className="space-y-8">
      <AgeCurves {...journey} />
      <ChartCard>
        <JourneySection {...journey} />
      </ChartCard>
    </div>
  );
}
