import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";

export const startSession = mutation({
    args: {
        guardId: v.id("users"),
        siteId: v.id("sites"),
        organizationId: v.id("organizations"),
    },
    handler: async (ctx, args) => {
        return await ctx.db.insert("patrolSessions", {
            guardId: args.guardId,
            siteId: args.siteId,
            organizationId: args.organizationId,
            status: "active",
            startTime: Date.now(),
            scannedPoints: [],
        });
    },
});

export const endSession = mutation({
    args: { sessionId: v.id("patrolSessions") },
    handler: async (ctx, args) => {
        const s = await ctx.db.get(args.sessionId);
        if (!s) throw new Error("Session not found");
        const logs = await ctx.db
            .query("patrolLogs")
            .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
            .collect();
        if (logs.length === 0) {
            await ctx.db.delete(args.sessionId);
            return { discarded: true as const };
        }
        await ctx.db.patch(args.sessionId, {
            status: "completed",
            endTime: Date.now(),
        });
        return { discarded: false as const };
    },
});

export const appendScannedPoint = mutation({
    args: {
        sessionId: v.id("patrolSessions"),
        pointId: v.id("patrolPoints"),
    },
    handler: async (ctx, args) => {
        const s = await ctx.db.get(args.sessionId);
        if (!s) throw new Error("Session not found");
        const prev = s.scannedPoints || [];
        if (prev.some((id) => id === args.pointId)) return;
        await ctx.db.patch(args.sessionId, {
            scannedPoints: [...prev, args.pointId],
        });
    },
});

export const listForSiteSince = query({
    args: {
        siteId: v.id("sites"),
        since: v.number(),
    },
    handler: async (ctx, args) => {
        const sessions = await ctx.db
            .query("patrolSessions")
            .withIndex("by_site", (q) => q.eq("siteId", args.siteId))
            .collect();
        const filtered = sessions.filter(
            (s) => s.startTime >= args.since && s.status === "completed"
        );
        filtered.sort((a, b) => b.startTime - a.startTime);

        return Promise.all(
            filtered.map(async (s) => {
                const user = await ctx.db.get(s.guardId);
                const logs = (
                    await ctx.db
                        .query("patrolLogs")
                        .withIndex("by_session", (q) => q.eq("sessionId", s._id))
                        .collect()
                ).sort((a, b) => a.createdAt - b.createdAt);

                const pointNames: string[] = [];
                for (const log of logs) {
                    if (log.patrolPointId) {
                        const p = await ctx.db.get(log.patrolPointId);
                        if (p) pointNames.push(p.name);
                    }
                }

                const endT = s.endTime ?? s.startTime;
                const durationMs = endT - s.startTime;
                const totalDistanceM = logs.reduce((acc, l) => acc + l.distance, 0);

                if (logs.length === 0) return null;

                return {
                    sessionId: s._id,
                    guardId: s.guardId,
                    guardName: user?.name ?? "Unknown",
                    guardEmpId: user?.id ?? user?.mobileNumber ?? "",
                    startTime: s.startTime,
                    endTime: s.endTime,
                    status: s.status,
                    scanCount: logs.length,
                    pointTrail: pointNames.join(" → "),
                    durationMs,
                    totalDistanceM: Math.round(totalDistanceM * 10) / 10,
                };
            })
        ).then((rows) => rows.filter((r): r is NonNullable<typeof r> => r != null));
    },
});

/** Last patrol stats per enrolled subject (empId) at this site — for officer picker UI. */
export const summariesBySubjectEmpIdAtSite = query({
    args: { siteId: v.id("sites") },
    handler: async (ctx, args) => {
        const logs = await ctx.db
            .query("patrolLogs")
            .withIndex("by_site", (q) => q.eq("siteId", args.siteId))
            .collect();
        const withSubj = logs.filter((l) => l.patrolSubjectEmpId && l.sessionId);
        const byEmpSession = new Map<string, Map<string, typeof logs>>();
        for (const l of withSubj) {
            const e = l.patrolSubjectEmpId!;
            const sid = l.sessionId!;
            if (!byEmpSession.has(e)) byEmpSession.set(e, new Map());
            const inner = byEmpSession.get(e)!;
            if (!inner.has(sid)) inner.set(sid, []);
            inner.get(sid)!.push(l);
        }
        const out: Record<
            string,
            { durationMs: number; scanCount: number; endedAt: number }
        > = {};
        for (const [empId, sessMap] of byEmpSession) {
            let bestEnd = 0;
            let bestLogs: typeof logs = [];
            let bestSessId: string | null = null;
            for (const [sid, arr] of sessMap) {
                const sess = await ctx.db.get(sid as Id<"patrolSessions">);
                const end = sess?.endTime ?? Math.max(...arr.map((x) => x.createdAt));
                if (end >= bestEnd) {
                    bestEnd = end;
                    bestLogs = arr;
                    bestSessId = sid;
                }
            }
            if (bestSessId && bestLogs.length > 0) {
                const sess = await ctx.db.get(bestSessId as Id<"patrolSessions">);
                const start =
                    sess?.startTime ?? Math.min(...bestLogs.map((x) => x.createdAt));
                out[empId] = {
                    durationMs: Math.max(0, (sess?.endTime ?? bestEnd) - start),
                    scanCount: bestLogs.length,
                    endedAt: sess?.endTime ?? bestEnd,
                };
            }
        }
        return out;
    },
});

