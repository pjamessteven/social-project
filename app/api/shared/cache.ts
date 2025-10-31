import {
  affirmCache,
  db,
  detransCache,
  detransChatCache,
} from "@/db";
import { createHash } from "crypto";
import { eq } from "drizzle-orm";

export interface GenerationMetadata {
  totalCost?: number;
  tokensPrompt?: number;
  tokensCompletion?: number;
  model?: string;
  generationId?: string;
}

