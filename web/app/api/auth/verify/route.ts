import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api.js";
import { otps } from "@/lib/otpStore";

import { convex } from "@/lib/convexClient";
import { Id } from "@/convex/_generated/dataModel";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { mobileNumber, otp } = body;

    if (!mobileNumber || !otp) {
      return NextResponse.json({ error: "Mobile number and OTP are required" }, { status: 400 });
    }

    const normalizedNumber = mobileNumber.replace(/\D/g, "");
    console.log(`[AUTH] Verifying OTP for: ${normalizedNumber}, Entered OTP: ${otp}`);
    const storedData = otps.get(normalizedNumber);
    console.log(`[AUTH] Stored data for ${normalizedNumber}:`, storedData);

    if (!storedData) {
      console.error(`[AUTH] No OTP found for ${normalizedNumber}. Available keys:`, Array.from(otps.keys()));
      return NextResponse.json({ error: "No OTP found for this number" }, { status: 400 });
    }

    if (Date.now() > storedData.expiry) {
      console.error(`[AUTH] OTP expired for ${normalizedNumber}. Expiry: ${storedData.expiry}, Now: ${Date.now()}`);
      otps.delete(normalizedNumber);
      return NextResponse.json({ error: "OTP has expired" }, { status: 400 });
    }

    if (storedData.otp !== otp) {
      console.error(`[AUTH] OTP mismatch for ${normalizedNumber}. Stored: ${storedData.otp}, Entered: ${otp}`);
      return NextResponse.json({ error: "Invalid OTP" }, { status: 400 });
    }

    // OTP verified, clear it
    otps.delete(normalizedNumber);

    // Fetch user from Convex
    const user = await convex.query(api.users.getByMobileNumber, { mobileNumber: normalizedNumber });

    if (!user) {
      return NextResponse.json({ error: "User not found. Please contact administration." }, { status: 404 });
    }

    // Log the login in Convex
    await convex.mutation(api.loginLogs.logLogin, {
      userId: user._id,
      email: user.email || `${normalizedNumber}@mobile.user`,
      organizationId: user.organizationId,
      ipAddress: req.headers.get("x-forwarded-for")?.split(",")[0] || "unknown",
      loginStatus: "success"
    });

    return NextResponse.json({
      success: true,
      user,
      token: "mock-jwt-token"
    });
  } catch (error) {
    console.error("[API] Verify OTP error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