export const listCompletedSessionsForOrgSince = query({
    args: {
        organizationId: v.id("organizations"),
        since: v.number(),
    },
    handler: async (ctx, args) => {
        const sessions = await ctx.db
            .query("patrolSessions")
            .withIndex("by_org", (q) => q.eq("organizationId", args.organizationId))
            .collect();
        const relevant = sessions.filter(
            (s) =>
                s.startTime >= args.since &&
                s.status === "completed" &&
                s.endTime != null
        );
        relevant.sort((a, b) => (b.endTime ?? 0) - (a.endTime ?? 0));

        const rows = await Promise.all(
            relevant.map(async (s) => {
                const logs = await ctx.db
                    .query("patrolLogs")
                    .withIndex("by_session", (q) => q.eq("sessionId", s._id))
                    .collect();
                if (logs.length === 0) return null;
                const user = await ctx.db.get(s.guardId);
                const site = await ctx.db.get(s.siteId);
                const pointNames: string[] = [];
                for (const log of logs.sort((a, b) => a.createdAt - b.createdAt)) {
                    if (log.patrolPointId) {
                        const p = await ctx.db.get(log.patrolPointId);
                        if (p) pointNames.push(p.name);
                    }
                }
                const durationMs = (s.endTime ?? s.startTime) - s.startTime;
                const totalDistanceM = logs.reduce((acc, l) => acc + l.distance, 0);
                return {
                    sessionId: s._id,
                    siteId: s.siteId,
                    siteName: site?.name ?? "Site",
                    guardName: user?.name ?? "Unknown",
                    guardEmpId: user?.id ?? user?.mobileNumber ?? "",
                    startTime: s.startTime,
                    endTime: s.endTime,
                    scanCount: logs.length,
                    pointTrail: pointNames.join(" → "),
                    durationMs,
                    totalDistanceM: Math.round(totalDistanceM * 10) / 10,
                };
            })
        );
        return rows.filter((r): r is NonNullable<typeof r> => r != null);
    },
});

/** Paginated patrol rounds: completed sessions with ≥1 log, endTime in [fromMs, toMs]. */
export const listPatrolRoundsPage = query({
    args: {
        organizationId: v.id("organizations"),
        fromMs: v.number(),
        toMs: v.number(),
        siteIds: v.optional(v.array(v.id("sites"))),
        offset: v.number(),
        limit: v.number(),
    },
    handler: async (ctx, args) => {
        const lim = Math.min(Math.max(args.limit, 1), 100);
        const off = Math.max(args.offset, 0);

        let sessions = await ctx.db
            .query("patrolSessions")
            .withIndex("by_org_end", (q) =>
                q
                    .eq("organizationId", args.organizationId)
                    .gte("endTime", args.fromMs)
                    .lte("endTime", args.toMs)
            )
            .filter((q) => q.eq(q.field("status"), "completed"))
            .collect();

        if (args.siteIds && args.siteIds.length > 0) {
            const set = new Set(args.siteIds.map((id) => id.toString()));
            sessions = sessions.filter((s) => set.has(s.siteId.toString()));
        }

        sessions.sort((a, b) => (b.endTime ?? 0) - (a.endTime ?? 0));
        const total = sessions.length;
        const slice = sessions.slice(off, off + lim);

        const rows = await Promise.all(
            slice.map(async (s) => {
                const logs = await ctx.db
                    .query("patrolLogs")
                    .withIndex("by_session", (q) => q.eq("sessionId", s._id))
                    .collect();
                if (logs.length === 0) return null;
                const user = await ctx.db.get(s.guardId);
                const site = await ctx.db.get(s.siteId);
                const pointNames: string[] = [];
                for (const log of logs.sort((a, b) => a.createdAt - b.createdAt)) {
                    if (log.patrolPointId) {
                        const p = await ctx.db.get(log.patrolPointId);
                        if (p) pointNames.push(p.name);
                    }
                }
                const durationMs = (s.endTime ?? s.startTime) - s.startTime;
                const totalDistanceM = logs.reduce((acc, l) => acc + l.distance, 0);
                return {
                    sessionId: s._id,
                    siteId: s.siteId,
                    siteName: site?.name ?? "Site",
                    regionId: site?.regionId,
                    city: site?.city,
                    guardName: user?.name ?? "Unknown",
                    guardEmpId: user?.id ?? user?.mobileNumber ?? "",
                    startTime: s.startTime,
                    endTime: s.endTime,
                    scanCount: logs.length,
                    pointTrail: pointNames.join(" → "),
                    durationMs,
                    totalDistanceM: Math.round(totalDistanceM * 10) / 10,
                };
            })
        );

        return {
            items: rows.filter((r): r is NonNullable<typeof r> => r != null),
            total,
            offset: off,
            limit: lim,
            hasMore: off + lim < total,
        };
    },
});

