import { NextRequest, NextResponse } from "next/server";
import { convex } from "@/lib/convexClient";
import { api } from "@/convex/_generated/api.js";
import { Id } from "@/convex/_generated/dataModel";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;
    const sites = await convex.query(api.sites.listSitesByUser, { userId: userId as Id<"users"> });
    console.log(`[API] Sites for user ${userId}:`, sites?.length || 0, "found");
    return NextResponse.json(sites);
  } catch (error: any) {
    console.error("[API] Sites User error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
