import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { paginationOptsValidator } from "convex/server";

export const createPoint = mutation({
    args: {
        siteId: v.id("sites"),
        name: v.string(),
        latitude: v.number(),
        longitude: v.number(),
        organizationId: v.id("organizations"),
        imageId: v.optional(v.string()),
        qrCode: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        // Use provided QR code or generate a unique unique one
        const qrCode = args.qrCode || `${args.siteId.slice(0, 4)}-${args.name.replace(/\s+/g, '-').toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

        return await ctx.db.insert("patrolPoints", {
            siteId: args.siteId,
            name: args.name,
            qrCode,
            latitude: args.latitude,
            longitude: args.longitude,
            organizationId: args.organizationId,
            imageId: args.imageId,
            createdAt: Date.now(),
        });
    },
});

export const createBatchPoints = mutation({
    args: {
        siteId: v.id("sites"),
        baseName: v.string(),
        count: v.number(),
        latitude: v.number(),
        longitude: v.number(),
        organizationId: v.id("organizations"),
    },
    handler: async (ctx, args) => {
        const ids = [];
        for (let i = 0; i < args.count; i++) {
            const name = `${args.baseName} ${i + 1}`;
            const qrCode = `${args.siteId.slice(0, 4)}-${name.replace(/\s+/g, '-').toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

            const id = await ctx.db.insert("patrolPoints", {
                siteId: args.siteId,
                name: name,
                qrCode,
                latitude: args.latitude,
                longitude: args.longitude,
                organizationId: args.organizationId,
                createdAt: Date.now(),
            });
            ids.push(id);
        }
        return ids;
    },
});

export const list = query({
    handler: async (ctx) => {
        return await ctx.db.query("patrolPoints").collect();
    },
});

export const listByOrg = query({
    args: { organizationId: v.id("organizations") },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("patrolPoints")
            .withIndex("by_org", (q) => q.eq("organizationId", args.organizationId))
            .collect();
    },
});

export const listBySite = query({
    args: { siteId: v.id("sites") },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("patrolPoints")
            .withIndex("by_site", (q) => q.eq("siteId", args.siteId))
            .collect();
    },
});

export const updatePoint = mutation({
    args: {
        id: v.id("patrolPoints"),
        name: v.string(),
        latitude: v.optional(v.number()),
        longitude: v.optional(v.number()),
        imageId: v.optional(v.string()),
        siteId: v.optional(v.id("sites")),
        qrCode: v.optional(v.string()),
        organizationId: v.optional(v.id("organizations")),
    },
    handler: async (ctx, args) => {
        const { id, ...updates } = args;

        // Remove undefined or NaN values to avoid patch errors
        const cleanUpdates = Object.fromEntries(
            Object.entries(updates).filter(([_, v]) =>
                v !== undefined && (typeof v !== 'number' || !isNaN(v))
            )
        );

        await ctx.db.patch(id, cleanUpdates);
    },
});

export const removePoint = mutation({
    args: { id: v.id("patrolPoints") },
    handler: async (ctx, args) => {
        return await ctx.db.delete(args.id);
    },
});

export const searchPoints = query({
    args: {
        organizationId: v.optional(v.id("organizations")),
        siteId: v.optional(v.id("sites")),
        searchQuery: v.string(),
        paginationOpts: paginationOptsValidator,
    },
    handler: async (ctx, args) => {
        const orgId = args.organizationId;
        const sId = args.siteId;

        let q;
        let paginatedResults: any;
        if (args.searchQuery.trim()) {
            const searchQ = ctx.db
                .query("patrolPoints")
                .withSearchIndex("search_name", (q) => {
                    let search = q.search("name", args.searchQuery);
                    if (orgId) search = search.eq("organizationId", orgId);
                    if (sId) search = search.eq("siteId", sId);
                    return search;
                });
            paginatedResults = await searchQ.paginate(args.paginationOpts);
        } else {
            let regularQ = ctx.db.query("patrolPoints") as any;
            if (sId) {
                regularQ = regularQ.withIndex("by_site", (q: any) => q.eq("siteId", sId));
            } else if (orgId) {
                regularQ = regularQ.withIndex("by_org", (q: any) => q.eq("organizationId", orgId));
            }
            paginatedResults = await regularQ.order("desc").paginate(args.paginationOpts);
        }
        
        // Enrich with site names
        const enrichedPage = await Promise.all(
            paginatedResults.page.map(async (point: any) => {
                const site = await ctx.db.get(point.siteId) as any;
                return {
                    ...point,
                    siteName: site?.name || "Unknown Site"
                };
            })
        );

        return {
            ...paginatedResults,
            page: enrichedPage,
        };
    },
});

export const countByOrg = query({
    args: { 
        organizationId: v.optional(v.id("organizations")),
        siteId: v.optional(v.id("sites"))
    },
    handler: async (ctx, args) => {
        const orgId = args.organizationId;
        const sId = args.siteId;

        if (sId) {
            const points = await ctx.db
                .query("patrolPoints")
                .withIndex("by_site", (q) => q.eq("siteId", sId))
                .collect();
            return points.length;
        }

        const q = orgId
            ? ctx.db.query("patrolPoints").withIndex("by_org", (q) => q.eq("organizationId", orgId))
            : ctx.db.query("patrolPoints");
        const points = await q.collect();
        return points.length;
    },
});
