import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const getByClerkId = query({
    args: { clerkId: v.string() },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("users")
            .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
            .unique();
    },
});

export const getByEmail = query({
    args: { email: v.string() },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("users")
            .withIndex("by_email", (q) => q.eq("email", args.email))
            .unique();
    },
});

export const create = mutation({
    args: {
        clerkId: v.optional(v.string()), // Made optional for auto-generation
        name: v.string(),
        role: v.union(
            v.literal("Owner"),
            v.literal("Deployment Manager"),
            v.literal("Manager"),
            v.literal("Officer"),
            v.literal("Security Officer"),
            v.literal("SG"),
            v.literal("SO")
        ),
        organizationId: v.id("organizations"),
        siteIds: v.optional(v.array(v.id("sites"))),
        email: v.optional(v.string()),
        mobileNumber: v.optional(v.string()),
        permissions: v.optional(v.object({
            users: v.boolean(),
            sites: v.boolean(),
            patrolPoints: v.boolean(),
            patrolLogs: v.boolean(),
            visitLogs: v.boolean(),
            issues: v.boolean(),
            analytics: v.boolean(),
        })),
    },
    handler: async (ctx, args) => {
        const clerkId = args.clerkId || `pending_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        return await ctx.db.insert("users", {
            clerkId,
            name: args.name,
            role: args.role,
            organizationId: args.organizationId,
            siteIds: args.siteIds,
            email: args.email,
            mobileNumber: args.mobileNumber,
            permissions: args.permissions,
        });
    },
});

export const update = mutation({
    args: {
        id: v.id("users"),
        name: v.string(),
        role: v.union(
            v.literal("Owner"),
            v.literal("Deployment Manager"),
            v.literal("Manager"),
            v.literal("Officer"),
            v.literal("Security Officer"),
            v.literal("SG"),
            v.literal("SO")
        ),
        organizationId: v.optional(v.id("organizations")),
        siteIds: v.optional(v.array(v.id("sites"))),
        email: v.optional(v.string()),
        mobileNumber: v.optional(v.string()),
        permissions: v.optional(v.object({
            users: v.boolean(),
            sites: v.boolean(),
            patrolPoints: v.boolean(),
            patrolLogs: v.boolean(),
            visitLogs: v.boolean(),
            issues: v.boolean(),
            analytics: v.boolean(),
        })),
    },
    handler: async (ctx, args) => {
        const { id, ...data } = args;
        await ctx.db.patch(id, data);
    },
});

export const remove = mutation({
    args: { id: v.id("users") },
    handler: async (ctx, args) => {
        await ctx.db.delete(args.id);
    },
});

export const listByOrg = query({
    args: { organizationId: v.id("organizations") },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("users")
            .withIndex("by_org", (q) => q.eq("organizationId", args.organizationId))
            .collect();
    },
});

export const listBySite = query({
    args: { siteId: v.id("sites") },
    handler: async (ctx, args) => {
        const site = await ctx.db.get(args.siteId);
        if (!site) return [];

        const users = await ctx.db
            .query("users")
            .withIndex("by_org", (q) => q.eq("organizationId", site.organizationId))
            .collect();

        return users.filter((user) =>
            !user.siteIds || user.siteIds.includes(args.siteId)
        );
    },
});
