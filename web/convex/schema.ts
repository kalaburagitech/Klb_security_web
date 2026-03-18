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
        id: v.optional(v.string()),
        role: v.union(
            v.literal("Owner"),
            v.literal("Deployment Manager"),
            v.literal("Manager"),
            v.literal("Officer"),
            v.literal("Security Officer"),
            v.literal("SG"),
            v.literal("SO"),
            v.literal("NEW_USER")
        ),
        organizationId: v.id("organizations"),
        regionId: v.optional(v.string()),
        city: v.optional(v.string()),
        siteId: v.optional(v.id("sites")),
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
        creationTime: v.optional(v.number()),
    }).index("by_clerkId", ["clerkId"])
        .index("by_org", ["organizationId"])
        .index("by_email", ["email"])
        .index("by_region", ["regionId"]),

    loginLogs: defineTable({
        userId: v.id("users"),
        email: v.string(),
        organizationId: v.optional(v.id("organizations")),
        loginTime: v.optional(v.number()),
        logoutTime: v.optional(v.number()),
        ipAddress: v.optional(v.string()),
        browserInfo: v.optional(v.string()),
        sessionId: v.optional(v.string()),
        loginStatus: v.union(v.literal("success"), v.literal("failed"), v.literal("logout")),
        failureReason: v.optional(v.string()),
    }).index("by_user", ["userId"]),

    sites: defineTable({
        name: v.string(),
        locationName: v.string(),
        latitude: v.number(),
        longitude: v.number(),
        allowedRadius: v.number(), // in meters
        organizationId: v.id("organizations"),
        regionId: v.optional(v.string()), // Optional for existing sites
        city: v.optional(v.string()),
        shiftStart: v.optional(v.string()), // e.g. "08:00"
        shiftEnd: v.optional(v.string()),   // e.g. "20:00"
    }).index("by_org", ["organizationId"])
        .index("by_region", ["regionId"]),

    patrolPoints: defineTable({
        siteId: v.id("sites"),
        name: v.string(),
        qrCode: v.string(),
        latitude: v.optional(v.number()),
        longitude: v.optional(v.number()),
        organizationId: v.id("organizations"),
        imageId: v.optional(v.string()), // storageId for setup photo
        createdAt: v.optional(v.number()),
    }).index("by_org", ["organizationId"]).index("by_site", ["siteId"]),

    patrolLogs: defineTable({
        userId: v.id("users"),
        siteId: v.id("sites"),
        patrolPointId: v.optional(v.id("patrolPoints")),
        imageId: v.optional(v.string()), // storageId
        comment: v.string(),
        latitude: v.number(),
        longitude: v.number(),
        distance: v.number(), // distance from site
        createdAt: v.number(),
        organizationId: v.id("organizations"),
    }).index("by_org", ["organizationId"]).index("by_site", ["siteId"]).index("by_user", ["userId"]),

    visitLogs: defineTable({
        userId: v.id("users"),
        siteId: v.id("sites"),
        qrData: v.string(),
        visitType: v.optional(v.string()), // e.g. "General", "Trainer", "SiteCheckDay/Night"
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

    logs: defineTable({
        type: v.union(v.literal("patrol"), v.literal("visit"), v.literal("issue")),
        refId: v.union(v.id("patrolLogs"), v.id("visitLogs"), v.id("issues")),
        organizationId: v.id("organizations"),
        siteId: v.optional(v.id("sites")),
        guardId: v.optional(v.id("users")),
        status: v.optional(v.string()),
        issue: v.optional(v.boolean()),
        createdAt: v.optional(v.number()),
    }).index("by_org", ["organizationId"])
        .index("by_guard", ["guardId"])
        .index("by_org_status", ["organizationId", "status"]),

    patrolSessions: defineTable({
        guardId: v.id("users"),
        siteId: v.id("sites"),
        organizationId: v.id("organizations"),
        status: v.union(v.literal("active"), v.literal("inactive"), v.literal("completed")),
        startTime: v.number(),
        endTime: v.optional(v.number()),
        scannedPoints: v.optional(v.array(v.id("patrolPoints"))),
    }).index("by_org_status", ["organizationId", "status"]),

    incidents: defineTable({
        guardId: v.id("users"),
        userId: v.optional(v.id("users")), // Legacy field for migration
        siteId: v.id("sites"),
        patrolPointId: v.optional(v.id("patrolPoints")),
        imageId: v.optional(v.string()), // storageId
        comment: v.string(),
        severity: v.union(v.literal("Low"), v.literal("Medium"), v.literal("High")),
        timestamp: v.number(),
        organizationId: v.id("organizations"),
    }).index("by_org", ["organizationId"]).index("by_site", ["siteId"]),

    regions: defineTable({
        cities: v.array(v.string()),
        country: v.string(),
        createdAt: v.float64(),
        isActive: v.boolean(),
        regionName: v.string(), // ✅ changed
        regionId: v.string(),
    })
        .index("by_regionId", ["regionId"]),

    enrolledPersons: defineTable({
        name: v.string(),
        empId: v.string(),
        empCode: v.optional(v.string()),
        empRank: v.string(),
        region: v.string(),
        description: v.optional(v.string()),
        faceEncodingIds: v.array(v.number()),
        enrolledAt: v.number(),
        organizationId: v.optional(v.id("organizations")),
    }).index("by_org", ["organizationId"])
        .index("by_empId", ["empId"])
        .index("by_region", ["region"]),

    attendanceRecords: defineTable({
        personId: v.optional(v.string()), // Reference to person (can be emp_id or face_encoding_id)
        empId: v.string(),
        name: v.string(),
        date: v.string(), // YYYY-MM-DD format
        checkInTime: v.optional(v.number()),
        checkOutTime: v.optional(v.number()),
        status: v.union(v.literal("present"), v.literal("absent")),
        latitude: v.optional(v.number()),
        longitude: v.optional(v.number()),
        locationAccuracy: v.optional(v.number()),
        region: v.string(),
        organizationId: v.optional(v.id("organizations")),
    }).index("by_org", ["organizationId"])
        .index("by_empId", ["empId"])
        .index("by_date", ["date"])
        .index("by_region", ["region"])
        .index("by_empId_date", ["empId", "date"]),
});
