import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const create = mutation({
  args: {
    flowKey: v.string(),
    emails: v.array(v.string()),
    canEdit: v.boolean(),
    createdBy: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const token =
      "sh-" +
      Date.now().toString(36) +
      "-" +
      Math.random().toString(36).slice(2, 10);
    await ctx.db.insert("shares", {
      token,
      flowKey: args.flowKey,
      emails: args.emails.map((e) => e.toLowerCase().trim()),
      canEdit: args.canEdit,
      createdBy: args.createdBy,
      updatedAt: Date.now(),
    });
    return { token };
  },
});

export const getByToken = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("shares")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .unique();
  },
});

export const heartbeat = mutation({
  args: {
    flowKey: v.string(),
    email: v.string(),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const email = args.email.toLowerCase();
    const rows = await ctx.db
      .query("presence")
      .withIndex("by_flow", (q) => q.eq("flowKey", args.flowKey))
      .collect();
    const existing = rows.find((r) => r.email === email);
    if (existing) {
      await ctx.db.patch(existing._id, {
        name: args.name,
        lastSeen: Date.now(),
      });
    } else {
      await ctx.db.insert("presence", {
        flowKey: args.flowKey,
        email,
        name: args.name,
        lastSeen: Date.now(),
      });
    }
    const cutoff = Date.now() - 120000;
    for (const r of rows) {
      if (r.lastSeen < cutoff && r.email !== email) {
        await ctx.db.delete(r._id);
      }
    }
  },
});

export const listPresence = query({
  args: { flowKey: v.string() },
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query("presence")
      .withIndex("by_flow", (q) => q.eq("flowKey", args.flowKey))
      .collect();
    const cutoff = Date.now() - 120000;
    return rows.filter((r) => r.lastSeen >= cutoff);
  },
});
