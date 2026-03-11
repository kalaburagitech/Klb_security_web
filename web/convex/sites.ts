import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { paginationOptsValidator } from "convex/server";

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

export const list = query({
    args: { userId: v.optional(v.id("users")) },
    handler: async (ctx, args) => {
        if (args.userId) {
            const user = await ctx.db.get(args.userId);
            if (user?.role === "SG" && user.siteIds) {
                const sites = [];
                for (const siteId of user.siteIds) {
                    const site = await ctx.db.get(siteId);
                    if (site) sites.push(site);
                }
                return sites;
            }
        }
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
export const removePoint = mutation({
    args: { pointId: v.id("patrolPoints") },
    handler: async (ctx, args) => {
        await ctx.db.delete(args.pointId);
    },
});

export const updatePatrolPoint = mutation({
    args: {
        id: v.id("patrolPoints"),
        name: v.optional(v.string()),
        qrCode: v.optional(v.string()),
        latitude: v.optional(v.number()),
        longitude: v.optional(v.number()),
        imageId: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const { id, ...data } = args;
        await ctx.db.patch(id, data);
    },
});

export const getSite = query({
    args: { id: v.id("sites") },
    handler: async (ctx, args) => {
        return await ctx.db.get(args.id);
    },
});

export const updateSiteLocation = mutation({
    args: {
        id: v.id("sites"),
        latitude: v.number(),
        longitude: v.number(),
    },
    handler: async (ctx, args) => {
        await ctx.db.patch(args.id, {
            latitude: args.latitude,
            longitude: args.longitude,
        });
    },
});

export const searchSites = query({
    args: {
        organizationId: v.optional(v.id("organizations")),
        searchQuery: v.string(),
        paginationOpts: paginationOptsValidator,
    },
    handler: async (ctx, args) => {
        const orgId = args.organizationId;
        if (args.searchQuery.trim()) {
            return await ctx.db
                .query("sites")
                .withSearchIndex("search_name", (q) => {
                    let search = q.search("name", args.searchQuery);
                    if (orgId) {
                        search = search.eq("organizationId", orgId);
                    }
                    return search;
                })
                .paginate(args.paginationOpts);
        } else {
            const q = orgId
                ? ctx.db.query("sites").withIndex("by_org", (q) => q.eq("organizationId", orgId))
                : ctx.db.query("sites");
            return await q.order("desc").paginate(args.paginationOpts);
        }
    },
});

export const countByOrg = query({
    args: { organizationId: v.optional(v.id("organizations")) },
    handler: async (ctx, args) => {
        const orgId = args.organizationId;
        const q = orgId
            ? ctx.db.query("sites").withIndex("by_org", (q) => q.eq("organizationId", orgId))
            : ctx.db.query("sites");
        const sites = await q.collect();
        return sites.length;
    },
});
