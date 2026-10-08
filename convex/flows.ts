import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

const emptyData = {
  macros: [] as unknown[],
  nodes: [] as unknown[],
  edges: [] as unknown[],
  votes: {} as Record<string, unknown>,
  comments: {} as Record<string, unknown>,
  previews: {} as Record<string, unknown>,
};

async function audit(
  ctx: { db: { insert: (t: "auditLogs", d: Record<string, unknown>) => Promise<unknown> } },
  actorEmail: string,
  action: string,
  entityId: string,
  detail?: string
) {
  try {
    await ctx.db.insert("auditLogs", {
      at: Date.now(),
      actorEmail: (actorEmail || "system").toLowerCase(),
      action,
      entity: "flows",
      entityId,
      detail: detail?.slice(0, 500),
    });
  } catch {
    /* schema may lag deploy */
  }
}

export const list = query({
  args: { ownerEmail: v.string() },
  handler: async (ctx, args) => {
    const email = args.ownerEmail.toLowerCase().trim();
    if (!email) return [];
    const rows = await ctx.db
      .query("flows")
      .withIndex("by_owner", (q) => q.eq("ownerEmail", email))
      .collect();
    return rows.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  },
});

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
      if (sh && sh.active !== false && sh.flowKey === key) {
        if (!req || sh.emails.map((e) => e.toLowerCase()).includes(req)) {
          allowed = true;
        }
      }
    }

    if (!allowed && req) {
      const shares = await ctx.db
        .query("shares")
        .withIndex("by_flow", (q) => q.eq("flowKey", key))
        .collect();
      for (const sh of shares) {
        if (
          sh.active !== false &&
          sh.emails.map((e) => e.toLowerCase()).includes(req)
        ) {
          allowed = true;
          break;
        }
      }
    }

    if (!allowed) return null;
    return row;
  },
});

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
      await audit(ctx, owner, "flow.save", key, args.title);
      return existing._id;
    }

    const id = await ctx.db.insert("flows", {
      key,
      title: args.title ?? key,
      ownerEmail: owner,
      data: args.data,
      updatedAt: Date.now(),
    });
    await audit(ctx, owner, "flow.create", key, args.title);
    return id;
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
    await audit(ctx, owner, "flow.create", key, args.title);
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
    if (!row) return { ok: false, error: "NOT_FOUND" };
    const rowOwner = (row.ownerEmail || "").toLowerCase().trim();
    if (rowOwner && rowOwner !== owner) {
      return { ok: false, error: "NOT_OWNER" };
    }
    await ctx.db.delete(row._id);
    await audit(ctx, owner, "flow.delete", args.key, row.title);
    return { ok: true };
  },
});
