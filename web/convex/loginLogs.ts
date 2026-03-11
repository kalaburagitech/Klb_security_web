import { v } from "convex/values";
import { mutation } from "./_generated/server";

export const logLogin = mutation({
  args: {
    userId: v.id("users"),
    email: v.string(),
    organizationId: v.optional(v.id("organizations")),
    ipAddress: v.optional(v.string()),
    loginStatus: v.string(),
    sessionId: v.optional(v.string()),
    browserInfo: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("loginLogs", {
      userId: args.userId,
      email: args.email,
      organizationId: args.organizationId,
      ipAddress: args.ipAddress,
      loginStatus: args.loginStatus,
      loginTime: Date.now(),
      sessionId: args.sessionId,
      browserInfo: args.browserInfo,
    });
  },
});

export const logLogout = mutation({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const lastLogin = await ctx.db
      .query("loginLogs")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .first();

    if (lastLogin && !lastLogin.logoutTime) {
      await ctx.db.patch(lastLogin._id, {
        logoutTime: Date.now(),
        loginStatus: "logout",
      });
    }
  },
});
