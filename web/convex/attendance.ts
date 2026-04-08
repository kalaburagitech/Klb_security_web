import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

function normShiftKey(shiftName: string | undefined): string {
    const t = (shiftName ?? "").trim();
    return t.length ? t.toLowerCase() : "default";
}

export const create = mutation({
    args: {
        personId: v.optional(v.string()),
        empId: v.string(),
        name: v.string(),
        date: v.string(),
        checkInTime: v.optional(v.number()),
        checkOutTime: v.optional(v.number()),
        status: v.union(v.literal("present"), v.literal("absent")),
        latitude: v.optional(v.number()),
        longitude: v.optional(v.number()),
        locationAccuracy: v.optional(v.number()),
        region: v.string(),
        organizationId: v.optional(v.id("organizations")),
        siteId: v.optional(v.id("sites")),
        siteName: v.optional(v.string()),
        shiftName: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const shiftKey = normShiftKey(args.shiftName);

        const dayRecords = await ctx.db
            .query("attendanceRecords")
            .withIndex("by_empId_date", (q) => q.eq("empId", args.empId).eq("date", args.date))
            .collect();

        let existing =
            dayRecords.find((r) => normShiftKey(r.shiftName) === shiftKey) ?? null;

        if (!existing && dayRecords.length === 1) {
            const only = dayRecords[0];
            if (!only.shiftName && shiftKey === "default") {
                existing = only;
            }
        }

        const incomingIn = args.checkInTime;
        const incomingOut = args.checkOutTime;

        if (existing) {
            const complete =
                existing.checkInTime != null && existing.checkOutTime != null;
            if (
                complete &&
                incomingIn != null &&
                incomingOut == null
            ) {
                throw new Error(
                    "Attendance for this shift is already complete. Use another shift if you are working a double."
                );
            }
            const dupOpenCheckIn =
                incomingIn != null &&
                existing.checkInTime != null &&
                existing.checkOutTime == null &&
                incomingOut == null;
            if (dupOpenCheckIn) {
                throw new Error(
                    "Already checked in for this shift. Check out first or pick a different shift."
                );
            }

            await ctx.db.patch(existing._id, {
                checkInTime: args.checkInTime ?? existing.checkInTime,
                checkOutTime: args.checkOutTime ?? existing.checkOutTime,
                status: args.status,
                latitude: args.latitude ?? existing.latitude,
                longitude: args.longitude ?? existing.longitude,
                locationAccuracy: args.locationAccuracy ?? existing.locationAccuracy,
                siteId: args.siteId ?? existing.siteId,
                siteName: args.siteName ?? existing.siteName,
                shiftName: args.shiftName ?? existing.shiftName,
            });
            return existing._id;
        }

        const attendanceId = await ctx.db.insert("attendanceRecords", {
            personId: args.personId,
            empId: args.empId,
            name: args.name,
            date: args.date,
            checkInTime: args.checkInTime,
            checkOutTime: args.checkOutTime,
            status: args.status,
            latitude: args.latitude,
            longitude: args.longitude,
            locationAccuracy: args.locationAccuracy,
            region: args.region,
            organizationId: args.organizationId,
            siteId: args.siteId,
            siteName: args.siteName,
            shiftName: args.shiftName,
        });
        return attendanceId;
    },
});

export const getByPersonAndDate = query({
    args: {
        empId: v.string(),
        date: v.string(),
    },
    handler: async (ctx, args) => {
        const record = await ctx.db
            .query("attendanceRecords")
            .withIndex("by_empId_date", (q) => q.eq("empId", args.empId).eq("date", args.date))
            .first();

        return record;
    },
});

export const getByEmpIdAndDate = query({
    args: {
        empId: v.string(),
        date: v.string(),
    },
    handler: async (ctx, args) => {
        const records = await ctx.db
            .query("attendanceRecords")
            .withIndex("by_empId_date", (q) => q.eq("empId", args.empId).eq("date", args.date))
            .collect();

        const open = records.find((r) => r.checkInTime != null && r.checkOutTime == null);
        if (open) return open;
        return records[0] ?? null;
    },
});

/** All rows for an employee on a calendar day (multiple shifts). */
export const listByEmpIdAndDate = query({
    args: {
        empId: v.string(),
        date: v.string(),
    },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("attendanceRecords")
            .withIndex("by_empId_date", (q) => q.eq("empId", args.empId).eq("date", args.date))
            .collect();
    },
});

export const list = query({
    args: {
        organizationId: v.optional(v.id("organizations")),
        region: v.optional(v.string()),
        date: v.optional(v.string()),
        empId: v.optional(v.string()),
        siteId: v.optional(v.id("sites")),
        shiftName: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const records = args.organizationId
            ? await ctx.db
                  .query("attendanceRecords")
                  .withIndex("by_org", (q) => q.eq("organizationId", args.organizationId))
                  .collect()
            : args.region
              ? await ctx.db
                    .query("attendanceRecords")
                    .withIndex("by_region", (q) => q.eq("region", args.region!))
                    .collect()
              : args.empId
                ? await ctx.db
                      .query("attendanceRecords")
                      .withIndex("by_empId", (q) => q.eq("empId", args.empId!))
                      .collect()
                : args.date
                  ? await ctx.db
                        .query("attendanceRecords")
                        .withIndex("by_date", (q) => q.eq("date", args.date!))
                        .collect()
                  : await ctx.db.query("attendanceRecords").collect();
        
        // Filter by additional criteria if needed
        let filtered = records;
        if (args.date) {
            filtered = filtered.filter((r) => r.date === args.date);
        }
        if (args.region && (args.organizationId || args.empId || args.date)) {
            filtered = filtered.filter((r) => r.region === args.region);
        }
        if (args.empId && (args.organizationId || args.region || args.date)) {
            filtered = filtered.filter((r) => r.empId === args.empId);
        }
        if (args.siteId) {
            filtered = filtered.filter((r) => r.siteId === args.siteId);
        }
        if (args.shiftName) {
            filtered = filtered.filter((r) => r.shiftName === args.shiftName);
        }

        return filtered;
    },
});

export const listForOrgDateRange = query({
    args: {
        organizationId: v.id("organizations"),
        startDate: v.string(),
        endDate: v.string(),
    },
    handler: async (ctx, args) => {
        const records = await ctx.db
            .query("attendanceRecords")
            .withIndex("by_org", (q) => q.eq("organizationId", args.organizationId))
            .collect();
        return records.filter(
            (r) => r.date >= args.startDate && r.date <= args.endDate
        );
    },
});
