import { NextRequest, NextResponse } from "next/server";
import { otps } from "@/lib/otpStore";
import { handleCors, handleOptions } from "@/lib/cors";

export function OPTIONS(req: NextRequest) {
  return handleOptions(req);
}

export async function POST(req: NextRequest) {
  const headers = handleCors(req);
  console.log("[API] POST /api/auth/otp - Request received");
  try {
    const body = await req.json();
    const { mobileNumber } = body;

    if (!mobileNumber) {
      return NextResponse.json({ error: "Mobile number is required" }, { status: 400, headers });
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
    }, { headers });
  } catch (error) {
    console.error("[API] Send OTP error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500, headers });
  }
}

