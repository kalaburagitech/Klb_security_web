import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

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
        // Use provided QR code or generate a unique one
        const qrCode = args.qrCode || `${args.siteId.slice(0, 4)}-${args.name.replace(/\s+/g, '-').toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

        const payload = {
            siteId: args.siteId,
            name: args.name,
            qrCode,
            latitude: args.latitude,
            longitude: args.longitude,
            organizationId: args.organizationId,
            imageId: args.imageId,
            createdAt: Date.now(),
        };

        // Remove undefined or NaN values to avoid insert errors
        const cleanPayload = Object.fromEntries(
            Object.entries(payload).filter(([_, value]) =>
                value !== undefined && !(typeof value === "number" && isNaN(value))
            )
        ) as typeof payload;

        return await ctx.db.insert("patrolPoints", cleanPayload);
    },
});

export const createBatchPoints = mutation({
    args: {
        baseName: v.string(),
        count: v.number(),
        siteId: v.id("sites"),
        latitude: v.number(),
        longitude: v.number(),
        organizationId: v.id("organizations"),
        imageId: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const generatedIds = [] as string[];
        for (let i = 1; i <= Math.min(Math.max(args.count, 1), 100); i++) {
            const name = `${args.baseName}-${i}`;
            const qrCode = `${args.siteId.slice(0, 4)}-${name.replace(/\s+/g, '-').toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
            const record = await ctx.db.insert("patrolPoints", {
                siteId: args.siteId,
                name,
                latitude: args.latitude,
                longitude: args.longitude,
                organizationId: args.organizationId,
                imageId: args.imageId,
                qrCode,
                createdAt: Date.now(),
            });
            generatedIds.push(record);
        }
        return generatedIds;
    },
});

export const listAll = query({
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
        name: v.optional(v.string()),
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
            Object.entries(updates).filter(([_, value]) =>
                value !== undefined && !(typeof value === "number" && isNaN(value))
            )
        ) as typeof updates;

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
        organizationId: v.id("organizations"),
        siteId: v.optional(v.id("sites")),
        searchQuery: v.optional(v.string()),
        paginationOpts: v.object({
            cursor: v.union(v.string(), v.null()),
            numItems: v.float64(),
            id: v.optional(v.float64()), // now allowed
        }),
    },
    handler: async (ctx, args) => {
        // Fetch patrol points for org (and optionally site), then apply optional search filter.
        let points = await ctx.db
            .query("patrolPoints")
            .withIndex("by_org", (q) => q.eq("organizationId", args.organizationId))
            .collect();

        if (args.siteId) {
            points = points.filter((p) => p.siteId === args.siteId);
        }

        if (args.searchQuery && args.searchQuery.trim()) {
            const lower = args.searchQuery.toLowerCase();
            points = points.filter((p) => p.name.toLowerCase().includes(lower));
        }

        // Pagination
        const start = args.paginationOpts.cursor ? parseInt(args.paginationOpts.cursor) : 0;
        const numItems = args.paginationOpts.numItems;
        const paginated = points.slice(start, start + numItems);

        const isDone = start + paginated.length >= points.length;
        const continueCursor = isDone ? "" : (start + paginated.length).toString();

        return {
            page: paginated,
            continueCursor,
            isDone,
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

