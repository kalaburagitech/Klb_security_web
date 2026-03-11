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

        // Auto-create issue if geo-fence violation (> 100m)
        if (args.distance > 100) {
            await ctx.db.insert("issues", {
                siteId: args.siteId,
                logId: logId,
                title: "Geo-fence Violation",
                description: `Patrol logged ${args.distance.toFixed(1)}m away from point. Allowed radius is 100m.`,
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
    args: { organizationId: v.id("organizations"), siteId: v.optional(v.union(v.id("sites"), v.null())) },
    handler: async (ctx, args) => {
        let logs;
        if (args.siteId) {
            logs = await ctx.db
                .query("patrolLogs")
                .withIndex("by_site", (q) => q.eq("siteId", args.siteId as Id<"sites">))
                .order("desc")
                .collect();
        } else {
            logs = await ctx.db
                .query("patrolLogs")
                .withIndex("by_org", (q) => q.eq("organizationId", args.organizationId))
                .order("desc")
                .collect();
        }

        return await Promise.all(
            logs.map(async (log) => {
                const user = await ctx.db.get(log.userId);
                const site = await ctx.db.get(log.siteId);
                const point = log.patrolPointId ? await ctx.db.get(log.patrolPointId) : null;
                return {
                    ...log,
                    userName: user?.name || "Unknown",
                    userRole: user?.role || "SG",
                    siteName: site?.name || "Unknown",
                    pointName: point?.name || "General Area",
                };
            })
        );
    },
});

export const listLogsBySite = query({
    args: { siteId: v.id("sites") },
    handler: async (ctx, args) => {
        const logs = await ctx.db
            .query("patrolLogs")
            .withIndex("by_site", (q) => q.eq("siteId", args.siteId))
            .order("desc")
            .take(5);

        return await Promise.all(
            logs.map(async (log) => {
                const user = await ctx.db.get(log.userId);
                const point = log.patrolPointId ? await ctx.db.get(log.patrolPointId) : null;
                return {
                    ...log,
                    userName: user?.name || "Unknown",
                    pointName: point?.name || "General Area",
                };
            })
        );
    },
});

export const validatePatrolPoint = query({
    args: {
        siteId: v.id("sites"),
        qrCodeId: v.string(),
        userLat: v.optional(v.number()),
        userLon: v.optional(v.number()),
        guardId: v.optional(v.id("users"))
    },
    handler: async (ctx, args) => {
        const point = await ctx.db
            .query("patrolPoints")
            .withIndex("by_site", (q) => q.eq("siteId", args.siteId))
            .filter((q) => q.eq(q.field("qrCode"), args.qrCodeId))
            .unique();

        if (!point) return { valid: false, message: "Point not found or doesn't belong to this site." };

        // Check if already scanned in current session
        if (args.guardId) {
            const activeSession = await ctx.db
                .query("patrolSessions")
                .withIndex("by_guard", (q) => q.eq("guardId", args.guardId as any))
                .filter((q) => q.eq(q.field("status"), "active"))
                .unique();

            if (activeSession && activeSession.scannedPoints?.includes(point._id)) {
                return { valid: false, message: "This point has already been scanned during this patrol." };
            }
        }

        let distance = 0;
        if (args.userLat !== undefined && args.userLon !== undefined && point.latitude && point.longitude) {
            distance = calculateDistance(args.userLat, args.userLon, point.latitude, point.longitude);
        }

        return {
            valid: true,
            point,
            pointId: point._id,
            distance
        };
    },
});

export const updateSessionPoints = mutation({
    args: {
        sessionId: v.id("patrolSessions"),
        pointId: v.id("patrolPoints")
    },
    handler: async (ctx, args) => {
        const session = await ctx.db.get(args.sessionId);
        if (!session) throw new Error("Session not found");

        const scannedPoints = session.scannedPoints || [];
        if (!scannedPoints.includes(args.pointId)) {
            scannedPoints.push(args.pointId);
            await ctx.db.patch(args.sessionId, { scannedPoints });
        }
    }
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

export const listVisitLogs = query({
    args: { organizationId: v.id("organizations") },
    handler: async (ctx, args) => {
        const logs = await ctx.db
            .query("visitLogs")
            .withIndex("by_org", (q) => q.eq("organizationId", args.organizationId))
            .order("desc")
            .collect();

        return await Promise.all(
            logs.map(async (log) => {
                const user = await ctx.db.get(log.userId);
                const site = await ctx.db.get(log.siteId);

                // Lookup the point by qrCode to get the name
                const point = await ctx.db
                    .query("patrolPoints")
                    .withIndex("by_org", (q) => q.eq("organizationId", args.organizationId))
                    .filter((q) => q.eq(q.field("qrCode"), log.qrData))
                    .first();

                return {
                    ...log,
                    userName: user?.name || "Unknown",
                    userRole: user?.role || "Officer",
                    siteName: site?.name || "Unknown",
                    pointName: site ? `${site.name}_${point?.name || "General Scan"}` : (point?.name || "General Scan"),
                };
            })
        );
    },
});

export const listIssues = query({
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
        organizationId: v.id("organizations"),
        siteId: v.optional(v.id("sites"))
    },
    handler: async (ctx, args) => {
        let q;
        if (args.siteId) {
            q = ctx.db.query("issues").withIndex("by_site", (q) => q.eq("siteId", args.siteId as Id<"sites">));
        } else {
            q = ctx.db.query("issues").withIndex("by_org", (q) => q.eq("organizationId", args.organizationId));
        }
        
        const issues = await q.order("desc").collect();

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
        issueDetails: v.optional(v.object({
            title: v.string(),
            priority: v.union(v.literal("Low"), v.literal("Medium"), v.literal("High")),
        })),
    },
    handler: async (ctx, args) => {
        const { patrolPointId, qrCode, issueDetails, ...rest } = args;
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

        if (!finalPatrolPointId) throw new Error("Invalid Patrol Point or QR Code");

        // 2. Duplicate Scan Prevention (5-minute rule)
        const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
        const recentLog = await ctx.db
            .query("patrolLogs")
            .withIndex("by_site", (q) => q.eq("siteId", args.siteId))
            .filter((q) =>
                q.and(
                    q.eq(q.field("patrolPointId"), finalPatrolPointId),
                    q.gte(q.field("createdAt"), fiveMinutesAgo)
                )
            )
            .first();

        if (recentLog) {
            throw new Error("This point was already scanned within the last 5 minutes.");
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

export const countByOrg = query({
    args: { 
        organizationId: v.optional(v.id("organizations")),
        siteId: v.optional(v.id("sites"))
    },
    handler: async (ctx, args) => {
        const orgId = args.organizationId;
        const sId = args.siteId;

        if (sId) {
            const logs = await ctx.db
                .query("patrolLogs")
                .withIndex("by_site", (q) => q.eq("siteId", sId))
                .collect();
            return logs.length;
        }

        const q = orgId
            ? ctx.db.query("patrolLogs").withIndex("by_org", (q) => q.eq("organizationId", orgId))
            : ctx.db.query("patrolLogs");
        const logs = await q.collect();
        return logs.length;
    },
});

export const countIssuesByOrg = query({
    args: { 
        organizationId: v.optional(v.id("organizations")),
        siteId: v.optional(v.id("sites"))
    },
    handler: async (ctx, args) => {
        const orgId = args.organizationId;
        const sId = args.siteId;

        let q;
        if (sId) {
            q = ctx.db.query("issues").withIndex("by_site", (q) => q.eq("siteId", sId));
        } else if (orgId) {
            q = ctx.db.query("issues").withIndex("by_org", (q) => q.eq("organizationId", orgId));
        } else {
            q = ctx.db.query("issues");
        }

        const issues = await q.collect();
        return issues.filter(i => i.status === "open").length;
    },
});
