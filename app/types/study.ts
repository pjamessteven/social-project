export interface Study {
  id: number;
  headline: string | null;
  title: string | null;
  authors: string | null;
  description?: string | null;
  year: number | null;
  url: string;
  displayUrl: string;
  journal?: string | null;
  approved?: boolean;
  fullText?: string | null;
  abstract?: string | null;
  conclusion?: string | null;
  keyPoints?: string[] | null;
  keyPointsTranslation?: string | null;
  summary?: string | null;
  tags?: string[] | null;
  limitations?: string[] | null;
}
