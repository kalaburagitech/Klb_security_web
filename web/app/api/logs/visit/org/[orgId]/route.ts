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
    const regionId = searchParams.get("regionId");
    const city = searchParams.get("city");

    const isValidId = (id: string | null) => id && id !== "undefined" && id !== "null";
    const effectiveOrgId = (orgId === 'all' || !isValidId(orgId)) ? undefined : orgId as Id<"organizations">;

    const logs = await convex.query(api.logs.listVisitLogs, {
      organizationId: effectiveOrgId,
      siteId: isValidId(siteId) ? siteId as Id<"sites"> : undefined,
      regionId: regionId || undefined,
      city: city || undefined
    });
    return NextResponse.json(logs, { headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    }});
  } catch (error) {
    console.error("[API] Logs Visit Org error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
