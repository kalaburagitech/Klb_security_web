import { NextRequest, NextResponse } from "next/server";
import { convex } from "@/lib/convexClient";
import { api } from "@/convex/_generated/api.js";
import { Id } from "@/convex/_generated/dataModel";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { pointId, latitude, longitude, qrCode } = body;

    const validation = await convex.mutation(api.logs.validatePatrolPoint, {
      pointId: pointId as Id<"patrolPoints">,
      latitude,
      longitude,
      qrCode
    });

    return NextResponse.json(validation);
  } catch (error) {
    console.error("[API] Logs validate error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
