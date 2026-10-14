import { withApiSecurity } from "@/app/lib/apiSecurity";
import {
  CategoryInputError,
  deleteCategory,
  updateCategory,
} from "@/app/lib/study-categories";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { categorySchema } from "../schema";

const updateSchema = categorySchema.partial();

type Params = { params: Promise<{ id: string }> };

async function parseId(params: Params["params"]) {
  const id = Number((await params).id);
  return Number.isInteger(id) ? id : null;
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const { validatedBody, error } = await withApiSecurity(request, {
    rateLimit: true,
    ipBan: true,
    auth: "admin",
    validation: { schema: updateSchema },
  });
  if (error) return error;

  const id = await parseId(params);
  if (id === null) {
    return NextResponse.json({ success: false, error: "Invalid id" }, { status: 400 });
  }

  try {
    const category = await updateCategory(
      id,
      validatedBody as z.infer<typeof updateSchema>,
    );
    if (!category) {
      return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, category });
  } catch (err) {
    if (err instanceof CategoryInputError) {
      return NextResponse.json({ success: false, error: err.message }, { status: 400 });
    }
    console.error("[api/studies/categories] PATCH error:", err);
    return NextResponse.json(
      { success: false, error: "Failed to update category (duplicate slug?)" },
      { status: 400 },
    );
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const { error } = await withApiSecurity(request, {
    rateLimit: true,
    ipBan: true,
    auth: "admin",
  });
  if (error) return error;

  const id = await parseId(params);
  if (id === null) {
    return NextResponse.json({ success: false, error: "Invalid id" }, { status: 400 });
  }
  const deleted = await deleteCategory(id);
  return NextResponse.json({ success: deleted }, { status: deleted ? 200 : 404 });
}
