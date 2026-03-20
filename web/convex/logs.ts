import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";

export const createPatrolLog = mutation({
    args: {
        userId: v.id("users"),
        siteId: v.id("sites"),
        patrolPointId: v.optional(v.id("patrolPoints")),
        imageId: v.optional(v.string()),
        comment: v.string(),
        latitude: v.number(),
        longitude: v.number(),
        distance: v.number(),
        organizationId: v.id("organizations"),
        issueDetails: v.optional(v.object({
            title: v.string(),
            priority: v.union(v.literal("Low"), v.literal("Medium"), v.literal("High")),
        })),
    },
    handler: async (ctx, args) => {
        const { issueDetails, ...logData } = args;
        const logId = await ctx.db.insert("patrolLogs", {
            ...logData,
            createdAt: Date.now(),
        });

        // Auto-create issue if geo-fence violation (> 50m)
        if (args.distance > 50) {
            await ctx.db.insert("issues", {
                siteId: args.siteId,
                logId: logId,
                title: "Geo-fence Violation",
                description: `Patrol logged ${args.distance.toFixed(1)}m away from point.`,
                priority: "High",
                status: "open",
                timestamp: Date.now(),
                organizationId: args.organizationId,
            });
        }

        // Manual Issue reporting
        if (issueDetails) {
            await ctx.db.insert("issues", {
                siteId: args.siteId,
                logId: logId,
                title: issueDetails.title,
                description: args.comment || "Reported during patrol.",
                priority: issueDetails.priority,
                status: "open",
                timestamp: Date.now(),
                organizationId: args.organizationId,
            });
        }

        return logId;
    },
});

export const listPatrolLogs = query({
    args: { 
        organizationId: v.optional(v.id("organizations")), 
        siteId: v.optional(v.id("sites")),
        regionId: v.optional(v.string()),
        city: v.optional(v.string())
    },
    handler: async (ctx, args) => {
        let logs;
        if (args.siteId) {
            logs = await ctx.db
                .query("patrolLogs")
                .withIndex("by_site", (q) => q.eq("siteId", args.siteId as Id<"sites">))
                .order("desc")
                .collect();
        } else if (args.regionId || args.city) {
            // Filter by region/city via site lookup
            const sites = await (args.organizationId 
                ? ctx.db.query("sites").withIndex("by_org", (q) => q.eq("organizationId", args.organizationId as any))
                : ctx.db.query("sites")
            ).collect();
            
            const filteredSiteIds = new Set(
                sites.filter(s => {
                    let matchesRegion = !args.regionId || s.regionId === args.regionId;
                    let matchesCity = !args.city || s.city === args.city;
                    return matchesRegion && matchesCity;
                }).map(s => s._id)
            );
            
            const logsQuery = ctx.db.query("patrolLogs");
            const allLogs = await (args.organizationId
                ? logsQuery.withIndex("by_org", (q) => q.eq("organizationId", args.organizationId as any))
                : logsQuery
            ).order("desc").collect();
            
            logs = allLogs.filter(log => filteredSiteIds.has(log.siteId as any));
        } else if (args.organizationId) {
            logs = await ctx.db
                .query("patrolLogs")
                .withIndex("by_org", (q) => q.eq("organizationId", args.organizationId as any))
                .order("desc")
                .collect();
        } else {
            logs = await ctx.db.query("patrolLogs").order("desc").collect();
        }

        return await Promise.all(
            logs.map(async (log) => {
                const user = await ctx.db.get(log.userId);
                const site = await ctx.db.get(log.siteId);
                const point = log.patrolPointId ? await ctx.db.get(log.patrolPointId) : null;
                let imageUrl: string | null = null;
                if (log.imageId) {
                    try {
                        imageUrl = await ctx.storage.getUrl(log.imageId as any);
                    } catch {
                        imageUrl = null;
                    }
                }
                return {
                    ...log,
                    userName: user?.name || "Unknown",
                    userRole: user?.role || "SG",
                    siteName: site?.name || "Unknown",
                    pointName: point?.name || "General Area",
                    imageUrl,
                };
            })
        );
    },
});

