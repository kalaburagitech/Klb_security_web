import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const startSession = mutation({
    args: {
        siteId: v.id("sites"),
        organizationId: v.id("organizations"),
        userId: v.id("users"),
    },
    handler: async (ctx, args) => {
        const user = await ctx.db.get(args.userId);
        if (!user) throw new Error("User not found");

        // End any existing active sessions for this guard
        const activeSessions = await ctx.db
            .query("patrolSessions")
            .withIndex("by_guard", (q) => q.eq("guardId", user._id))
            .filter((q) => q.eq(q.field("status"), "active"))
            .collect();

        for (const session of activeSessions) {
            await ctx.db.patch(session._id, {
                status: "completed",
                endTime: Date.now(),
            });
        }

        return await ctx.db.insert("patrolSessions", {
            guardId: user._id,
            siteId: args.siteId,
            startTime: Date.now(),
            status: "active",
            scannedPoints: [],
            organizationId: args.organizationId,
        });
    },
});

export const endSession = mutation({
    args: { sessionId: v.id("patrolSessions") },
    handler: async (ctx, args) => {
        await ctx.db.patch(args.sessionId, {
            status: "completed",
            endTime: Date.now(),
        });
    },
});

export const getActiveSession = query({
    args: {
        guardId: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        if (!args.guardId) return null;

        return await ctx.db
            .query("patrolSessions")
            .withIndex("by_guard", (q) => q.eq("guardId", args.guardId as any))
            .filter((q) => q.eq(q.field("status"), "active"))
            .unique();
    },
});
