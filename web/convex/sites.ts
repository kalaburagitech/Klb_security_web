import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// Site Management
export const createSite = mutation({
    args: {
        name: v.string(),
        locationName: v.string(),
        latitude: v.number(),
        longitude: v.number(),
        allowedRadius: v.number(),
        organizationId: v.id("organizations"),
        regionId: v.optional(v.string()),
        city: v.optional(v.string()),
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
        regionId: v.optional(v.string()),
        city: v.optional(v.string()),
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

export const countAll = query({
    handler: async (ctx) => {
        const sites = await ctx.db.query("sites").collect();
        return sites.length;
    },
});

export const listSitesByOrg = query({
    args: { 
        organizationId: v.id("organizations"),
        regionId: v.optional(v.string()),
        city: v.optional(v.string())
    },
    handler: async (ctx, args) => {
        let sites = await ctx.db
            .query("sites")
            .withIndex("by_org", (q) => q.eq("organizationId", args.organizationId))
            .collect();

        if (args.regionId) {
            const rSearch = args.regionId.toLowerCase().trim();
            sites = sites.filter(s => s.regionId?.toLowerCase().trim() === rSearch);
        }
        if (args.city) {
            const cSearch = args.city.toLowerCase().trim();
            sites = sites.filter(s => s.city?.toLowerCase().trim() === cSearch);
        }
        return sites;
    },
});

export const listSitesByUser = query({
    args: { 
        userId: v.id("users"),
        regionId: v.optional(v.string()),
        city: v.optional(v.string())
    },
    handler: async (ctx, args) => {
        const user = await ctx.db.get(args.userId);
        if (!user) return [];

        const rawRole = (user.role as string || '').toLowerCase().trim();
        
        const isAdministrative = 
            rawRole.includes("owner") || 
            rawRole.includes("manager") || 
            rawRole.includes("officer") ||
            rawRole.includes("deployment manager") ||
            rawRole.includes("higher officer");

        const isActuallyAdmin = isAdministrative && 
            !rawRole.includes("security officer") && 
            rawRole !== "so" && 
            rawRole !== "sg" && 
            rawRole !== "new_user";

        if (isActuallyAdmin) {
            console.log(`[Convex] User ${args.userId} identifies as administrative (${user.role}). Fetching all organization sites.`);
            let sites = await ctx.db
                .query("sites")
                .withIndex("by_org", (q) => q.eq("organizationId", user.organizationId))
                .collect();

            if (args.regionId) {
                const rSearch = args.regionId.toLowerCase().trim();
                sites = sites.filter(s => s.regionId?.toLowerCase().trim() === rSearch);
            }
            if (args.city) {
                const cSearch = args.city.toLowerCase().trim();
                sites = sites.filter(s => s.city?.toLowerCase().trim() === cSearch);
            }
            return sites;
        }

        const ids = new Set<string>();
        if ((user as any).siteId) {
            const sid = (user as any).siteId.toString();
            if (sid && sid !== "undefined") ids.add(sid);
        }
        if (Array.isArray((user as any).siteIds)) {
            for (const id of (user as any).siteIds) {
                if (id) {
                    const sid = id.toString();
                    if (sid && sid !== "undefined") ids.add(sid);
                }
            }
        }

        console.log(`[Convex] Resolving sites for user ${args.userId}. IDs:`, Array.from(ids));

        const sites = [];
        for (const id of ids) {
            try {
                const site = await ctx.db.get(id as Id<"sites">);
                if (site) {
                    // Filter by region if regionId is provided
                    let matchesRegion = true;
                    if (args.regionId) {
                        matchesRegion = site.regionId === args.regionId;
                    }

                    // Filter by city if city is provided
                    let matchesCity = true;
                    if (args.city) {
                        matchesCity = site.city === args.city;
                    }

                    if (matchesRegion && matchesCity) {
                        sites.push(site);
                    }
                }
            } catch (err) {
                console.error(`[Convex] Error fetching site ${id}:`, err);
            }
        }
        return sites;
    },
});

export const getSite = query({
    args: { id: v.id("sites") },
    handler: async (ctx, args) => {
        return await ctx.db.get(args.id);
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

export const countByOrg = query({
    args: {
        organizationId: v.id("organizations"),
        siteId: v.optional(v.id("sites")),
        regionId: v.optional(v.string()),
        city: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        if (args.siteId) {
            const site = await ctx.db.get(args.siteId);
            if (!site || site.organizationId !== args.organizationId) {
                return 0;
            }
            return 1;
        }

        let sites = await ctx.db
            .query("sites")
            .withIndex("by_org", (q) => q.eq("organizationId", args.organizationId))
            .collect();

        if (args.regionId) {
            sites = sites.filter(s => s.regionId === args.regionId);
        }

        if (args.city) {
            sites = sites.filter(s => s.city === args.city);
        }

        return sites.length;
    },
});

export const searchSites = query({
    args: v.object({
        organizationId: v.id("organizations"),
        searchQuery: v.optional(v.string()),
        paginationOpts: v.optional(
            v.object({
                cursor: v.optional(v.union(v.string(), v.null())),
                numItems: v.number(),
            })
        ),
    }),
    handler: async (ctx, args) => {
        // First, get all sites for this organization
        let sites = await ctx.db
            .query("sites")
            .withIndex("by_org", (q) => q.eq("organizationId", args.organizationId))
            .collect();

        // Apply search filter if provided and not empty
        if (args.searchQuery && args.searchQuery.trim()) {
            const lower = args.searchQuery.toLowerCase().trim();
            sites = sites.filter((s) =>
                s.name.toLowerCase().includes(lower) ||
                s.locationName?.toLowerCase().includes(lower)
            );
        }

        // If no pagination options, return all matching sites
        if (!args.paginationOpts) {
            return {
                page: sites,
                isDone: true,
                continueCursor: "",
            };
        }

        const start = args.paginationOpts.cursor ? parseInt(args.paginationOpts.cursor) : 0;
        const numItems = args.paginationOpts.numItems;
        const paginatedSites = sites.slice(start, start + numItems);

        const isDone = start + paginatedSites.length >= sites.length;
        const continueCursor = isDone ? "" : (start + paginatedSites.length).toString();

        return {
            page: paginatedSites,
            isDone,
            continueCursor,
        };
    },
});