export const listAllPatrolLogs = query({
    handler: async (ctx) => {
        const logs = await ctx.db.query("patrolLogs").order("desc").collect();

        return await Promise.all(
            logs.map(async (log) => {
                const user = await ctx.db.get(log.userId);
                const site = await ctx.db.get(log.siteId);
                const point = log.patrolPointId ? await ctx.db.get(log.patrolPointId) : null;
                let imageUrl: string | null = null;
                if (log.imageId) {
                    try {
                        imageUrl = await ctx.storage.getUrl(log.imageId as any);
                    } catch {
                        imageUrl = null;
                    }
                }
                return {
                    ...log,
                    userName: user?.name || "Unknown",
                    userRole: user?.role || "SG",
                    siteName: site?.name || "Unknown",
                    pointName: point?.name || "General Area",
                    imageUrl,
                };
            })
        );
    },
});

export const createVisitLog = mutation({
    args: {
        userId: v.id("users"),
        siteId: v.id("sites"),
        qrData: v.string(),
        remark: v.string(),
        latitude: v.number(),
        longitude: v.number(),
        organizationId: v.id("organizations"),
        visitType: v.optional(v.string()),
        imageId: v.optional(v.string()),
        issueDetails: v.optional(v.object({
            title: v.string(),
            priority: v.union(v.literal("Low"), v.literal("Medium"), v.literal("High")),
        })),
    },
    handler: async (ctx, args) => {
        const { issueDetails, ...logData } = args;
        const logId = await ctx.db.insert("visitLogs", {
            ...logData,
            createdAt: Date.now(),
        });

        // Manual Issue reporting for visits
        if (issueDetails) {
            await ctx.db.insert("issues", {
                siteId: args.siteId,
                logId: logId as any,
                title: issueDetails.title,
                description: args.remark || "Reported during visit.",
                priority: issueDetails.priority,
                status: "open",
                timestamp: Date.now(),
                organizationId: args.organizationId,
            });
        }

        return logId;
    },
});

export const countVisitLogsByType = query({
    args: {
        organizationId: v.id("organizations"),
        siteId: v.optional(v.id("sites")),
        regionId: v.optional(v.string()),
        city: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        let logs;
        if (args.organizationId) {
            logs = await ctx.db
                .query("visitLogs")
                .withIndex("by_org", (q) => q.eq("organizationId", args.organizationId as any))
                .collect();
        } else {
            logs = await ctx.db.query("visitLogs").collect();
        }

        if (args.siteId) {
            const sId = args.siteId as any;
            logs = logs.filter((log) => log.siteId === sId);
        } else if (args.regionId || args.city) {
            const sites = await (args.organizationId
                ? ctx.db.query("sites").withIndex("by_org", (q) => q.eq("organizationId", args.organizationId))
                : ctx.db.query("sites")
            ).collect();
            
            const filteredSiteIds = new Set(
                sites.filter(s => {
                    let matchesRegion = !args.regionId || s.regionId === args.regionId;
                    let matchesCity = !args.city || s.city === args.city;
                    return matchesRegion && matchesCity;
                }).map(s => s._id)
            );
            
            logs = logs.filter(log => filteredSiteIds.has(log.siteId as any));
        }

        const counts = {
            total: logs.length,
            trainer: logs.filter(l => (l as any).visitType === "Trainer").length,
            dayCheck: logs.filter(l => (l as any).visitType === "SiteCheckDay").length,
            nightCheck: logs.filter(l => (l as any).visitType === "SiteCheckNight").length,
            general: logs.filter(l => !(l as any).visitType || (l as any).visitType === "General").length,
        };

        return counts;
    },
});

