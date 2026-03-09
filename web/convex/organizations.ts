import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const get = query({
    args: { id: v.id("organizations") },
    handler: async (ctx, args) => {
        return await ctx.db.get(args.id);
    },
});

export const create = mutation({
    args: { name: v.string() },
    handler: async (ctx, args) => {
        return await ctx.db.insert("organizations", {
            name: args.name,
            createdAt: Date.now(),
        });
    },
});

export const update = mutation({
    args: { id: v.id("organizations"), name: v.string() },
    handler: async (ctx, args) => {
        await ctx.db.patch(args.id, { name: args.name });
    },
});

export const remove = mutation({
    args: { id: v.id("organizations") },
    handler: async (ctx, args) => {
        const sites = await ctx.db
            .query("sites")
            .withIndex("by_org", (q) => q.eq("organizationId", args.id))
            .first();
        if (sites) throw new Error("Cannot delete organization with active sites. Please delete the sites first.");

        const users = await ctx.db
            .query("users")
            .withIndex("by_org", (q) => q.eq("organizationId", args.id))
            .first();
        // Allow deletion if only the current user is left? No, usually safer to be strict.
        if (users) throw new Error("Cannot delete organization with registered users.");

        await ctx.db.delete(args.id);
    },
});

export const list = query({
    handler: async (ctx) => {
        return await ctx.db.query("organizations").collect();
    },
});
