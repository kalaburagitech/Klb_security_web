import { NextRequest, NextResponse } from "next/server";
import { convex } from "@/lib/convexClient";
import { api } from "@/convex/_generated/api.js";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const result = await convex.mutation(api.logs.createDualLog, body);
    return NextResponse.json(result);
  } catch (error) {
    console.error("[API] Logs dual error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