export const listVisitLogs = query({
    args: { 
        organizationId: v.optional(v.id("organizations")),
        siteId: v.optional(v.id("sites")),
        regionId: v.optional(v.string()),
        city: v.optional(v.string())
    },
    handler: async (ctx, args) => {
        let logs;
        if (args.siteId) {
            logs = await ctx.db
                .query("visitLogs")
                .withIndex("by_site", (q) => q.eq("siteId", args.siteId as any))
                .order("desc")
                .collect();
        } else if (args.organizationId) {
            logs = await ctx.db
                .query("visitLogs")
                .withIndex("by_org", (q) => q.eq("organizationId", args.organizationId as any))
                .order("desc")
                .collect();
        } else {
            logs = await ctx.db.query("visitLogs").order("desc").collect();
        }

        if (!args.siteId && (args.regionId || args.city)) {
            const sites = await (args.organizationId
                ? ctx.db.query("sites").withIndex("by_org", (q) => q.eq("organizationId", args.organizationId as any))
                : ctx.db.query("sites")
            ).collect();
            
            const filteredSiteIds = new Set(
                sites.filter(s => {
                    let matchesRegion = !args.regionId || s.regionId === args.regionId;
                    let matchesCity = !args.city || s.city === args.city;
                    return matchesRegion && matchesCity;
                }).map(s => s._id)
            );
            
            logs = logs.filter(log => filteredSiteIds.has(log.siteId as any));
        }

        return await Promise.all(
            logs.map(async (log) => {
                const user = await ctx.db.get(log.userId);
                const site = await ctx.db.get(log.siteId);

                // Lookup the point by qrCode to get the name
                const point = await ctx.db
                    .query("patrolPoints")
                    .withIndex("by_org", (q) => q.eq("organizationId", (args.organizationId || log.organizationId) as any))
                    .filter((q) => q.eq(q.field("qrCode"), log.qrData))
                    .first();

                let imageUrl: string | null = null;
                if (log.imageId) {
                    try {
                        imageUrl = await ctx.storage.getUrl(log.imageId as any);
                    } catch {
                        imageUrl = null;
                    }
                }

                return {
                    ...log,
                    userName: user?.name || "Unknown",
                    userRole: user?.role || "Officer",
                    siteName: site?.name || "Unknown",
                    pointName: site ? `${site.name}_${point?.name || "General Scan"}` : (point?.name || "General Scan"),
                    imageUrl,
                };
            })
        );
    },
});

export const listAllVisitLogs = query({
    handler: async (ctx) => {
        const logs = await ctx.db.query("visitLogs").order("desc").collect();

        return await Promise.all(
            logs.map(async (log) => {
                const user = await ctx.db.get(log.userId);
                const site = await ctx.db.get(log.siteId);

                // Lookup the point by qrCode to get the name
                const point = await ctx.db
                    .query("patrolPoints")
                    .withIndex("by_org", (q) => q.eq("organizationId", log.organizationId))
                    .filter((q) => q.eq(q.field("qrCode"), log.qrData))
                    .first();

                let imageUrl: string | null = null;
                if (log.imageId) {
                    try {
                        imageUrl = await ctx.storage.getUrl(log.imageId as any);
                    } catch {
                        imageUrl = null;
                    }
                }

                return {
                    ...log,
                    userName: user?.name || "Unknown",
                    userRole: user?.role || "Officer",
                    siteName: site?.name || "Unknown",
                    pointName: site ? `${site.name}_${point?.name || "General Scan"}` : (point?.name || "General Scan"),
                    imageUrl,
                };
            })
        );
    },
});

