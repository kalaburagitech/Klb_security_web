import { NextRequest, NextResponse } from "next/server";
import { convex } from "@/lib/convexClient";
import { api } from "@/convex/_generated/api.js";

export async function GET() {
  try {
    const users = await convex.query(api.users.listAll);
    return NextResponse.json(users);
  } catch (error) {
    console.error("[API] Users error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const userId = await convex.mutation(api.users.create, body);
    return NextResponse.json({ userId });
  } catch (error) {
    console.error("[API] Create User error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
