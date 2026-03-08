import { v } from "convex/values";
import { mutation } from "./_generated/server";

export const getOrCreateUser = mutation({
  args: {
    clerkId: v.string(),
    name: v.string(),
    email: v.string(),
  },
  handler: async (ctx, args) => {
    // Check if user exists by email
    const userByEmail = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .unique();

    if (userByEmail) {
      // If user exists but clerkId is different (e.g. pending user), update it
      if (userByEmail.clerkId !== args.clerkId) {
        await ctx.db.patch(userByEmail._id, { clerkId: args.clerkId });
      }
      return userByEmail;
    }

    // Check if user exists by clerkId
    const userByClerkId = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
      .unique();

    if (userByClerkId) {
      return userByClerkId;
    }

    // Create new user
    // We need an organizationId. Let's find one or create a "System" organization.
    let org = await ctx.db.query("organizations").filter(q => q.eq(q.field("name"), "System")).unique();
    if (!org) {
      const orgId = await ctx.db.insert("organizations", {
        name: "System",
        createdAt: Date.now(),
      });
      org = await ctx.db.get(orgId);
    }

    const userId = await ctx.db.insert("users", {
      clerkId: args.clerkId,
      name: args.name,
      email: args.email,
      role: "NEW_USER",
      organizationId: org!._id,
    });

    return await ctx.db.get(userId);
  },
});
