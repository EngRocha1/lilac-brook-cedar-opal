import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const create = mutation({
  args: {
    token: v.string(),
    flowKey: v.string(),
    emails: v.array(v.string()),
    canEdit: v.boolean(),
    createdBy: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const emails = args.emails.map((e) => e.toLowerCase().trim()).filter(Boolean);
    const id = await ctx.db.insert("shares", {
      token: args.token,
      flowKey: args.flowKey,
      emails,
      canEdit: !!args.canEdit,
      active: true,
      createdBy: args.createdBy,
      updatedAt: now,
    });
    return { id, token: args.token };
  },
});

export const getByToken = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("shares")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();
  },
});

export const listByFlow = query({
  args: { flowKey: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("shares")
      .withIndex("by_flow", (q) => q.eq("flowKey", args.flowKey))
      .collect();
  },
});

export const setActive = mutation({
  args: { token: v.string(), active: v.boolean() },
  handler: async (ctx, args) => {
    const row = await ctx.db
      .query("shares")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();
    if (!row) return { ok: false };
    await ctx.db.patch(row._id, { active: args.active, updatedAt: Date.now() });
    return { ok: true };
  },
});

export const setCanEdit = mutation({
  args: { token: v.string(), canEdit: v.boolean() },
  handler: async (ctx, args) => {
    const row = await ctx.db
      .query("shares")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();
    if (!row) return { ok: false };
    await ctx.db.patch(row._id, { canEdit: args.canEdit, updatedAt: Date.now() });
    return { ok: true };
  },
});

export const revoke = mutation({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const row = await ctx.db
      .query("shares")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();
    if (!row) return { ok: false };
    await ctx.db.patch(row._id, { active: false, updatedAt: Date.now() });
    return { ok: true };
  },
});

export const listForGuest = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const email = args.email.toLowerCase().trim();
    const all = await ctx.db.query("shares").collect();
    return all.filter(
      (s) => s.active !== false && (s.emails || []).map((e) => e.toLowerCase()).includes(email)
    );
  },
});

/**
 * OCC-safe heartbeat:
 * - touches ONLY the caller's presence row (by_flow_email)
 * - does NOT collect/delete other rows in the hot path
 * - stale rows are filtered out in listPresence
 */
export const heartbeat = mutation({
  args: {
    flowKey: v.string(),
    email: v.string(),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const email = args.email.toLowerCase().trim();
    const flowKey = args.flowKey;
    if (!email || !flowKey) return { ok: false };

    const now = Date.now();
    const mine = await ctx.db
      .query("presence")
      .withIndex("by_flow_email", (q) => q.eq("flowKey", flowKey).eq("email", email))
      .first();

    if (mine) {
      await ctx.db.patch(mine._id, { name: args.name || email, lastSeen: now });
    } else {
      await ctx.db.insert("presence", {
        flowKey,
        email,
        name: args.name || email,
        lastSeen: now,
      });
    }
    return { ok: true };
  },
});

export const listPresence = query({
  args: { flowKey: v.string() },
  handler: async (ctx, args) => {
    const list = await ctx.db
      .query("presence")
      .withIndex("by_flow", (q) => q.eq("flowKey", args.flowKey))
      .collect();
    const now = Date.now();
    return list.filter((p) => now - p.lastSeen < 90000);
  },
});

/** Optional admin/maintenance prune — not called on every tick */
export const prunePresence = mutation({
  args: { flowKey: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const now = Date.now();
    let rows;
    if (args.flowKey) {
      rows = await ctx.db
        .query("presence")
        .withIndex("by_flow", (q) => q.eq("flowKey", args.flowKey))
        .collect();
    } else {
      rows = await ctx.db.query("presence").collect();
    }
    let deleted = 0;
    for (const p of rows) {
      if (now - p.lastSeen > 180000) {
        await ctx.db.delete(p._id);
        deleted++;
      }
    }
    return { deleted };
  },
});
