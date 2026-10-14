"use client";

import {
  WikiTocAside,
  type WikiTocNode,
} from "@/app/components/content/WikiToc";
import { PAGE_TITLE } from "@/app/components/ui/typography";
import { useTranslations } from "next-intl";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import AdversitySection from "./AdversitySection";
import AfterDetransitionSection from "./AfterDetransitionSection";
import AgesSection from "./AgesSection";
import AttitudeSection from "./AttitudeSection";
import BreakdownSection from "./BreakdownSection";
import { ChartCard } from "./ChartParts";
import CompareSection from "./CompareSection";
import DurationCurve from "./DurationCurve";
import EarlyTransitionSection from "./EarlyTransitionSection";
import FeatureExplorer from "./FeatureExplorer";
import { FeatureStoriesProvider } from "./FeatureStories";
import HighlightsRibbon, { HIGHLIGHTS_ID } from "./HighlightsRibbon";
import MatrixSection from "./MatrixSection";
import MedicalGradientSection from "./MedicalGradientSection";
import MethodologySection from "./MethodologySection";
import OnlineSection from "./OnlineSection";
import OverviewSection from "./OverviewSection";
import PathwaysSection from "./PathwaysSection";
import ReasonsSection from "./ReasonsSection";
import SexualitySection from "./SexualitySection";
import { FilteredSection } from "./StatsFilters";
import StatsSection from "./StatsSection";
import TimelineStrip from "./TimelineStrip";
import TrendsSection from "./TrendsSection";
import { StatsInitialDataContext } from "./useFeatureData";

const SECTION_IDS = [
  "overview",
  "journey",
  "lives",
  "duration",
  "minors",
  "reasons",
  "drivers",
  "adversity",
  "online",
  "pathways",
  "process",
  "regret",
  "medical",
  "complications",
  "mental_health",
  "suicidality",
  "after",
  "current_status",
  "family_community",
  "sexuality",
  "trends",
  "features",
  "compare",
  "matrix",
  "methodology",
] as const;

type SectionId = (typeof SECTION_IDS)[number];

/**
 * Sections without the shared filter bar: the overview has its own,
 * Compare has its own split controls, and Methodology describes the whole
 * dataset.
 */
const UNFILTERED_SECTIONS = new Set<SectionId>([
  "overview",
  "compare",
  "methodology",
]);

/**
 * The whole /stats experience: the shared docs TOC sidebar on xl+ screens, a
 * and one accordion section per topic. Inside a section,
 * charts are stacked with their own titles. Sections mount lazily on first
 * open, so the initial page load only fetches the first section's data.
 */
