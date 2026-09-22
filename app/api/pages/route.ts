import { withApiSecurity } from "@/app/lib/apiSecurity";
import {
  createPage,
  deletePage,
  getAllPagesWithSlugs,
  getPageByPath,
  updatePage,
} from "@/app/lib/pages";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

/**
 * Admin-only CRUD API for wiki pages.
 * The agent uses the same data layer via its admin-only tools.
 */

const translationSchema = z.record(
  z.string(),
  z.object({
    slug: z.string().optional(),
    title: z.string().optional(),
    summary: z.string().optional(),
    content: z.string().optional(),
  }),
);

const createSchema = z.object({
  path: z.string().min(1),
  title: z.string().min(1),
  summary: z.string(),
  content: z.string().min(1),
  translations: translationSchema.optional(),
  publish: z.boolean().optional(),
  stub: z.boolean().optional(),
});

const updateSchema = z.object({
  path: z.string().min(1),
  newPath: z.string().min(1).optional(),
  title: z.string().min(1).optional(),
  summary: z.string().optional(),
  content: z.string().optional(),
  translations: translationSchema.optional(),
  publish: z.boolean().optional(),
  stub: z.boolean().optional(),
});

const deleteSchema = z.object({
  path: z.string().min(1),
});

export async function GET(request: NextRequest) {
  const { error } = await withApiSecurity(request, {
    rateLimit: true,
    ipBan: true,
    auth: "admin",
  });
  if (error) return error;

  try {
    const path = request.nextUrl.searchParams.get("path");
    if (path) {
      const page = await getPageByPath(path);
      if (!page) {
        return NextResponse.json(
          { success: false, error: "Page not found" },
          { status: 404 },
        );
      }
      return NextResponse.json({ success: true, page });
    }

    const pages = await getAllPagesWithSlugs();
    return NextResponse.json({ success: true, pages });
  } catch (error) {
    console.error("[api/pages] GET error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to load pages" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  const { session, validatedBody, error } = await withApiSecurity(request, {
    rateLimit: true,
    ipBan: true,
    auth: "admin",
    validation: { schema: createSchema },
  });
  if (error) return error;

  try {
    const body = validatedBody as z.infer<typeof createSchema>;
    const created = await createPage({
      ...body,
      createdBy: session?.username ?? null,
    });
    return NextResponse.json({ success: true, page: created });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to create page";
    return NextResponse.json(
      { success: false, error: message },
      { status: 400 },
    );
  }
}

export async function PATCH(request: NextRequest) {
  const { session, validatedBody, error } = await withApiSecurity(request, {
    rateLimit: true,
    ipBan: true,
    auth: "admin",
    validation: { schema: updateSchema },
  });
  if (error) return error;

  try {
    const { path, ...updates } = validatedBody as z.infer<typeof updateSchema>;
    const updated = await updatePage(path, {
      ...updates,
      updatedBy: session?.username ?? null,
    });
    return NextResponse.json({ success: true, page: updated });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to update page";
    return NextResponse.json(
      { success: false, error: message },
      { status: 400 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  const { validatedBody, error } = await withApiSecurity(request, {
    rateLimit: true,
    ipBan: true,
    auth: "admin",
    validation: { schema: deleteSchema },
  });
  if (error) return error;

  try {
    const { path } = validatedBody as z.infer<typeof deleteSchema>;
    await deletePage(path);
    return NextResponse.json({ success: true, deleted: path });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to delete page";
    return NextResponse.json(
      { success: false, error: message },
      { status: 400 },
    );
  }
}
