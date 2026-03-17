import { NextRequest, NextResponse } from "next/server";

export function corsHeaders(origin: string | null = "*") {
    return {
        "Access-Control-Allow-Origin": origin || "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
    };
}

export function handleCors(req: NextRequest) {
    const origin = req.headers.get("origin");
    return corsHeaders(origin);
}

export function handleOptions(req: NextRequest) {
    return new NextResponse(null, {
        status: 200,
        headers: handleCors(req),
    });
}