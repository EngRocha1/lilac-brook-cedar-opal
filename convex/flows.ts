import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

const emptyData = {
  macros: [] as unknown[],
  nodes: [] as unknown[],
  edges: [] as unknown[],
  votes: {} as Record<string, unknown>,
  comments: {} as Record<string, unknown>,
};

/** List ONLY flows owned by requester — never dump all flows. */
export const list = query({
  args: { ownerEmail: v.string() },
  handler: async (ctx, args) => {
    const email = args.ownerEmail.toLowerCase().trim();
    if (!email) return [];
    return await ctx.db
      .query("flows")
      .withIndex("by_owner", (q) => q.eq("ownerEmail", email))
      .collect();
  },
});

/**
 * Get flow by key.
 * - Owner (requesterEmail === ownerEmail) → full access
 * - Shared guest (shareToken valid + email in share) → full access
 * - Otherwise → null (no leak)
 */
export const get = query({
  args: {
    key: v.string(),
    requesterEmail: v.optional(v.string()),
    shareToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const key = args.key;
    const row = await ctx.db
      .query("flows")
      .withIndex("by_key", (q) => q.eq("key", key))
      .unique();
    if (!row) return null;

    const req = (args.requesterEmail || "").toLowerCase().trim();
    const owner = (row.ownerEmail || "").toLowerCase().trim();

    let allowed = false;
    if (req && owner && req === owner) allowed = true;

    if (!allowed && args.shareToken) {
      const sh = await ctx.db
        .query("shares")
        .withIndex("by_token", (q) => q.eq("token", args.shareToken!))
        .unique();
      if (
        sh &&
        sh.active !== false &&
        sh.flowKey === key &&
        (sh.emails.includes(req) ||
          (sh.createdBy && sh.createdBy.toLowerCase() === req))
      ) {
        allowed = true;
      }
    }

    if (!allowed) return null;

    return {
      key: row.key,
      title: row.title,
      ownerEmail: row.ownerEmail,
      data: row.data,
      updatedAt: row.updatedAt,
    };
  },
});

/** Save only if owner matches (or creating new key for that owner). */
export const save = mutation({
  args: {
    key: v.string(),
    title: v.optional(v.string()),
    ownerEmail: v.string(),
    data: v.any(),
  },
  handler: async (ctx, args) => {
    const key = args.key;
    const owner = args.ownerEmail.toLowerCase().trim();
    if (!owner) throw new Error("OWNER_REQUIRED");

    const existing = await ctx.db
      .query("flows")
      .withIndex("by_key", (q) => q.eq("key", key))
      .unique();

    if (existing) {
      const rowOwner = (existing.ownerEmail || "").toLowerCase().trim();
      if (rowOwner && rowOwner !== owner) {
        throw new Error("NOT_OWNER");
      }
      await ctx.db.patch(existing._id, {
        title: args.title ?? existing.title ?? key,
        ownerEmail: owner,
        data: args.data,
        updatedAt: Date.now(),
      });
      return existing._id;
    }

    return await ctx.db.insert("flows", {
      key,
      title: args.title ?? key,
      ownerEmail: owner,
      data: args.data,
      updatedAt: Date.now(),
    });
  },
});

export const create = mutation({
  args: {
    title: v.string(),
    ownerEmail: v.string(),
    data: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const owner = args.ownerEmail.toLowerCase().trim();
    if (!owner) throw new Error("OWNER_REQUIRED");
    const key =
      "flow-" +
      Date.now().toString(36) +
      "-" +
      Math.random().toString(36).slice(2, 7);
    await ctx.db.insert("flows", {
      key,
      title: args.title,
      ownerEmail: owner,
      data: args.data ?? {
        ...emptyData,
        header: { projectName: args.title },
      },
      updatedAt: Date.now(),
    });
    return { key };
  },
});

export const remove = mutation({
  args: { key: v.string(), ownerEmail: v.string() },
  handler: async (ctx, args) => {
    const owner = args.ownerEmail.toLowerCase().trim();
    const row = await ctx.db
      .query("flows")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .unique();
    if (!row) return { ok: false };
    const rowOwner = (row.ownerEmail || "").toLowerCase().trim();
    if (rowOwner && rowOwner !== owner) {
      return { ok: false, error: "not_owner" };
    }
    await ctx.db.delete(row._id);
    return { ok: true };
  },
});

/** Bootstrap blank flow for new account */
export const ensureStarter = mutation({
  args: { ownerEmail: v.string(), name: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const owner = args.ownerEmail.toLowerCase().trim();
    if (!owner) throw new Error("OWNER_REQUIRED");
    const existing = await ctx.db
      .query("flows")
      .withIndex("by_owner", (q) => q.eq("ownerEmail", owner))
      .collect();
    if (existing.length > 0) {
      return { key: existing[0].key, created: false };
    }
    const title = (args.name || owner.split("@")[0] || "Meu fluxo").trim();
    const key =
      "flow-" +
      Date.now().toString(36) +
      "-" +
      Math.random().toString(36).slice(2, 7);
    await ctx.db.insert("flows", {
      key,
      title,
      ownerEmail: owner,
      data: {
        macros: [],
        nodes: [],
        edges: [],
        votes: {},
        comments: {},
        header: { projectName: title },
      },
      updatedAt: Date.now(),
    });
    return { key, created: true };
  },
});
