import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const create = mutation({
    args: {
        name: v.string(),
        empId: v.string(),
        empCode: v.optional(v.string()),
        empRank: v.string(),
        region: v.string(),
        description: v.optional(v.string()),
        faceEncodingIds: v.array(v.number()),
        enrolledAt: v.number(),
        organizationId: v.optional(v.id("organizations")),
    },
    handler: async (ctx, args) => {
        const enrollmentId = await ctx.db.insert("enrolledPersons", {
            name: args.name,
            empId: args.empId,
            empCode: args.empCode,
            empRank: args.empRank,
            region: args.region,
            description: args.description,
            faceEncodingIds: args.faceEncodingIds,
            enrolledAt: args.enrolledAt,
            organizationId: args.organizationId,
        });

        return enrollmentId;
    },
});

export const list = query({
    args: {
        organizationId: v.optional(v.id("organizations")),
        region: v.optional(v.string()),
        empId: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const enrollments = args.organizationId
            ? await ctx.db
                  .query("enrolledPersons")
                  .withIndex("by_org", (q) => q.eq("organizationId", args.organizationId))
                  .collect()
            : args.region
              ? await ctx.db
                    .query("enrolledPersons")
                    .withIndex("by_region", (q) => q.eq("region", args.region!))
                    .collect()
              : args.empId
                ? await ctx.db
                      .query("enrolledPersons")
                      .withIndex("by_empId", (q) => q.eq("empId", args.empId!))
                      .collect()
                : await ctx.db.query("enrolledPersons").collect();

        return enrollments;
    },
});
