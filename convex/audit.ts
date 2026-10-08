import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const log = mutation({
  args: {
    actorEmail: v.string(),
    action: v.string(),
    entity: v.optional(v.string()),
    entityId: v.optional(v.string()),
    detail: v.optional(v.string()),
    meta: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const actor = args.actorEmail.toLowerCase().trim();
    if (!actor || !args.action) return { ok: false };
    await ctx.db.insert("auditLogs", {
      at: Date.now(),
      actorEmail: actor,
      action: args.action.slice(0, 80),
      entity: args.entity?.slice(0, 80),
      entityId: args.entityId?.slice(0, 120),
      detail: args.detail?.slice(0, 500),
      meta: args.meta,
    });
    return { ok: true };
  },
});

export const recent = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const lim = Math.min(args.limit || 50, 200);
    const rows = await ctx.db.query("auditLogs").collect();
    return rows
      .sort((a, b) => b.at - a.at)
      .slice(0, lim)
      .map((a) => ({
        at: a.at,
        actorEmail: a.actorEmail,
        action: a.action,
        entity: a.entity,
        entityId: a.entityId,
        detail: a.detail,
      }));
  },
});