export const listAllIssues = query({
    handler: async (ctx) => {
        const issues = await ctx.db.query("issues").order("desc").collect();
        return await Promise.all(
            issues.map(async (issue) => {
                const site = await ctx.db.get(issue.siteId);
                let reporterName = "Unknown";
                let reporterRole = "Staff";
                let locationContext = "General Visit";

                const patrolLog = await ctx.db.get(issue.logId as Id<"patrolLogs">);
                if (patrolLog && (patrolLog as any).userId) {
                    const user = (await ctx.db.get((patrolLog as any).userId)) as any;
                    reporterName = user?.name || "Unknown";
                    reporterRole = user?.role || "SG";
                    const point = (patrolLog as any).patrolPointId ? (await ctx.db.get((patrolLog as any).patrolPointId)) as any : null;
                    locationContext = point?.name || "Patrol Area";
                } else {
                    const visitLog = await ctx.db.get(issue.logId as Id<"visitLogs">);
                    if (visitLog) {
                        const user = (await ctx.db.get(visitLog.userId)) as any;
                        reporterName = user?.name || "Unknown";
                        reporterRole = user?.role || "Officer";
                        locationContext = "Visit Scan";
                    }
                }

                return {
                    ...issue,
                    siteName: site?.name || "Unknown Site",
                    reporterName,
                    reporterRole,
                    locationContext,
                };
            })
        );
    },
});

export const listIssuesByOrg = query({
    args: {
        organizationId: v.optional(v.id("organizations")),
        siteId: v.optional(v.id("sites")),
        regionId: v.optional(v.string()),
        city: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        let issues;
        if (args.siteId) {
            issues = await ctx.db
                .query("issues")
                .withIndex("by_site", (q) => q.eq("siteId", args.siteId as any))
                .order("desc")
                .collect();
        } else if (args.organizationId) {
            issues = await ctx.db
                .query("issues")
                .withIndex("by_org", (q) => q.eq("organizationId", args.organizationId as any))
                .order("desc")
                .collect();
        } else {
            issues = await ctx.db.query("issues").order("desc").collect();
        }

        if (!args.siteId && (args.regionId || args.city)) {
             const sites = await (args.organizationId 
                ? ctx.db.query("sites").withIndex("by_org", (q) => q.eq("organizationId", args.organizationId as any))
                : ctx.db.query("sites")
            ).collect();
            
            const filteredSiteIds = new Set(
                sites.filter(s => {
                    let matchesRegion = !args.regionId || s.regionId === args.regionId;
                    let matchesCity = !args.city || s.city === args.city;
                    return matchesRegion && matchesCity;
                }).map(s => s._id)
            );
            
            issues = issues.filter(issue => filteredSiteIds.has(issue.siteId));
        }

        const enrichedIssues = await Promise.all(
            issues.map(async (issue) => {
                const site = await ctx.db.get(issue.siteId);
                let reporterName = "Unknown";
                let reporterRole = "Staff";
                let locationContext = "General Visit";

                // Find the log to get the user
                const patrolLog = await ctx.db.get(issue.logId as Id<"patrolLogs">);
                if (patrolLog && (patrolLog as any).userId) {
                    const user = (await ctx.db.get((patrolLog as any).userId)) as any;
                    reporterName = user?.name || "Unknown";
                    reporterRole = user?.role || "SG";

                    const point = (patrolLog as any).patrolPointId ? (await ctx.db.get((patrolLog as any).patrolPointId)) as any : null;
                    locationContext = point?.name || "Patrol Area";
                } else {
                    const visitLog = await ctx.db.get(issue.logId as Id<"visitLogs">);
                    if (visitLog) {
                        const user = (await ctx.db.get(visitLog.userId)) as any;
                        reporterName = user?.name || "Unknown";
                        reporterRole = user?.role || "Officer";
                        locationContext = "Visit Scan";
                    }
                }

                return {
                    ...issue,
                    siteName: site?.name || "Unknown Site",
                    reporterName,
                    reporterRole,
                    locationContext,
                };
            })
        );

        return enrichedIssues;
    },
});

