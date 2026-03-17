import { NextRequest, NextResponse } from "next/server";
import { otps } from "@/lib/otpStore";
import { convex } from "@/lib/convexClient";
import { api } from "@/convex/_generated/api";
import { handleCors, handleOptions } from "@/lib/cors";

// ✅ OPTIONS
export function OPTIONS(req: NextRequest) {
  return handleOptions(req);
}

export async function POST(req: NextRequest) {
  const headers = handleCors(req);

  try {
    const { mobileNumber, otp } = await req.json();

    if (!mobileNumber || !otp) {
      return NextResponse.json(
        { error: "Missing data" },
        { status: 400, headers }
      );
    }

    const normalized = mobileNumber.replace(/\D/g, "");
    const stored = otps.get(normalized);

    if (!stored) {
      return NextResponse.json(
        { error: "OTP not found" },
        { status: 400, headers }
      );
    }

    if (Date.now() > stored.expiry) {
      otps.delete(normalized);
      return NextResponse.json(
        { error: "OTP expired" },
        { status: 400, headers }
      );
    }

    if (stored.otp !== otp) {
      return NextResponse.json(
        { error: "Invalid OTP" },
        { status: 400, headers }
      );
    }

    otps.delete(normalized);

    const user = await convex.query(api.users.getByMobileNumber, {
      mobileNumber: normalized,
    });

    return NextResponse.json(
      { success: true, user },
      { headers }
    );

  } catch (err) {
    return NextResponse.json(
      { error: "Server error" },
      { status: 500, headers }
    );
  }
}