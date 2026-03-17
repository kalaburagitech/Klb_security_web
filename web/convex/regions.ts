import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
    args: {},
    handler: async (ctx) => {
        const regions = await ctx.db.query("regions").collect();
        return regions.map((region) => ({
            regionId: region.regionId,
            regionName: region.regionName,
            createdAt: region.createdAt,
        }));
    },
});

export const create = mutation({
    args: {
        regionId: v.string(),
        regionName: v.string(),
    },
    handler: async (ctx, args) => {
        // Check if region already exists
        const existing = await ctx.db
            .query("regions")
            .withIndex("by_regionId", (q) => q.eq("regionId", args.regionId))
            .first();

        if (existing) {
            throw new Error("Region already exists");
        }

        const id = await ctx.db.insert("regions", {
            regionId: args.regionId,
            regionName: args.regionName,
            createdAt: Date.now(),
        });

        return id;
    },
});

export const get = query({
    args: { regionId: v.string() },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("regions")
            .withIndex("by_regionId", (q) => q.eq("regionId", args.regionId))
            .first();
    },
});

export const remove = mutation({
    args: { id: v.id("regions") },
    handler: async (ctx, args) => {
        await ctx.db.delete(args.id);
    },
});

export const update = mutation({
    args: {
        id: v.id("regions"),
        regionId: v.string(),
        regionName: v.string(),
    },
    handler: async (ctx, args) => {
        const { id, ...data } = args;
        await ctx.db.patch(id, data);
    },
});
