import { NextRequest, NextResponse } from "next/server";
import { convex } from "@/lib/convexClient";
import { api } from "@/convex/_generated/api.js";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const organizationId = searchParams.get("organizationId");
    const region = searchParams.get("region");
    const empId = searchParams.get("empId");

    const filters: any = {};
    if (organizationId) filters.organizationId = organizationId as any;
    if (region) filters.region = region;
    if (empId) filters.empId = empId;

    const enrollments = await convex.query(api.enrollment.list, filters);
    return NextResponse.json(enrollments);
  } catch (error) {
    console.error("[API] Enrollment list error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const enrollmentId = await convex.mutation(api.enrollment.create, body);
    return NextResponse.json({ enrollmentId });
  } catch (error: any) {
    console.error("[API] Create Enrollment error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
