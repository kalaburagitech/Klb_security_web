import { query } from "./_generated/server";

export const listOrgs = query({
    handler: async (ctx) => {
        return await ctx.db.query("organizations").collect();
    },
});
