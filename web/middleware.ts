import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { corsHeaders } from "./lib/cors";

export function middleware(req: NextRequest) {
    const origin = req.headers.get("origin");

    // Handle preflight request
    if (req.method === "OPTIONS") {
        return new NextResponse(null, {
            status: 200,
            headers: corsHeaders(origin),
        });
    }

    const response = NextResponse.next();

    // Attach CORS headers to all responses
    Object.entries(corsHeaders(origin)).forEach(([key, value]) => {
        response.headers.set(key, value);
    });

    return response;
}