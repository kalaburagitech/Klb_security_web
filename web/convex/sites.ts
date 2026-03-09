import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Site Management
export const createSite = mutation({
    args: {
        name: v.string(),
        locationName: v.string(),
        latitude: v.number(),
        longitude: v.number(),
        allowedRadius: v.number(),
        organizationId: v.id("organizations"),
        shiftStart: v.optional(v.string()),
        shiftEnd: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        return await ctx.db.insert("sites", args);
    },
});

export const updateSite = mutation({
    args: {
        id: v.id("sites"),
        name: v.string(),
        locationName: v.string(),
        latitude: v.number(),
        longitude: v.number(),
        allowedRadius: v.number(),
        organizationId: v.id("organizations"),
        shiftStart: v.optional(v.string()),
        shiftEnd: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const { id, ...data } = args;
        await ctx.db.patch(id, data);
    },
});

export const removeSite = mutation({
    args: { id: v.id("sites") },
    handler: async (ctx, args) => {
        await ctx.db.delete(args.id);
    },
});

export const listSitesByIds = query({
    args: { ids: v.array(v.id("sites")) },
    handler: async (ctx, args) => {
        const sites = [];
        for (const id of args.ids) {
            const site = await ctx.db.get(id);
            if (site) sites.push(site);
        }
        return sites;
    },
});

export const listAll = query({
    handler: async (ctx) => {
        return await ctx.db.query("sites").collect();
    },
});

export const listSitesByOrg = query({
    args: { organizationId: v.id("organizations") },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("sites")
            .withIndex("by_org", (q) => q.eq("organizationId", args.organizationId))
            .collect();
    },
});

// Patrol Point Management
export const createPatrolPoint = mutation({
    args: {
        siteId: v.id("sites"),
        name: v.string(),
        qrCode: v.string(),
        organizationId: v.id("organizations"),
    },
    handler: async (ctx, args) => {
        return await ctx.db.insert("patrolPoints", args);
    },
});

export const listPatrolPointsBySite = query({
    args: { siteId: v.id("sites") },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("patrolPoints")
            .filter((q) => q.eq(q.field("siteId"), args.siteId))
            .collect();
    },
});
