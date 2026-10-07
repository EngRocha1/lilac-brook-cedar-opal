import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

/** Guests/collaborators live in `shares` — never in `profiles` (no password). */
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
      emails: args.emails.map((e) => e.toLowerCase().trim()).filter(Boolean),
      canEdit: args.canEdit,
      active: true,
      createdBy: args.createdBy?.toLowerCase(),
      updatedAt: Date.now(),
    });
    return { token };
  },
});

export const getByToken = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const row = await ctx.db
      .query("shares")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .unique();
    if (!row) return null;
    if (row.active === false) return null;
    return row;
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
      .unique();
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
      .unique();
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
      .unique();
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
      (s) =>
        s.active !== false &&
        (s.emails.includes(email) || (s.createdBy && s.createdBy === email))
    );
  },
});

export const heartbeat = mutation({
  args: {
    flowKey: v.string(),
    email: v.string(),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const email = args.email.toLowerCase().trim();
    const existing = await ctx.db
      .query("presence")
      .withIndex("by_flow", (q) => q.eq("flowKey", args.flowKey))
      .collect();
    const mine = existing.find((p) => p.email === email);
    const now = Date.now();
    if (mine) {
      await ctx.db.patch(mine._id, { name: args.name, lastSeen: now });
    } else {
      await ctx.db.insert("presence", {
        flowKey: args.flowKey,
        email,
        name: args.name,
        lastSeen: now,
      });
    }
    // prune stale
    for (const p of existing) {
      if (now - p.lastSeen > 120000) await ctx.db.delete(p._id);
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
