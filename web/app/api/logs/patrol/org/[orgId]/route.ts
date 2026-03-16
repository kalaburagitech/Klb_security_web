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
    const { searchParams } = new URL(req.url);
    const siteId = searchParams.get("siteId");

    const logs = await convex.query(api.logs.listPatrolLogs, {
      organizationId: orgId as Id<"organizations">,
      siteId: siteId ? siteId as Id<"sites"> : undefined
    });
    return NextResponse.json(logs);
  } catch (error: any) {
    console.error("[API] Logs Patrol Org error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
