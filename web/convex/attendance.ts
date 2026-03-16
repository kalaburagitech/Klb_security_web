import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

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
    },
    handler: async (ctx, args) => {
        // Check if attendance record already exists for this empId and date
        const existing = await ctx.db
            .query("attendanceRecords")
            .withIndex("by_empId_date", (q) => q.eq("empId", args.empId).eq("date", args.date))
            .first();

        if (existing) {
            // Update existing record
            await ctx.db.patch(existing._id, {
                checkInTime: args.checkInTime ?? existing.checkInTime,
                checkOutTime: args.checkOutTime ?? existing.checkOutTime,
                status: args.status,
                latitude: args.latitude ?? existing.latitude,
                longitude: args.longitude ?? existing.longitude,
                locationAccuracy: args.locationAccuracy ?? existing.locationAccuracy,
            });
            return existing._id;
        } else {
            // Create new record
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
            });
            return attendanceId;
        }
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
        const record = await ctx.db
            .query("attendanceRecords")
            .withIndex("by_empId_date", (q) => q.eq("empId", args.empId).eq("date", args.date))
            .first();

        return record;
    },
});

export const list = query({
    args: {
        organizationId: v.optional(v.id("organizations")),
        region: v.optional(v.string()),
        date: v.optional(v.string()),
        empId: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        let query = ctx.db.query("attendanceRecords");

        if (args.organizationId) {
            query = query.withIndex("by_org", (q) => q.eq("organizationId", args.organizationId));
        } else if (args.region) {
            query = query.withIndex("by_region", (q) => q.eq("region", args.region));
        } else if (args.empId) {
            query = query.withIndex("by_empId", (q) => q.eq("empId", args.empId));
        } else if (args.date) {
            query = query.withIndex("by_date", (q) => q.eq("date", args.date));
        }

        const records = await query.collect();
        
        // Filter by additional criteria if needed
        let filtered = records;
        if (args.date && !args.organizationId && !args.region && !args.empId) {
            filtered = records.filter((r) => r.date === args.date);
        }
        if (args.region && (args.organizationId || args.empId || args.date)) {
            filtered = filtered.filter((r) => r.region === args.region);
        }
        if (args.empId && (args.organizationId || args.region || args.date)) {
            filtered = filtered.filter((r) => r.empId === args.empId);
        }

        return filtered;
    },
});