export const resolveIssue = mutation({
    args: { issueId: v.id("issues") },
    handler: async (ctx, args) => {
        await ctx.db.patch(args.issueId, { status: "closed" });
    },
});
export const createDualLog = mutation({
    args: {
        userId: v.id("users"),
        siteId: v.id("sites"),
        patrolPointId: v.optional(v.id("patrolPoints")),
        qrCode: v.optional(v.string()),
        imageId: v.optional(v.string()),
        comment: v.string(),
        latitude: v.number(),
        longitude: v.number(),
        organizationId: v.id("organizations"),
        visitType: v.optional(v.string()),
        issueDetails: v.optional(v.object({
            title: v.string(),
            priority: v.union(v.literal("Low"), v.literal("Medium"), v.literal("High")),
        })),
    },
    handler: async (ctx, args) => {
        const { patrolPointId, qrCode, ...rest } = args;
        let finalPatrolPointId = patrolPointId;

        // 1. Try to find point if only QR was provided
        if (!finalPatrolPointId && qrCode) {
            const point = await ctx.db
                .query("patrolPoints")
                .withIndex("by_site", (q) => q.eq("siteId", args.siteId))
                .filter((q) => q.eq(q.field("qrCode"), qrCode))
                .first();
            if (point) finalPatrolPointId = point._id;
        }

        const site = await ctx.db.get(args.siteId);
        if (!site) throw new Error("Site not found");

        // 2. Calculate Distance for Patrol
        let distance = 0;
        if (finalPatrolPointId) {
            const point = await ctx.db.get(finalPatrolPointId);
            if (point && point.latitude && point.longitude) {
                distance = calculateDistance(
                    args.latitude,
                    args.longitude,
                    point.latitude,
                    point.longitude
                );
            }
        } else {
            // Fallback to site distance if no specific point
            distance = calculateDistance(
                args.latitude,
                args.longitude,
                site.latitude,
                site.longitude
            );
        }

        // 3. Insert Patrol Log
        const patrolLogId = await ctx.db.insert("patrolLogs", {
            ...rest,
            patrolPointId: finalPatrolPointId,
            distance,
            createdAt: Date.now(),
        });

        // 4. Insert Visit Log
        const visitLogId = await ctx.db.insert("visitLogs", {
            userId: args.userId,
            siteId: args.siteId,
            qrData: qrCode || "MANUAL_SCAN",
            imageId: args.imageId,
            remark: args.comment,
            latitude: args.latitude,
            longitude: args.longitude,
            organizationId: args.organizationId,
            visitType: args.visitType || "General",
            createdAt: Date.now(),
        });

        // 5. Handle Issues (Manual or Violation)
        if (args.issueDetails || distance > (site.allowedRadius || 100)) {
            const issueTitle = args.issueDetails?.title ||
                (distance > (site.allowedRadius || 100) ? "Geofence Violation" : "Patrol Issue");

            await ctx.db.insert("issues", {
                siteId: args.siteId,
                logId: patrolLogId, // Link to patrol log primarily
                title: issueTitle,
                description: args.comment || "Automatic geofence violation report",
                priority: args.issueDetails?.priority || (distance > (site.allowedRadius || 100) ? "High" : "Medium"),
                status: "open",
                timestamp: Date.now(),
                organizationId: args.organizationId,
            });
        }

        return { patrolLogId, visitLogId };
    },
});

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
    const R = 6371e3; // metres
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
        Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
}

export const countAll = query({
    handler: async (ctx) => {
        const logs = await ctx.db.query("logs").collect();
        return logs.length;
    },
});

