import { requireAuth } from "@/app/lib/auth/middleware";
import { extractPdfText } from "@/app/lib/pdf";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  console.log("[PDF Extract API] Route handler started");
  try {
    const { errorResponse } = await requireAuth(request, {
      requireAdmin: true,
    });
    if (errorResponse) return errorResponse;
    console.log("[PDF Extract API] Auth check complete");

    const formData = await request.formData();
    console.log("[PDF Extract API] FormData parsed");

    const pdfFile = formData.get("pdf") as File | null;
    console.log("[PDF Extract API] PDF file present:", !!pdfFile, "PDF size:", pdfFile?.size || 0);

    if (!pdfFile || pdfFile.size === 0) {
      console.log("[PDF Extract API] No PDF file provided");
      return NextResponse.json(
        { error: "PDF file is required" },
        { status: 400 },
      );
    }

    console.log("[PDF Extract API] Starting PDF text extraction...");
    let extractedText: string;
    try {
      extractedText = await extractPdfText(pdfFile);
      console.log("[PDF Extract API] PDF extraction complete, extracted length:", extractedText.length);
    } catch (pdfError) {
      console.error("[PDF Extract API] Failed to parse PDF:", pdfError);
      return NextResponse.json(
        { error: "Failed to parse PDF. Please try another file or paste the text manually." },
        { status: 400 },
      );
    }

    if (!extractedText.trim()) {
      console.log("[PDF Extract API] Extracted text was empty");
      return NextResponse.json(
        { error: "PDF appears to contain no extractable text." },
        { status: 400 },
      );
    }

    console.log("[PDF Extract API] Returning success response");
    return NextResponse.json({
      success: true,
      text: extractedText,
    });
  } catch (error) {
    console.error("[PDF Extract API] Error extracting PDF text:", error);
    return NextResponse.json(
      { error: "Failed to extract PDF text" },
      { status: 500 },
    );
  }
}
