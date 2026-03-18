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
    console.log(`[API] GET /api/sites/org/${orgId} - Request received`);
    const sites = await convex.query(api.sites.listSitesByOrg, { organizationId: orgId as Id<"organizations"> });
    console.log(`[API] GET /api/sites/org/${orgId} - Success: ${sites?.length || 0} sites found`);
    return NextResponse.json(sites);
  } catch (error) {
    console.error("[API] Sites Org error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
