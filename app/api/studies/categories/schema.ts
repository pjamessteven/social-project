import { z } from "zod";

export const categorySchema = z.object({
  kind: z.enum(["topic", "method"]),
  name: z.string().min(1).max(255),
  slug: z.string().max(255).optional(),
  description: z.string().max(2000).optional(),
  sortOrder: z.number().int().optional(),
});
