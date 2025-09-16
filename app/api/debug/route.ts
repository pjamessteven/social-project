// app/api/debug/route.ts
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  return NextResponse.json(Object.fromEntries(req.headers));
}
