import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/* ------------------------------------------------ */
/* GET USER BY CLERK ID */
/* ------------------------------------------------ */

export const getByClerkId = query({
    args: { clerkId: v.optional(v.string()) },
    handler: async (ctx, args) => {
        const clerkId = args.clerkId;
        if (!clerkId) return null;
        const user = await ctx.db
            .query("users")
            .withIndex("by_clerkId", (q) => q.eq("clerkId", clerkId))
            .first();

        return user ?? null;
    },
});

/* ------------------------------------------------ */
/* GET USER BY EMAIL */
/* ------------------------------------------------ */

export const getByEmail = query({
    args: { email: v.string() },
    handler: async (ctx, args) => {
        const user = await ctx.db
            .query("users")
            .withIndex("by_email", (q) => q.eq("email", args.email))
            .first();

        return user ?? null;
    },
});

/* ------------------------------------------------ */
/* GET USER BY MOBILE */
/* ------------------------------------------------ */

export const getByMobileNumber = query({
    args: { mobileNumber: v.string() },
    handler: async (ctx, args) => {
        const users = await ctx.db.query("users").collect();
        return users.find((u) => u.mobileNumber === args.mobileNumber) ?? null;
    },
});

/* ------------------------------------------------ */
/* CREATE USER */
/* ------------------------------------------------ */

export const create = mutation({
    args: {
        clerkId: v.optional(v.string()),
        name: v.string(),
        role: v.union(
            v.literal("Owner"),
            v.literal("Deployment Manager"),
            v.literal("Manager"),
            v.literal("Officer"),
            v.literal("Security Officer"),
            v.literal("SG"),
            v.literal("SO"),
            v.literal("Higher Officer"),
            v.literal("NEW_USER")
        ),
        organizationId: v.id("organizations"),
        siteIds: v.optional(v.array(v.id("sites"))),
        email: v.optional(v.string()),
        mobileNumber: v.optional(v.string()),
        regionId: v.optional(v.string()),
        city: v.optional(v.string()),
        permissions: v.optional(
            v.object({
                users: v.boolean(),
                sites: v.boolean(),
                patrolPoints: v.boolean(),
                patrolLogs: v.boolean(),
                visitLogs: v.boolean(),
                issues: v.boolean(),
                analytics: v.boolean(),
            })
        ),
    },

    handler: async (ctx, args) => {
        /* Prevent duplicate Clerk users */

        const clerkIdArg = args.clerkId;
        if (clerkIdArg) {
            const existing = await ctx.db
                .query("users")
                .withIndex("by_clerkId", (q) => q.eq("clerkId", clerkIdArg))
                .first();

            if (existing) {
                return existing._id;
            }
        }

        const clerkId =
            args.clerkId ??
            `pending_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

        return await ctx.db.insert("users", {
            clerkId,
            name: args.name,
            role: args.role,
            organizationId: args.organizationId,
            siteIds: args.siteIds,
            email: args.email,
            mobileNumber: args.mobileNumber,
            regionId: args.regionId,
            city: args.city,
            permissions: args.permissions,
        });
    },
});

/* ------------------------------------------------ */
/* UPDATE USER */
/* ------------------------------------------------ */

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
            v.literal("SO"),
            v.literal("Higher Officer"),
            v.literal("NEW_USER")
        ),
        organizationId: v.optional(v.id("organizations")),
        siteIds: v.optional(v.array(v.id("sites"))),
        email: v.optional(v.string()),
        mobileNumber: v.optional(v.string()),
        regionId: v.optional(v.string()),
        city: v.optional(v.string()),
        permissions: v.optional(
            v.object({
                users: v.boolean(),
                sites: v.boolean(),
                patrolPoints: v.boolean(),
                patrolLogs: v.boolean(),
                visitLogs: v.boolean(),
                issues: v.boolean(),
                analytics: v.boolean(),
            })
        ),
    },

    handler: async (ctx, args) => {
        const { id, ...data } = args;
        await ctx.db.patch(id, data);
        return id;
    },
});

/* ------------------------------------------------ */
/* DELETE USER */
/* ------------------------------------------------ */

export const remove = mutation({
    args: { id: v.id("users") },
    handler: async (ctx, args) => {
        await ctx.db.delete(args.id);
    },
});

/* ------------------------------------------------ */
/* LIST ALL USERS */
/* ------------------------------------------------ */

export const listAll = query({
    handler: async (ctx) => {
        return await ctx.db.query("users").collect();
    },
});

export const countAll = query({
    handler: async (ctx) => {
        const users = await ctx.db.query("users").collect();
        return users.length;
    },
});

/* ------------------------------------------------ */
/* LIST USERS BY ORGANIZATION */
/* ------------------------------------------------ */

export const listByOrg = query({
    args: { organizationId: v.id("organizations") },

    handler: async (ctx, args) => {
        return await ctx.db
            .query("users")
            .withIndex("by_org", (q) => q.eq("organizationId", args.organizationId))
            .collect();
    },
});

/* ------------------------------------------------ */
/* LIST USERS BY SITE */
/* ------------------------------------------------ */

export const listBySite = query({
    args: { siteId: v.id("sites") },

    handler: async (ctx, args) => {
        const site = await ctx.db.get(args.siteId);

        if (!site) return [];

        const users = await ctx.db
            .query("users")
            .withIndex("by_org", (q) => q.eq("organizationId", site.organizationId))
            .collect();

        return users.filter(
            (user) => user.siteIds?.includes(args.siteId)
        );
    },
});


export const countByOrg = query({
    args: {
        organizationId: v.id("organizations"),
        siteId: v.optional(v.id("sites")),
    },
    handler: async (ctx, args) => {
        let users = await ctx.db
            .query("users")
            .withIndex("by_org", (q) => q.eq("organizationId", args.organizationId))
            .collect();

        if (args.siteId) {
            const siteId = args.siteId;
            users = users.filter((user) => user.siteIds?.includes(siteId));
        }

        return users.length;
    },
});