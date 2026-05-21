import { PDFReader } from "@llamaindex/readers/pdf";

export async function extractPdfText(file: File): Promise<string> {
  console.log("[PDF Extract] Starting extraction for file:", file.name, "Size:", file.size);
  const arrayBuffer = await file.arrayBuffer();
  console.log("[PDF Extract] ArrayBuffer loaded, size:", arrayBuffer.byteLength);
  const uint8Array = new Uint8Array(arrayBuffer);

  const reader = new PDFReader();
  console.log("[PDF Extract] Calling PDFReader.loadDataAsContent...");
  const documents = await reader.loadDataAsContent(uint8Array);
  console.log("[PDF Extract] Documents loaded, count:", documents.length);

  const text = documents.map((doc) => doc.text).join("\n\n");
  console.log("[PDF Extract] Text extracted, length:", text.length);
  return text;
}
