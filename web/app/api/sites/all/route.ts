import { NextRequest, NextResponse } from "next/server";
import { convex } from "@/lib/convexClient";
import { api } from "@/convex/_generated/api.js";

export async function GET() {
  try {
    const sites = await convex.query(api.sites.listAll);
    return NextResponse.json(sites);
  } catch (error) {
    console.error("[API] Sites All error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