export const countPatrolLogsByOrg = query({
    args: {
        organizationId: v.optional(v.id("organizations")),
        siteId: v.optional(v.id("sites")),
        regionId: v.optional(v.string()),
        city: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        let logs;
        if (args.siteId) {
            logs = await ctx.db
                .query("patrolLogs")
                .withIndex("by_org", (q) => q.eq("organizationId", args.organizationId as any))
                .filter((q) => q.eq(q.field("siteId"), args.siteId))
                .collect();
        } else if (args.regionId || args.city) {
            const sites = await (args.organizationId
                ? ctx.db.query("sites").withIndex("by_org", (q) => q.eq("organizationId", args.organizationId as any))
                : ctx.db.query("sites")
            ).collect();
            
            const filteredSiteIds = new Set(
                sites.filter(s => {
                    let matchesRegion = !args.regionId || s.regionId === args.regionId;
                    let matchesCity = !args.city || s.city === args.city;
                    return matchesRegion && matchesCity;
                }).map(s => s._id)
            );
            
            const allLogs = await (args.organizationId
                ? ctx.db.query("patrolLogs").withIndex("by_org", (q) => q.eq("organizationId", args.organizationId as any))
                : ctx.db.query("patrolLogs")
            ).collect();
            
            logs = allLogs.filter(log => filteredSiteIds.has(log.siteId as any));
        } else if (args.organizationId) {
            logs = await ctx.db
                .query("patrolLogs")
                .withIndex("by_org", (q) => q.eq("organizationId", args.organizationId as any))
                .collect();
        } else {
            logs = await ctx.db.query("patrolLogs").collect();
        }

        return logs.length;
    },
});

export const countIssuesByOrg = query({
    args: {
        organizationId: v.optional(v.id("organizations")),
        siteId: v.optional(v.id("sites")),
        regionId: v.optional(v.string()),
        city: v.optional(v.string()),
    },

    handler: async (ctx, args) => {
        let issues;
        if (args.siteId) {
            issues = await ctx.db
                .query("issues")
                .withIndex("by_org", (q) => q.eq("organizationId", args.organizationId as any))
                .filter((q) => q.eq(q.field("siteId"), args.siteId))
                .collect();
        } else if (args.regionId || args.city) {
            const sites = await (args.organizationId
                ? ctx.db.query("sites").withIndex("by_org", (q) => q.eq("organizationId", args.organizationId as any))
                : ctx.db.query("sites")
            ).collect();
            
            const filteredSiteIds = new Set(
                sites.filter(s => {
                    let matchesRegion = !args.regionId || s.regionId === args.regionId;
                    let matchesCity = !args.city || s.city === args.city;
                    return matchesRegion && matchesCity;
                }).map(s => s._id)
            );
            
            const allIssues = await (args.organizationId
                ? ctx.db.query("issues").withIndex("by_org", (q) => q.eq("organizationId", args.organizationId as any))
                : ctx.db.query("issues")
            ).collect();
            
            issues = allIssues.filter(issue => filteredSiteIds.has(issue.siteId as any));
        } else if (args.organizationId) {
            issues = await ctx.db
                .query("issues")
                .withIndex("by_org", (q) => q.eq("organizationId", args.organizationId as any))
                .collect();
        } else {
            issues = await ctx.db.query("issues").collect();
        }

        return issues.length;
    },
});

export const countAllIssues = query({
    handler: async (ctx) => {
        const issues = await ctx.db.query("issues").collect();
        return issues.length;
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
        let logs = await ctx.db
            .query("logs")
            .withIndex("by_org", (q) => q.eq("organizationId", args.organizationId))
            .collect();

        if (args.siteId) {
            logs = logs.filter((log) => log.siteId === args.siteId);
        } else if (args.regionId || args.city) {
            const sites = await ctx.db
                .query("sites")
                .withIndex("by_org", (q) => q.eq("organizationId", args.organizationId as any))
                .collect();
            
            const filteredSiteIds = new Set(
                sites.filter(s => {
                    let matchesRegion = !args.regionId || s.regionId === args.regionId;
                    let matchesCity = !args.city || s.city === args.city;
                    return matchesRegion && matchesCity;
                }).map(s => s._id)
            );
            
            logs = logs.filter(log => filteredSiteIds.has(log.siteId as any));
        }

        return logs.length;
    },
});
export const getLogsByUser = query({
    args: { userId: v.id("users") },
    handler: async (ctx, args) => {
        const patrolLogs = await ctx.db
            .query("patrolLogs")
            .withIndex("by_user", (q) => q.eq("userId", args.userId))
            .order("desc")
            .collect();

        const visitLogs = await ctx.db
            .query("visitLogs")
            .filter((q) => q.eq(q.field("userId"), args.userId))
            .order("desc")
            .collect();

        return { patrolLogs, visitLogs };
    },
});

