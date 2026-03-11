import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const list = query({
    args: { organizationId: v.id("organizations") },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("issues")
            .withIndex("by_org", (q) => q.eq("organizationId", args.organizationId))
            .order("desc")
            .collect();
    },
});

export const resolveIssue = mutation({
    args: { issueId: v.id("issues") },
    handler: async (ctx, args) => {
        await ctx.db.patch(args.issueId, { status: "closed" });
    },
});

export const getIssueWithLog = query({
    args: { issueId: v.id("issues") },
    handler: async (ctx, args) => {
        const issue = await ctx.db.get(args.issueId);
        if (!issue) return null;

        const log = await ctx.db.get(issue.logId);
        const site = await ctx.db.get(issue.siteId);

        return { ...issue, log, site };
    },
});
