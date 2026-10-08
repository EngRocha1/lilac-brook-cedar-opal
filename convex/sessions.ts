import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const heartbeat = mutation({
  args: {
    email: v.string(),
    name: v.optional(v.string()),
    userAgent: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const email = args.email.toLowerCase().trim();
    if (!email) return { ok: false };
    const now = Date.now();
    const existing = await ctx.db
      .query("sessions")
      .withIndex("by_email", (q) => q.eq("email", email))
      .collect();
    const active = existing.find((s) => s.active);
    if (active) {
      await ctx.db.patch(active._id, {
        lastSeen: now,
        name: args.name || active.name,
        userAgent: args.userAgent || active.userAgent,
        active: true,
      });
      return { ok: true, id: active._id };
    }
    const id = await ctx.db.insert("sessions", {
      email,
      name: args.name || "",
      startedAt: now,
      lastSeen: now,
      userAgent: args.userAgent || "",
      active: true,
    });
    return { ok: true, id };
  },
});

export const end = mutation({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const email = args.email.toLowerCase().trim();
    const rows = await ctx.db
      .query("sessions")
      .withIndex("by_email", (q) => q.eq("email", email))
      .collect();
    for (const s of rows) {
      if (s.active) await ctx.db.patch(s._id, { active: false, lastSeen: Date.now() });
    }
    return { ok: true };
  },
});

export const online = query({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const rows = await ctx.db.query("sessions").collect();
    return rows
      .filter((s) => s.active && now - s.lastSeen < 90_000)
      .map((s) => ({
        email: s.email,
        name: s.name,
        lastSeen: s.lastSeen,
      }));
  },
});
