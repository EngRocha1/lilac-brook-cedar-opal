import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

const DEFAULT_KEY = "hemopi-main";

export const list = query({
  args: { ownerEmail: v.optional(v.string()) },
  handler: async (ctx, args) => {
    if (args.ownerEmail) {
      return await ctx.db
        .query("flows")
        .withIndex("by_owner", (q) => q.eq("ownerEmail", args.ownerEmail))
        .collect();
    }
    return await ctx.db.query("flows").collect();
  },
});

export const get = query({
  args: { key: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const key = args.key ?? DEFAULT_KEY;
    const row = await ctx.db
      .query("flows")
      .withIndex("by_key", (q) => q.eq("key", key))
      .unique();
    if (!row) return null;
    return {
      key: row.key,
      title: row.title,
      ownerEmail: row.ownerEmail,
      data: row.data,
      updatedAt: row.updatedAt,
    };
  },
});

export const save = mutation({
  args: {
    key: v.optional(v.string()),
    title: v.optional(v.string()),
    ownerEmail: v.optional(v.string()),
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
      title: args.title ?? existing?.title ?? key,
      ownerEmail: args.ownerEmail ?? existing?.ownerEmail,
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

export const create = mutation({
  args: {
    title: v.string(),
    ownerEmail: v.optional(v.string()),
    data: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const key =
      "flow-" +
      Date.now().toString(36) +
      "-" +
      Math.random().toString(36).slice(2, 7);
    const id = await ctx.db.insert("flows", {
      key,
      title: args.title,
      ownerEmail: args.ownerEmail,
      data:
        args.data ?? {
          macros: [],
          nodes: [],
          edges: [],
          votes: {},
          comments: {},
        },
      updatedAt: Date.now(),
    });
    return { id, key };
  },
});

export const upsertProfile = mutation({
  args: { email: v.string(), name: v.string() },
  handler: async (ctx, args) => {
    const email = args.email.trim().toLowerCase();
    const existing = await ctx.db
      .query("profiles")
      .withIndex("by_email", (q) => q.eq("email", email))
      .unique();
    if (existing) {
      await ctx.db.patch(existing._id, {
        name: args.name,
        updatedAt: Date.now(),
      });
      return existing._id;
    }
    return await ctx.db.insert("profiles", {
      email,
      name: args.name,
      updatedAt: Date.now(),
    });
  },
});
