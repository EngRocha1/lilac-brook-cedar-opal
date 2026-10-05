import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const get = query({
  args: { key: v.string() },
  handler: async (ctx, { key }) => {
    const flow = await ctx.db
      .query("flows")
      .withIndex("by_key", (q) => q.eq("key", key))
      .unique();
    if (!flow) return null;
    const macros = await ctx.db.query("macros").withIndex("by_flow", (q) => q.eq("flowId", flow._id)).collect();
    const nodes = await ctx.db.query("nodes").withIndex("by_flow", (q) => q.eq("flowId", flow._id)).collect();
    const edges = await ctx.db.query("edges").withIndex("by_flow", (q) => q.eq("flowId", flow._id)).collect();
    return { flow, macros, nodes, edges };
  },
});

export const saveSnapshot = mutation({
  args: {
    key: v.string(),
    title: v.string(),
    payload: v.any(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("flows")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .unique();
    const now = Date.now();
    if (existing) {
      await ctx.db.patch(existing._id, { title: args.title, version: (existing.version || 0) + 1, updatedAt: now });
      return existing._id;
    }
    return await ctx.db.insert("flows", { key: args.key, title: args.title, version: 1, updatedAt: now });
  },
});
