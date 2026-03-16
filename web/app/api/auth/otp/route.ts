import { NextRequest, NextResponse } from "next/server";
import { convex } from "@/lib/convexClient";
import { api } from "@/convex/_generated/api.js";
import { otps } from "@/lib/otpStore";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { mobileNumber } = body;

    if (!mobileNumber) {
      return NextResponse.json({ error: "Mobile number is required" }, { status: 400 });
    }

    // Normalize number
    const normalizedNumber = mobileNumber.replace(/\D/g, "");

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Store OTP for 5 minutes (Note: Memory is ephemeral in serverless, but works for localized tests)
    // In local dev/VPS this Map persists between requests.
    otps.set(normalizedNumber, {
      otp,
      expiry: Date.now() + 5 * 60 * 1000
    });

    console.log(`[AUTH] OTP for ${normalizedNumber} stored: ${otp}`);
    console.log(`[AUTH] Current OTP keys:`, Array.from(otps.keys()));

    return NextResponse.json({
      success: true,
      otp,
      message: "OTP sent (check server console)"
    });
  } catch (error) {
    console.error("[API] Send OTP error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