export const listPatrolLogsByUser = query({
    args: { userId: v.id("users") },
    handler: async (ctx, args) => {
        const logs = await ctx.db
            .query("patrolLogs")
            .withIndex("by_user", (q) => q.eq("userId", args.userId))
            .order("desc")
            .collect();

        return await Promise.all(
            logs.map(async (log) => {
                const site = await ctx.db.get(log.siteId);
                const point = log.patrolPointId ? await ctx.db.get(log.patrolPointId) : null;
                return {
                    ...log,
                    siteName: site?.name || "Unknown",
                    pointName: point?.name || "General Area",
                };
            })
        );
    },
});

export const listVisitLogsByUser = query({
    args: { userId: v.id("users") },
    handler: async (ctx, args) => {
        const logs = await ctx.db
            .query("visitLogs")
            .filter((q) => q.eq(q.field("userId"), args.userId))
            .order("desc")
            .collect();

        return await Promise.all(
            logs.map(async (log) => {
                const site = await ctx.db.get(log.siteId);
                return {
                    ...log,
                    siteName: site?.name || "Unknown",
                };
            })
        );
    },
});

export const getDailyOfficerCoverage = query({
    args: { organizationId: v.optional(v.id("organizations")) },
    handler: async (ctx, args) => {
        const startOfDay = new Date().setHours(0, 0, 0, 0);

        const logsQuery = ctx.db.query("visitLogs");
        const logs = await (args.organizationId
            ? logsQuery.withIndex("by_org", (q) => q.eq("organizationId", args.organizationId as any))
            : logsQuery
        ).filter((q) => q.gte(q.field("createdAt"), startOfDay))
        .collect();

        const userGroups = new Map<string, Set<string>>();
        logs.forEach(log => {
            if (!userGroups.has(log.userId)) {
                userGroups.set(log.userId, new Set());
            }
            userGroups.get(log.userId)!.add(log.siteId);
        });

        const results = await Promise.all(
            Array.from(userGroups.entries()).map(async ([userId, siteIds]) => {
                const user = await ctx.db.get(userId as Id<"users">);
                const visitedSites = await Promise.all(
                    Array.from(siteIds).map(async (sId) => {
                        const site = await ctx.db.get(sId as Id<"sites">);
                        return site?.name || "Unknown Site";
                    })
                );
                return {
                    userId,
                    userName: user?.name || "Unknown User",
                    userRole: user?.role || "Officer",
                    siteCount: siteIds.size,
                    sites: visitedSites,
                    lastVisit: Math.max(...logs.filter(l => l.userId === userId).map(l => l.createdAt)),
                };
            })
        );

        return results.sort((a, b) => b.lastVisit - a.lastVisit);
    },
});

export const validatePatrolPoint = mutation({
    args: {
        pointId: v.id("patrolPoints"),
        latitude: v.number(),
        longitude: v.number(),
        qrCode: v.string(),
    },
    handler: async (ctx, args) => {
        const point = await ctx.db.get(args.pointId);
        if (!point) return { success: false, error: "Point not found" };

        if (point.qrCode !== args.qrCode) {
            return { success: false, error: "QR Code mismatch" };
        }

        const site = await ctx.db.get(point.siteId);
        if (!site) return { success: false, error: "Site not found" };

        const allowedRadius = site.allowedRadius || 100;

        // Calculate distance logic here or just return coordinates for client
        return {
            success: true,
            point,
            allowedRadius
        };
    },
});
