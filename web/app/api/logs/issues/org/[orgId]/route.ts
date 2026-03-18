import { NextResponse } from "next/server";
import { fetchQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import { corsHeaders } from "@/lib/cors";

export async function GET(
    req: Request,
    { params }: { params: { orgId: string } }
) {
    const { orgId } = params;
    const { searchParams } = new URL(req.url);
    const siteId = searchParams.get("siteId");

    try {
        const issues = await fetchQuery(api.logs.listIssuesByOrg, {
            organizationId: orgId as any,
            siteId: (siteId as any) || undefined,
        });

        return NextResponse.json(issues, { headers: corsHeaders() });
    } catch (error: any) {
        console.error("Fetch issues error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to fetch issues" },
            { status: 500, headers: corsHeaders() }
        );
    }
}

export async function OPTIONS() {
    return NextResponse.json({}, { headers: corsHeaders() });
}
