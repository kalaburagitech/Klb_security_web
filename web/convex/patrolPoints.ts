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
