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
    // Note: Convex doesn't have a direct listPatrolPointsByOrg yet, 
    // we'll need to list all and filter or add the function.
    // For now, let's assume points are fetched by site in QRManagement.
    return NextResponse.json({ error: "Use site-based point listing" }, { status: 400 });
  } catch (error: any) {
    console.error("[API] Points Org error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
