import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const reportIncident = mutation({
    args: {
        siteId: v.id("sites"),
        patrolPointId: v.optional(v.id("patrolPoints")),
        imageId: v.optional(v.string()),
        comment: v.string(),
        severity: v.union(v.literal("Low"), v.literal("Medium"), v.literal("High")),
        organizationId: v.id("organizations"),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Unauthorized");

        const user = await ctx.db
            .query("users")
            .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
            .unique();

        if (!user) throw new Error("User not found");

        return await ctx.db.insert("incidents", {
            guardId: user._id,
            siteId: args.siteId,
            patrolPointId: args.patrolPointId,
            imageId: args.imageId,
            comment: args.comment,
            severity: args.severity,
            timestamp: Date.now(),
            organizationId: args.organizationId,
        });
    },
});

export const getSiteIncidents = query({
    args: { siteId: v.id("sites") },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("incidents")
            .withIndex("by_site", (q) => q.eq("siteId", args.siteId))
            .order("desc")
            .collect();
    },
});
