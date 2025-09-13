import { NextRequest } from "next/server";

export function getIP(req: Request | NextRequest): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim(); // first IP in chain

  const xri = req.headers.get("x-real-ip");
  if (xri) return xri;

  // Fallback for local dev (no proxy) – req.socket is not on Request,
  // so we simply return a placeholder.
  return "unknown";
}
