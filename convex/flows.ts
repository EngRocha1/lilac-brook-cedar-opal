import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

const DEFAULT_KEY = "hemopi-main";

export const get = query({
  args: { key: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const key = args.key ?? DEFAULT_KEY;
    const row = await ctx.db
      .query("flows")
      .withIndex("by_key", (q) => q.eq("key", key))
      .unique();
    return row?.data ?? null;
  },
});

export const save = mutation({
  args: {
    key: v.optional(v.string()),
    data: v.any(),
  },
  handler: async (ctx, args) => {
    const key = args.key ?? DEFAULT_KEY;
    const existing = await ctx.db
      .query("flows")
      .withIndex("by_key", (q) => q.eq("key", key))
      .unique();
    const payload = {
      key,
      data: args.data,
      updatedAt: Date.now(),
    };
    if (existing) {
      await ctx.db.patch(existing._id, payload);
      return existing._id;
    }
    return await ctx.db.insert("flows", payload);
  },
});