export default function StatsExperience({
  initialData = {},
  initialHighlights = false,
}: {
  /** Server-prefetched API responses (see StatsInitialDataContext). */
  initialData?: Record<string, unknown>;
  /** Whether the prefetched highlights will render, so the TOC lists them. */
  initialHighlights?: boolean;
}) {
  const t = useTranslations("statsPage");

  const [openId, setOpenId] = useState<SectionId | null>("overview");
  const [mountedIds, setMountedIds] = useState<Set<SectionId>>(
    () => new Set<SectionId>(["overview"]),
  );

  // The URL hash is the source of truth for the open section, so deep links
  // and back/forward navigation work across sections.
  useEffect(() => {
    const syncFromHash = () => {
      const raw = window.location.hash.replace(/^#/, "");
      if ((SECTION_IDS as readonly string[]).includes(raw)) {
        const id = raw as SectionId;
        setOpenId(id);
        setMountedIds((previous) =>
          previous.has(id) ? previous : new Set(previous).add(id),
        );
      }
    };
    syncFromHash();
    window.addEventListener("hashchange", syncFromHash);
    return () => window.removeEventListener("hashchange", syncFromHash);
  }, []);

  const [hasHighlights, setHasHighlights] = useState(initialHighlights);
  const handleHighlightsVisible = useCallback(
    (visible: boolean) => setHasHighlights(visible),
    [],
  );

  // The ribbon isn't an accordion section, so the TOC can't follow openId
  // while it's on screen. Treat it as active until the accordion's first
  // header scrolls into the top half of the viewport. Listening in the
  // capture phase catches scrolling on whichever container the app shell uses.
  const [inHighlights, setInHighlights] = useState(true);
  useEffect(() => {
    if (!hasHighlights) return;
    const update = () => {
      const accordion = document.getElementById(SECTION_IDS[0]);
      if (!accordion) return;
      setInHighlights(
        accordion.getBoundingClientRect().top > window.innerHeight / 2,
      );
    };
    update();
    document.addEventListener("scroll", update, {
      capture: true,
      passive: true,
    });
    window.addEventListener("resize", update);
    // Highlight cards loading in (or reflowing) move the accordion down.
    const ribbon = document.getElementById(HIGHLIGHTS_ID);
    const observer = new ResizeObserver(update);
    if (ribbon) observer.observe(ribbon);
    return () => {
      document.removeEventListener("scroll", update, { capture: true });
      window.removeEventListener("resize", update);
      observer.disconnect();
    };
  }, [hasHighlights]);
  const tocActiveId = hasHighlights && inHighlights ? HIGHLIGHTS_ID : openId;

  const openSection = (id: string, { toggle = false } = {}) => {
    // The highlights ribbon sits above the accordion, so just scroll to it.
    if (id === HIGHLIGHTS_ID) {
      const target = document.getElementById(HIGHLIGHTS_ID);
      if (target) scrollToTop(target, 0);
      return;
    }
    if (!(SECTION_IDS as readonly string[]).includes(id)) return;
    const sectionId = id as SectionId;

    if (toggle && openId === sectionId) {
      setOpenId(null);
      window.history.replaceState(
        null,
        "",
        window.location.pathname + window.location.search,
      );
      return;
    }

    // Land the section header near the top of the viewport. If the currently
    // open panel sits above the target, subtract its height too since it
    // collapses while we scroll.
    const target = document.getElementById(sectionId);
    if (target) {
      let collapsing = 0;
      if (openId && openId !== sectionId) {
        const previous = document.getElementById(openId);
        if (
          previous &&
          previous.getBoundingClientRect().top <
            target.getBoundingClientRect().top
        ) {
          const panel = document.getElementById(`${openId}-panel`);
          const content = panel?.firstElementChild?.firstElementChild;
          if (content instanceof HTMLElement) collapsing = content.offsetHeight;
        }
      }
      scrollToTop(target, collapsing);
    }

    setOpenId(sectionId);
    setMountedIds((previous) =>
      previous.has(sectionId) ? previous : new Set(previous).add(sectionId),
    );
    window.history.pushState(null, "", `#${sectionId}`);
  };

  const tocItems = useMemo<WikiTocNode[]>(
    () => [
      ...(hasHighlights
        ? [{ id: HIGHLIGHTS_ID, text: t("highlights.title") }]
        : []),
      ...SECTION_IDS.map((id) => ({
        id,
        text: t(`sections.${id}.title`),
      })),
    ],
    [t, hasHighlights],
  );

  const sections: { id: SectionId; content: ReactNode }[] = [
    {
      id: "overview",
      content: <OverviewSection />,
    },
    {
      id: "journey",
      content: <AgesSection />,
    },
    {
      id: "lives",
      content: (
        <ChartCard>
          <TimelineStrip />
        </ChartCard>
      ),
    },
    {
      id: "duration",
      content: (
        <ChartCard>
          <DurationCurve />
        </ChartCard>
      ),
    },
    {
      id: "minors",
      content: <EarlyTransitionSection />,
    },
    { id: "reasons", content: <ReasonsSection /> },
    {
      id: "drivers",
      content: (
        <BreakdownSection view="drivers" namespace="statsPage.drivers" />
      ),
    },
    { id: "adversity", content: <AdversitySection /> },
    { id: "online", content: <OnlineSection /> },
    {
      id: "pathways",
      content: <PathwaysSection />,
    },
    {
      id: "process",
      content: (
        <BreakdownSection view="process" namespace="statsPage.process" />
      ),
    },
    {
      id: "regret",
      content: <BreakdownSection view="regret" namespace="statsPage.regret" />,
    },
    {
      id: "medical",
      content: (
        <ChartCard>
          <MedicalGradientSection />
        </ChartCard>
      ),
    },
    {
      id: "complications",
      content: (
        <BreakdownSection
          view="complications"
          namespace="statsPage.complications"
        />
      ),
    },
    {
      id: "mental_health",
      content: (
        <BreakdownSection
          view="mental_health"
          namespace="statsPage.mental_health"
        />
      ),
    },
    {
      id: "suicidality",
      content: (
        <BreakdownSection
          view="suicidality"
          namespace="statsPage.suicidality"
        />
      ),
    },
    {
      id: "after",
      content: (
        <ChartCard>
          <AfterDetransitionSection />
        </ChartCard>
      ),
    },
    { id: "current_status", content: <AttitudeSection /> },
    {
      id: "family_community",
      content: (
        <BreakdownSection
          view="family_community"
          namespace="statsPage.family_community"
        />
      ),
    },
    { id: "sexuality", content: <SexualitySection /> },
    { id: "trends", content: <TrendsSection /> },
    {
      id: "features",
      content: <FeatureExplorer />,
    },
    {
      id: "compare",
      content: <CompareSection />,
    },
    { id: "matrix", content: <MatrixSection /> },
    { id: "methodology", content: <MethodologySection /> },
  ];

  return (
    <StatsInitialDataContext.Provider value={initialData}>
      <FeatureStoriesProvider>
        {/* The app shell caps pages at 48rem from md up; the charts need
            more room, so break out to up to 56rem of the viewport (centred by
            justify-center), leaving space for the TOC sidebar from xl. */}
        <div className="flex min-h-full w-full justify-center">
          <div className="relative w-full max-w-4xl md:w-[min(56rem,calc(100vw_-_3rem))] md:shrink-0 xl:w-[min(56rem,calc(100vw_-_34rem))]">
            <WikiTocAside
              items={tocItems}
              activeId={tocActiveId}
              onNavigate={(id) => openSection(id)}
            />

            <h1 className={PAGE_TITLE}>{t("title")}</h1>
            <p className="text-muted-foreground mt-6 text-base">
              {t("description")}
            </p>

            <HighlightsRibbon
              onOpenSection={(id) => openSection(id)}
              onVisibleChange={handleHighlightsVisible}
            />

            <div className="mt-10">
              {sections.map((section) => (
                <StatsSection
                  key={section.id}
                  id={section.id}
                  title={t(`sections.${section.id}.title`)}
                  description={t(`sections.${section.id}.description`)}
                  isOpen={openId === section.id}
                  mounted={mountedIds.has(section.id)}
                  onToggle={() => openSection(section.id, { toggle: true })}
                >
                  {UNFILTERED_SECTIONS.has(section.id) ? (
                    section.content
                  ) : (
                    <FilteredSection id={section.id}>
                      {section.content}
                    </FilteredSection>
                  )}
                </StatsSection>
              ))}
            </div>
          </div>
        </div>
      </FeatureStoriesProvider>
    </StatsInitialDataContext.Provider>
  );
}

/** Nearest scrollable ancestor of an element, or the window. */
/**
 * Smoothly scrolls `target` to just below the top of its scroll container,
 * less `collapsing` px of content above it that is about to collapse.
 */
function scrollToTop(target: HTMLElement, collapsing: number) {
  const offset = 8;
  // The app shell may scroll an inner container rather than the window.
  const scroller = scrollParent(target);
  const scrollerTop =
    scroller === window
      ? 0
      : (scroller as HTMLElement).getBoundingClientRect().top;
  const currentScroll =
    scroller === window ? window.scrollY : (scroller as HTMLElement).scrollTop;
  const top =
    target.getBoundingClientRect().top -
    scrollerTop +
    currentScroll -
    offset -
    collapsing;
  scroller.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
}

function scrollParent(element: HTMLElement): HTMLElement | Window {
  let node = element.parentElement;
  while (node) {
    const { overflowY } = getComputedStyle(node);
    if (
      /(auto|scroll)/.test(overflowY) &&
      node.scrollHeight > node.clientHeight
    ) {
      return node;
    }
    node = node.parentElement;
  }
  return window;
}
