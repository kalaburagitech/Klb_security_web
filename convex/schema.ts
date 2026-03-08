import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
    organizations: defineTable({
        name: v.string(),
        createdAt: v.number(),
    }),

    users: defineTable({
        clerkId: v.string(),
        name: v.string(),
        email: v.optional(v.string()),
        mobileNumber: v.optional(v.string()),
        role: v.union(
            v.literal("Owner"),
            v.literal("Deployment Manager"),
            v.literal("Manager"),
            v.literal("Officer"),
            v.literal("Security Officer"),
            v.literal("SG"),
            v.literal("SO")
        ),
        organizationId: v.id("organizations"),
        siteId: v.optional(v.id("sites")), // Legacy field for migration
        siteIds: v.optional(v.array(v.id("sites"))),
        permissions: v.optional(v.object({
            users: v.boolean(),
            sites: v.boolean(),
            patrolPoints: v.boolean(),
            patrolLogs: v.boolean(),
            visitLogs: v.boolean(),
            issues: v.boolean(),
            analytics: v.boolean(),
        })),
    }).index("by_clerkId", ["clerkId"])
        .index("by_org", ["organizationId"])
        .index("by_email", ["email"]),

    sites: defineTable({
        name: v.string(),
        locationName: v.string(),
        latitude: v.number(),
        longitude: v.number(),
        allowedRadius: v.number(), // in meters
        organizationId: v.id("organizations"),
        shiftStart: v.optional(v.string()), // e.g. "08:00"
        shiftEnd: v.optional(v.string()),   // e.g. "20:00"
    }).index("by_org", ["organizationId"]),

    patrolPoints: defineTable({
        siteId: v.id("sites"),
        name: v.string(),
        qrCode: v.string(),
        latitude: v.optional(v.number()),
        longitude: v.optional(v.number()),
        organizationId: v.id("organizations"),
    }).index("by_org", ["organizationId"]).index("by_site", ["siteId"]),

    patrolLogs: defineTable({
        userId: v.id("users"),
        siteId: v.id("sites"),
        patrolPointId: v.id("patrolPoints"),
        imageId: v.optional(v.string()), // storageId
        comment: v.string(),
        latitude: v.number(),
        longitude: v.number(),
        distance: v.number(), // distance from site
        createdAt: v.number(),
        organizationId: v.id("organizations"),
    }).index("by_org", ["organizationId"]).index("by_site", ["siteId"]),

    visitLogs: defineTable({
        userId: v.id("users"),
        siteId: v.id("sites"),
        qrData: v.string(),
        imageId: v.optional(v.string()),
        remark: v.string(),
        latitude: v.number(),
        longitude: v.number(),
        createdAt: v.number(),
        organizationId: v.id("organizations"),
    }).index("by_org", ["organizationId"]),

    issues: defineTable({
        siteId: v.id("sites"),
        logId: v.union(v.id("patrolLogs"), v.id("visitLogs")),
        title: v.string(),
        description: v.string(),
        priority: v.union(v.literal("Low"), v.literal("Medium"), v.literal("High")),
        status: v.union(v.literal("open"), v.literal("closed")),
        timestamp: v.number(),
        organizationId: v.id("organizations"),
    }).index("by_org", ["organizationId"]),
});
