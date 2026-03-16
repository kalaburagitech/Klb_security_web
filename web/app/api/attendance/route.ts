import { NextRequest, NextResponse } from "next/server";
import { convex } from "@/lib/convexClient";
import { api } from "@/convex/_generated/api.js";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const organizationId = searchParams.get("organizationId");
    const region = searchParams.get("region");
    const date = searchParams.get("date");
    const empId = searchParams.get("empId");

    const filters: any = {};
    if (organizationId) filters.organizationId = organizationId as any;
    if (region) filters.region = region;
    if (date) filters.date = date;
    if (empId) filters.empId = empId;

    const records = await convex.query(api.attendance.list, filters);
    return NextResponse.json(records);
  } catch (error) {
    console.error("[API] Attendance list error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const attendanceId = await convex.mutation(api.attendance.create, body);
    return NextResponse.json({ attendanceId });
  } catch (error: any) {
    console.error("[API] Create Attendance error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
