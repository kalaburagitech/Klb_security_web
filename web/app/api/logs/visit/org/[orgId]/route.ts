import { NextRequest, NextResponse } from "next/server";
import { convex } from "@/lib/convexClient";
import { api } from "@/convex/_generated/api.js";
import { Id } from "@/convex/_generated/dataModel";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const { orgId } = await params;
    const logs = await convex.query(api.logs.listVisitLogs, {
      organizationId: orgId as Id<"organizations">
    });
    return NextResponse.json(logs);
  } catch (error) {
    console.error("[API] Logs Visit Org error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
