import { withApiSecurity } from "@/app/lib/apiSecurity";
import {
  CategoryInputError,
  createCategory,
  getAllCategoryRows,
} from "@/app/lib/study-categories";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { categorySchema } from "./schema";

/**
 * Admin-only CRUD for curated study categories (English source values;
 * translations come from scripts/generate-study-hub-translations.ts).
 */

export async function GET(request: NextRequest) {
  const { error } = await withApiSecurity(request, {
    rateLimit: true,
    ipBan: true,
    auth: "admin",
  });
  if (error) return error;

  const categories = await getAllCategoryRows();
  return NextResponse.json({ success: true, categories });
}

export async function POST(request: NextRequest) {
  const { validatedBody, error } = await withApiSecurity(request, {
    rateLimit: true,
    ipBan: true,
    auth: "admin",
    validation: { schema: categorySchema },
  });
  if (error) return error;

  try {
    const category = await createCategory(
      validatedBody as z.infer<typeof categorySchema>,
    );
    return NextResponse.json({ success: true, category });
  } catch (err) {
    if (err instanceof CategoryInputError) {
      return NextResponse.json(
        { success: false, error: err.message },
        { status: 400 },
      );
    }
    console.error("[api/studies/categories] POST error:", err);
    return NextResponse.json(
      { success: false, error: "Failed to create category (duplicate slug?)" },
      { status: 400 },
    );
  }
}
