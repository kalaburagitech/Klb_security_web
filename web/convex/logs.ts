import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { pickPrimaryRoleForPermissions } from "./userAccess";

function userRoleLabel(user: { roles?: string[] } | null | undefined, fallback: string): string {
    if (!user?.roles?.length) return fallback;
    return pickPrimaryRoleForPermissions(user.roles);
}

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
        sessionId: v.optional(v.id("patrolSessions")),
        issueDetails: v.optional(v.object({
            title: v.string(),
            priority: v.union(v.literal("Low"), v.literal("Medium"), v.literal("High")),
        })),
        patrolSubjectEmpId: v.optional(v.string()),
        patrolSubjectName: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const { issueDetails, ...logData } = args;
        const logId = await ctx.db.insert("patrolLogs", {
            ...logData,
            createdAt: Date.now(),
        });

        if (args.sessionId && args.patrolPointId) {
            const session = await ctx.db.get(args.sessionId);
            if (session) {
                const prev = session.scannedPoints || [];
                if (!prev.some((pid) => pid === args.patrolPointId)) {
                    await ctx.db.patch(args.sessionId, {
                        scannedPoints: [...prev, args.patrolPointId],
                    });
                }
            }
        }

        let allowedM = 200;
        if (args.patrolPointId) {
            const pt = await ctx.db.get(args.patrolPointId);
            if (pt?.pointRadiusMeters != null) allowedM = pt.pointRadiusMeters;
        }

        // Auto-create issue if outside this point's radius (not site radius)
        if (args.distance > allowedM) {
            await ctx.db.insert("issues", {
                siteId: args.siteId,
                logId: logId,
                title: "Geo-fence Violation",
                description: `Patrol logged ${args.distance.toFixed(1)}m away from point (allowed ${allowedM}m).`,
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
            const siteQuery = ctx.db.query("sites");
            const sites = await (args.organizationId 
                ? siteQuery.withIndex("by_org", (q) => q.eq("organizationId", args.organizationId as any))
                : siteQuery
            ).collect();
            
            const filteredSites = sites.filter(s => {
                let matchesRegion = !args.regionId || s.regionId === args.regionId;
                let matchesCity = !args.city || s.city === args.city;
                return matchesRegion && matchesCity;
            });

            // Fetch logs for each site to avoid global collect() limit
            const logsPromises = filteredSites.map(site => 
                ctx.db.query("patrolLogs")
                    .withIndex("by_site", q => q.eq("siteId", site._id))
                    .order("desc")
                    .take(100) // Limit per site for performance
            );
            
            const logsResults = await Promise.all(logsPromises);
            logs = logsResults.flat().sort((a, b) => b.createdAt - a.createdAt);
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
                    userRole: userRoleLabel(user, "SO"),
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
                    userRole: userRoleLabel(user, "SO"),
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
        imageIds: v.optional(v.array(v.string())),
        checkInAccuracyM: v.optional(v.number()),
        distanceFromSiteM: v.optional(v.number()),
        issueDetails: v.optional(v.object({
            title: v.string(),
            priority: v.union(v.literal("Low"), v.literal("Medium"), v.literal("High")),
        })),
    },
    handler: async (ctx, args) => {
        const { issueDetails, imageIds, ...logData } = args;
        const ids = imageIds?.length
            ? imageIds
            : args.imageId
              ? [args.imageId]
              : [];
        const primaryImage = ids[0] ?? args.imageId;
        const logId = await ctx.db.insert("visitLogs", {
            ...logData,
            imageId: primaryImage,
            imageIds: ids.length ? ids : undefined,
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

export const visitCheckOut = mutation({
    args: {
        logId: v.id("visitLogs"),
        userId: v.id("users"),
        latitude: v.number(),
        longitude: v.number(),
        accuracyM: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const log = await ctx.db.get(args.logId);
        if (!log) throw new Error("Visit log not found");
        if (log.userId !== args.userId) throw new Error("Not allowed to check out this visit");
        if (log.checkOutAt != null) throw new Error("Already checked out");
        const patch: Record<string, unknown> = {
            checkOutAt: Date.now(),
            checkOutLatitude: args.latitude,
            checkOutLongitude: args.longitude,
        };
        if (args.accuracyM != null && Number.isFinite(args.accuracyM)) {
            patch.checkOutAccuracyM = args.accuracyM;
        }
        await ctx.db.patch(args.logId, patch as any);
    },
});

async function visitLogImageUrls(ctx: { storage: { getUrl: (id: any) => Promise<string | null> } }, log: {
    imageId?: string;
    imageIds?: string[];
}): Promise<string[]> {
    const ids: string[] = [];
    if (log.imageIds?.length) {
        for (const id of log.imageIds) {
            if (id && !ids.includes(id)) ids.push(id);
        }
    }
    if (log.imageId && !ids.includes(log.imageId)) ids.push(log.imageId);
    const urls: string[] = [];
    for (const id of ids) {
        try {
            const u = await ctx.storage.getUrl(id as any);
            if (u) urls.push(u);
        } catch {
            /* skip */
        }
    }
    return urls;
}

export const countVisitLogsByType = query({
    args: {
        organizationId: v.optional(v.id("organizations")),
        siteId: v.optional(v.id("sites")),
        regionId: v.optional(v.string()),
        city: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        let logs: any[] = [];
        if (args.siteId) {
            const sId = args.siteId as any;
            logs = await ctx.db.query("visitLogs").withIndex("by_site", q => q.eq("siteId", sId)).collect();
        } else if (args.regionId || args.city) {
            const sites = await (args.organizationId
                ? ctx.db.query("sites").withIndex("by_org", (q) => q.eq("organizationId", args.organizationId as any))
                : ctx.db.query("sites")
            ).collect();
            
            const filteredSites = sites.filter(s => {
                let matchesRegion = !args.regionId || s.regionId === args.regionId;
                let matchesCity = !args.city || s.city === args.city;
                return matchesRegion && matchesCity;
            });
            
            const logsPromises = filteredSites.map(site => 
                ctx.db.query("visitLogs").withIndex("by_site", q => q.eq("siteId", site._id)).collect()
            );
            const logsResults = await Promise.all(logsPromises);
            logs = logsResults.flat();
        } else if (args.organizationId) {
            logs = await ctx.db
                .query("visitLogs")
                .withIndex("by_org", (q) => q.eq("organizationId", args.organizationId as any))
                .collect();
        } else {
            logs = await ctx.db.query("visitLogs").collect();
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
        } else if (args.regionId || args.city) {
            const siteQuery = ctx.db.query("sites");
            const sites = await (args.organizationId 
                ? siteQuery.withIndex("by_org", (q) => q.eq("organizationId", args.organizationId as any))
                : siteQuery
            ).collect();
            
            const filteredSites = sites.filter(s => {
                let matchesRegion = !args.regionId || s.regionId === args.regionId;
                let matchesCity = !args.city || s.city === args.city;
                return matchesRegion && matchesCity;
            });

            // Fetch logs for each site
            const logsPromises = filteredSites.map(site => 
                ctx.db.query("visitLogs")
                    .withIndex("by_site", q => q.eq("siteId", site._id))
                    .order("desc")
                    .take(100)
            );
            
            const logsResults = await Promise.all(logsPromises);
            logs = logsResults.flat().sort((a, b) => b.createdAt - a.createdAt);
        } else if (args.organizationId) {
            logs = await ctx.db
                .query("visitLogs")
                .withIndex("by_org", (q) => q.eq("organizationId", args.organizationId as any))
                .order("desc")
                .collect();
        } else {
            logs = await ctx.db.query("visitLogs").order("desc").collect();
        }

        return await Promise.all(
            logs.map(async (log) => {
                const user = await ctx.db.get(log.userId);
                const site = await ctx.db.get(log.siteId);

                // Lookup the point by qrCode to get the name
                const pointQuery = ctx.db.query("patrolPoints");
                const point = await (args.organizationId || log.organizationId
                    ? pointQuery.withIndex("by_org", (q) => q.eq("organizationId", (args.organizationId || log.organizationId) as any))
                    : pointQuery
                ).filter((q) => q.eq(q.field("qrCode"), log.qrData)).first();

                const imageUrls = await visitLogImageUrls(ctx, log);
                const imageUrl = imageUrls[0] ?? null;

                return {
                    ...log,
                    userName: user?.name || "Unknown",
                    userRole: userRoleLabel(user, "SO"),
                    siteName: site?.name || "Unknown",
                    pointName: site ? `${site.name}_${point?.name || "General Scan"}` : (point?.name || "General Scan"),
                    imageUrl,
                    imageUrls,
                };
            })
        );
    },
});

async function filterVisitLogsForRegionSites(
    ctx: any,
    organizationId: Id<"organizations">,
    regionId: string,
    city: string | undefined,
    siteId: Id<"sites"> | undefined,
    fromMs: number,
    toMs: number
) {
    const sites = await ctx.db
        .query("sites")
        .withIndex("by_org", (q: any) => q.eq("organizationId", organizationId))
        .collect();
    const rNorm = regionId.toLowerCase().trim();
    const siteIdsFiltered = sites
        .filter(
            (s: any) =>
                String(s.regionId || "")
                    .toLowerCase()
                    .trim() === rNorm &&
                (!city || s.city === city) &&
                (!siteId || s._id === siteId)
        )
        .map((s: any) => s._id.toString());
    const siteSet = new Set(siteIdsFiltered);

    const logs = await ctx.db
        .query("visitLogs")
        .withIndex("by_org_created", (q: any) =>
            q.eq("organizationId", organizationId).gte("createdAt", fromMs)
        )
        .filter((q: any) => q.lte(q.field("createdAt"), toMs))
        .collect();

    return logs.filter((l: any) => siteSet.has(l.siteId.toString()));
}

export const listVisitLogsPage = query({
    args: {
        organizationId: v.id("organizations"),
        regionId: v.string(),
        fromMs: v.number(),
        toMs: v.number(),
        city: v.optional(v.string()),
        siteId: v.optional(v.id("sites")),
        offset: v.number(),
        limit: v.number(),
    },
    handler: async (ctx, args) => {
        const lim = Math.min(Math.max(args.limit, 1), 100);
        const off = Math.max(args.offset, 0);

        const filtered = await filterVisitLogsForRegionSites(
            ctx,
            args.organizationId,
            args.regionId,
            args.city,
            args.siteId,
            args.fromMs,
            args.toMs
        );
        filtered.sort((a: Doc<"visitLogs">, b: Doc<"visitLogs">) => b.createdAt - a.createdAt);
        const total = filtered.length;
        const slice = filtered.slice(off, off + lim);

        const items = await Promise.all(
            slice.map(async (log: any) => {
                const user = (await ctx.db.get(log.userId)) as Doc<"users"> | null;
                const site = (await ctx.db.get(log.siteId)) as Doc<"sites"> | null;
                const imageUrls = await visitLogImageUrls(ctx, log);
                return {
                    ...log,
                    userName: user?.name ?? "Unknown",
                    siteName: site?.name ?? "Unknown",
                    imageUrls,
                    imageUrl: imageUrls[0] ?? null,
                };
            })
        );

        return {
            items,
            total,
            offset: off,
            limit: lim,
            hasMore: off + lim < total,
        };
    },
});

export const listVisitLogsExport = query({
    args: {
        organizationId: v.id("organizations"),
        regionId: v.string(),
        fromMs: v.number(),
        toMs: v.number(),
        city: v.optional(v.string()),
        siteId: v.optional(v.id("sites")),
        maxRows: v.number(),
    },
    handler: async (ctx, args) => {
        const max = Math.min(Math.max(args.maxRows, 1), 2500);
        const filtered = await filterVisitLogsForRegionSites(
            ctx,
            args.organizationId,
            args.regionId,
            args.city,
            args.siteId,
            args.fromMs,
            args.toMs
        );
        filtered.sort((a: Doc<"visitLogs">, b: Doc<"visitLogs">) => b.createdAt - a.createdAt);
        const truncated = filtered.length > max;
        const slice = filtered.slice(0, max);

        const items = await Promise.all(
            slice.map(async (log: any) => {
                const user = (await ctx.db.get(log.userId)) as Doc<"users"> | null;
                const site = (await ctx.db.get(log.siteId)) as Doc<"sites"> | null;
                const imageUrls = await visitLogImageUrls(ctx, log);
                return {
                    ...log,
                    userName: user?.name ?? "Unknown",
                    siteName: site?.name ?? "Unknown",
                    imageUrls,
                    imageUrl: imageUrls[0] ?? null,
                };
            })
        );

        return { items, truncated, totalMatching: filtered.length };
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
                const pointQuery = ctx.db.query("patrolPoints");
                const point = await (log.organizationId
                    ? pointQuery.withIndex("by_org", (q) => q.eq("organizationId", log.organizationId as any))
                    : pointQuery
                ).filter((q) => q.eq(q.field("qrCode"), log.qrData)).first();

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
                    userRole: userRoleLabel(user, "SO"),
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

                // SAFE LOG LOOKUP: Try patrolLogs first, then visitLogs
                let logData: any = null;
                const pLog = await ctx.db
                    .query("patrolLogs")
                    .filter((q) => q.eq(q.field("_id"), issue.logId as any))
                    .first();
                
                if (pLog) {
                    logData = pLog;
                    locationContext = (pLog.patrolPointId ? (await ctx.db.get(pLog.patrolPointId))?.name : null) || "Patrol Area";
                } else {
                    const vLog = await ctx.db
                        .query("visitLogs")
                        .filter((q) => q.eq(q.field("_id"), issue.logId as any))
                        .first();
                    if (vLog) {
                        logData = vLog;
                        locationContext = "Visit Scan";
                    }
                }

                if (logData) {
                    const reporterDoc = await ctx.db.get(logData.userId as Id<"users">);
                    reporterName = reporterDoc?.name || "Unknown";
                    reporterRole = userRoleLabel(reporterDoc, "SO");
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
             const siteQuery = ctx.db.query("sites");
             const sites = await (args.organizationId 
                ? siteQuery.withIndex("by_org", (q) => q.eq("organizationId", args.organizationId as any))
                : siteQuery
            ).collect();
            
            const filteredSites = sites.filter(s => {
                let matchesRegion = !args.regionId || s.regionId === args.regionId;
                let matchesCity = !args.city || s.city === args.city;
                return matchesRegion && matchesCity;
            });

            const issuePromises = filteredSites.map(site => 
                ctx.db.query("issues")
                    .withIndex("by_site", q => q.eq("siteId", site._id))
                    .order("desc")
                    .collect()
            );
            
            const issueResults = await Promise.all(issuePromises);
            issues = issueResults.flat().sort((a, b) => b.timestamp - a.timestamp);
        }

        const enrichedIssues = await Promise.all(
            issues.map(async (issue) => {
                const site = await ctx.db.get(issue.siteId);
                let reporterName = "Unknown";
                let reporterRole = "Staff";
                let locationContext = "General Visit";

                // SAFE LOG LOOKUP: Try patrolLogs first, then visitLogs
                let logData: any = null;
                const pLog = await ctx.db
                    .query("patrolLogs")
                    .filter((q) => q.eq(q.field("_id"), issue.logId as any))
                    .first();
                
                if (pLog) {
                    logData = pLog;
                    locationContext = (pLog.patrolPointId ? (await ctx.db.get(pLog.patrolPointId))?.name : null) || "Patrol Area";
                } else {
                    const vLog = await ctx.db
                        .query("visitLogs")
                        .filter((q) => q.eq(q.field("_id"), issue.logId as any))
                        .first();
                    if (vLog) {
                        logData = vLog;
                        locationContext = "Visit Scan";
                    }
                }

                if (logData) {
                    const reporterDoc = await ctx.db.get(logData.userId as Id<"users">);
                    reporterName = reporterDoc?.name || "Unknown";
                    reporterRole = userRoleLabel(reporterDoc, "SO");
                }

                // Fetch attendance for the reporter on that day
                let reporterAttendance = "N/A";
                const userIdForAttendance = logData?.userId;

                if (userIdForAttendance) {
                    const user = await ctx.db.get(userIdForAttendance) as any;
                    if (user?.empId) {
                        const dateStr = new Date(issue.timestamp).toISOString().split('T')[0];
                        const attendance = await ctx.db
                            .query("attendanceRecords")
                            .withIndex("by_empId_date", (q) => q.eq("empId", user.empId).eq("date", dateStr))
                            .first();
                        if (attendance) {
                            reporterAttendance = attendance.status === "present" ? "Clocked In" : "Absent";
                        }
                    }
                }

                return {
                    ...issue,
                    siteName: site?.name || "Unknown Site",
                    reporterName,
                    reporterRole,
                    locationContext,
                    reporterAttendance,
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
        const { patrolPointId, qrCode, visitType, issueDetails, ...rest } = args;
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
        let logsCount = 0;
        if (args.siteId) {
            const query = ctx.db.query("patrolLogs");
            const logs = await (args.organizationId
                ? query.withIndex("by_org", (q) => q.eq("organizationId", args.organizationId as any))
                : query
            ).filter((q) => q.eq(q.field("siteId"), args.siteId)).collect();
            logsCount = logs.length;
        } else if (args.regionId || args.city) {
            const sites = await (args.organizationId
                ? ctx.db.query("sites").withIndex("by_org", (q) => q.eq("organizationId", args.organizationId as any))
                : ctx.db.query("sites")
            ).collect();
            
            const filteredSites = sites.filter(s => {
                let matchesRegion = !args.regionId || s.regionId === args.regionId;
                let matchesCity = !args.city || s.city === args.city;
                return matchesRegion && matchesCity;
            });
            
            const logsPromises = filteredSites.map(site => 
                ctx.db.query("patrolLogs").withIndex("by_site", q => q.eq("siteId", site._id)).collect()
            );
            const logsResults = await Promise.all(logsPromises);
            logsCount = logsResults.flat().length;
        } else if (args.organizationId) {
            const logs = await ctx.db
                .query("patrolLogs")
                .withIndex("by_org", (q) => q.eq("organizationId", args.organizationId as any))
                .collect();
            logsCount = logs.length;
        } else {
            const logs = await ctx.db.query("patrolLogs").collect();
            logsCount = logs.length;
        }

        return logsCount;
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
            const query = ctx.db.query("issues");
            issues = await (args.organizationId
                ? query.withIndex("by_org", (q) => q.eq("organizationId", args.organizationId as any))
                : query
            ).filter((q) => q.eq(q.field("siteId"), args.siteId)).collect();
        } else if (args.regionId || args.city) {
            const siteQuery = ctx.db.query("sites");
            const sites = await (args.organizationId
                ? siteQuery.withIndex("by_org", (q) => q.eq("organizationId", args.organizationId as any))
                : siteQuery
            ).collect();
            
            const filteredSites = sites.filter(s => {
                let matchesRegion = !args.regionId || s.regionId === args.regionId;
                let matchesCity = !args.city || s.city === args.city;
                return matchesRegion && matchesCity;
            });

            // Fetch issues for each site
            const issuePromises = filteredSites.map(site => 
                ctx.db.query("issues")
                    .withIndex("by_site", q => q.eq("siteId", site._id))
                    .collect()
            );
            
            const issueResults = await Promise.all(issuePromises);
            issues = issueResults.flat();
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
        organizationId: v.optional(v.id("organizations")),
        siteId: v.optional(v.id("sites")),
        regionId: v.optional(v.string()),
        city: v.optional(v.string()),
    },

    handler: async (ctx, args) => {
        let logs;
        if (args.organizationId) {
            logs = await ctx.db
                .query("logs")
                .withIndex("by_org", (q) => q.eq("organizationId", args.organizationId as any))
                .collect();
        } else {
            logs = await ctx.db.query("logs").collect();
        }

        if (args.siteId) {
            logs = logs.filter((log) => log.siteId === args.siteId);
        } else if (!args.siteId && (args.regionId || args.city)) {
            const siteQuery = ctx.db.query("sites");
            const sites = await (args.organizationId
                ? siteQuery.withIndex("by_org", (q) => q.eq("organizationId", args.organizationId as any))
                : siteQuery
            ).collect();
            
            const filteredSites = sites.filter(s => {
                let matchesRegion = !args.regionId || s.regionId === args.regionId;
                let matchesCity = !args.city || s.city === args.city;
                return matchesRegion && matchesCity;
            });

            const logsPromises = filteredSites.map(site => 
                ctx.db.query("visitLogs")
                    .withIndex("by_site", q => q.eq("siteId", site._id))
                    .collect()
            );
            
            const logsResults = await Promise.all(logsPromises);
            logs = logsResults.flat();
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
    args: {
        userId: v.id("users"),
        since: v.optional(v.number()),
        limit: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const since = args.since ?? 0;
        const lim = Math.min(Math.max(args.limit ?? 120, 1), 400);
        const logs = await ctx.db
            .query("visitLogs")
            .withIndex("by_user_created", (q) =>
                q.eq("userId", args.userId).gte("createdAt", since)
            )
            .order("desc")
            .take(lim);

        return await Promise.all(
            logs.map(async (log) => {
                const site = await ctx.db.get(log.siteId);
                const imageUrls = await visitLogImageUrls(ctx, log);
                return {
                    ...log,
                    siteName: site?.name || "Unknown",
                    imageUrls,
                    imageUrl: imageUrls[0] ?? null,
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
                    userRole: userRoleLabel(user, "SO"),
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
        siteId: v.id("sites"),
        qrCode: v.string(),
        latitude: v.number(),
        longitude: v.number(),
    },
    handler: async (ctx, args) => {
        const site = await ctx.db.get(args.siteId);
        if (!site) {
            return {
                success: false,
                valid: false,
                error: "Site not found",
                distance: 0,
                allowedRadius: 100,
                isWithinRange: false,
            };
        }

        const points = await ctx.db
            .query("patrolPoints")
            .withIndex("by_site", (q) => q.eq("siteId", args.siteId))
            .collect();
        let point = points.find((p) => p.qrCode === args.qrCode);

        if (!point) {
            const orgPoint = await ctx.db
                .query("patrolPoints")
                .withIndex("by_org_qr", (q) =>
                    q
                        .eq("organizationId", site.organizationId)
                        .eq("qrCode", args.qrCode)
                )
                .first();
            if (orgPoint && orgPoint.siteId !== args.siteId) {
                const otherSite = await ctx.db.get(orgPoint.siteId);
                return {
                    success: false,
                    valid: false,
                    errorCode: "wrong_site" as const,
                    error: "This QR belongs to a different site than your active patrol.",
                    pointName: orgPoint.name,
                    wrongSiteName: otherSite?.name ?? "Another site",
                    distance: 0,
                    allowedRadius: 200,
                    isWithinRange: false,
                };
            }
            return {
                success: false,
                valid: false,
                error: "QR code does not match any patrol point for this site",
                distance: 0,
                allowedRadius: 200,
                isWithinRange: false,
            };
        }

        const allowedRadius =
            point.pointRadiusMeters != null && Number.isFinite(point.pointRadiusMeters)
                ? point.pointRadiusMeters
                : 200;

        const usePointCoords =
            point.latitude != null &&
            point.longitude != null &&
            Number.isFinite(point.latitude) &&
            Number.isFinite(point.longitude);
        const refLat = usePointCoords ? point.latitude! : site.latitude;
        const refLon = usePointCoords ? point.longitude! : site.longitude;
        if (
            refLat == null ||
            refLon == null ||
            !Number.isFinite(refLat) ||
            !Number.isFinite(refLon)
        ) {
            return {
                success: false,
                valid: false,
                errorCode: "no_coordinates" as const,
                error:
                    "This checkpoint has no GPS coordinates. Ask an admin to set coordinates on the patrol point or site.",
                distance: 0,
                allowedRadius,
                isWithinRange: false,
            };
        }

        const distance = calculateDistance(args.latitude, args.longitude, refLat, refLon);

        const isWithinRange = distance <= allowedRadius;

        return {
            success: true,
            valid: true,
            pointId: point._id,
            pointName: point.name,
            distance,
            allowedRadius,
            isWithinRange,
        };
    },
});
