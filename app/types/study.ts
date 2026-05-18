export interface Study {
  id: number;
  headline: string;
  title: string;
  authors: string;
  description?: string;
  year: number;
  url: string;
  displayUrl: string;
  journal?: string;
  approved?: boolean;
  fullText?: string;
  abstract?: string;
  conclusion?: string;
  keyPoints?: string[];
  summary?: string;
}