/** Same filters as listPatrolRoundsPage; capped list for CSV/PDF export. */
export const listPatrolRoundsExport = query({
    args: {
        organizationId: v.id("organizations"),
        fromMs: v.number(),
        toMs: v.number(),
        siteIds: v.optional(v.array(v.id("sites"))),
        maxRows: v.number(),
    },
    handler: async (ctx, args) => {
        const max = Math.min(Math.max(args.maxRows, 1), 2500);

        let sessions = await ctx.db
            .query("patrolSessions")
            .withIndex("by_org_end", (q) =>
                q
                    .eq("organizationId", args.organizationId)
                    .gte("endTime", args.fromMs)
                    .lte("endTime", args.toMs)
            )
            .filter((q) => q.eq(q.field("status"), "completed"))
            .collect();

        if (args.siteIds && args.siteIds.length > 0) {
            const set = new Set(args.siteIds.map((id) => id.toString()));
            sessions = sessions.filter((s) => set.has(s.siteId.toString()));
        }

        sessions.sort((a, b) => (b.endTime ?? 0) - (a.endTime ?? 0));
        const truncated = sessions.length > max;
        const slice = sessions.slice(0, max);

        const items = await Promise.all(
            slice.map(async (s) => {
                const logs = await ctx.db
                    .query("patrolLogs")
                    .withIndex("by_session", (q) => q.eq("sessionId", s._id))
                    .collect();
                if (logs.length === 0) return null;
                const user = await ctx.db.get(s.guardId);
                const site = await ctx.db.get(s.siteId);
                const pointNames: string[] = [];
                for (const log of logs.sort((a, b) => a.createdAt - b.createdAt)) {
                    if (log.patrolPointId) {
                        const p = await ctx.db.get(log.patrolPointId);
                        if (p) pointNames.push(p.name);
                    }
                }
                const durationMs = (s.endTime ?? s.startTime) - s.startTime;
                const totalDistanceM = logs.reduce((acc, l) => acc + l.distance, 0);
                return {
                    sessionId: s._id,
                    siteId: s.siteId,
                    siteName: site?.name ?? "Site",
                    regionId: site?.regionId,
                    city: site?.city,
                    guardName: user?.name ?? "Unknown",
                    guardEmpId: user?.id ?? user?.mobileNumber ?? "",
                    startTime: s.startTime,
                    endTime: s.endTime,
                    scanCount: logs.length,
                    pointTrail: pointNames.join(" → "),
                    durationMs,
                    totalDistanceM: Math.round(totalDistanceM * 10) / 10,
                };
            })
        );

        return {
            items: items.filter((r): r is NonNullable<typeof r> => r != null),
            truncated,
            totalMatching: sessions.length,
        };
    },
});

export const getSessionDetail = query({
    args: { sessionId: v.id("patrolSessions") },
    handler: async (ctx, args) => {
        const s = await ctx.db.get(args.sessionId);
        if (!s) return null;
        const user = await ctx.db.get(s.guardId);
        const site = await ctx.db.get(s.siteId);
        const sitePoints = await ctx.db
            .query("patrolPoints")
            .withIndex("by_site", (q) => q.eq("siteId", s.siteId))
            .collect();

        const logs = (
            await ctx.db
                .query("patrolLogs")
                .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
                .collect()
        ).sort((a, b) => a.createdAt - b.createdAt);

        const logDetails = await Promise.all(
            logs.map(async (log, idx) => {
                let pointName = "";
                let allowedRadiusM = 200;
                const pt = log.patrolPointId
                    ? await ctx.db.get(log.patrolPointId)
                    : null;
                if (pt) {
                    pointName = pt.name ?? "";
                    if (pt.pointRadiusMeters != null)
                        allowedRadiusM = pt.pointRadiusMeters;
                }
                const withinRange = log.distance <= allowedRadiusM;
                const imageUrl = log.imageId
                    ? await ctx.storage.getUrl(log.imageId as any)
                    : null;
                return {
                    order: idx + 1,
                    logId: log._id,
                    pointName,
                    comment: log.comment,
                    imageId: log.imageId,
                    imageUrl,
                    distance: log.distance,
                    allowedRadiusM,
                    withinRange,
                    createdAt: log.createdAt,
                    latitude: log.latitude,
                    longitude: log.longitude,
                };
            })
        );

        const endT = s.endTime ?? s.startTime;
        const uniquePoints = new Set(
            logs.map((l) => l.patrolPointId).filter(Boolean) as string[]
        );

        return {
            session: {
                id: s._id,
                startTime: s.startTime,
                endTime: s.endTime,
                status: s.status,
                durationMs: endT - s.startTime,
            },
            siteName: site?.name ?? "",
            totalSitePoints: sitePoints.length,
            uniqueScannedPoints: uniquePoints.size,
            scanCount: logs.length,
            totalDistanceM: Math.round(logs.reduce((a, l) => a + l.distance, 0) * 10) / 10,
            guardName: user?.name ?? "",
            guardEmpId: user?.id ?? user?.mobileNumber ?? "",
            guardUserId: s.guardId,
            logs: logDetails,
        };
    },
});
