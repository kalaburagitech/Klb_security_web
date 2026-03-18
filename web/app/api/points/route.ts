import { NextRequest, NextResponse } from "next/server";
import { convex } from "@/lib/convexClient";
import { api } from "@/convex/_generated/api.js";

export async function POST(req: NextRequest) {
  console.log("[API] POST /api/points - Request received");
  try {
    const body = await req.json();
    const result = await convex.mutation(api.sites.createPatrolPoint, body);
    console.log("[API] POST /api/points - Success:", result);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("[API] Points Create error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
