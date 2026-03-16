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

        const regionId = await ctx.db.insert("regions", {
            regionId: args.regionId,
            regionName: args.regionName,
            createdAt: Date.now(),
        });

        return regionId;
    },
});
