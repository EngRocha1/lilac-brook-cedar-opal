import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const getByEmail = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const email = args.email.toLowerCase().trim();
    const row = await ctx.db
      .query("profiles")
      .withIndex("by_email", (q) => q.eq("email", email))
      .unique();
    if (!row) return null;
    return {
      email: row.email,
      name: row.name,
      company: row.company || "",
      phone: row.phone || "",
      hasPassword: !!row.passwordHash,
      photoStorageId: row.photoStorageId,
      logoStorageId: row.logoStorageId,
    };
  },
});

export const listAll = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("profiles").collect();
    return rows
      .map((r) => ({
        email: r.email,
        name: r.name,
        company: r.company || "",
        phone: r.phone || "",
        hasPassword: !!r.passwordHash,
        updatedAt: r.updatedAt,
      }))
      .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  },
});

export const register = mutation({
  args: {
    email: v.string(),
    name: v.string(),
    passwordHash: v.string(),
    company: v.optional(v.string()),
    phone: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const email = args.email.toLowerCase().trim();
    const existing = await ctx.db
      .query("profiles")
      .withIndex("by_email", (q) => q.eq("email", email))
      .unique();

    if (existing) {
      if (existing.passwordHash) {
        throw new Error("EMAIL_EXISTS");
      }
      await ctx.db.patch(existing._id, {
        passwordHash: args.passwordHash,
        name: args.name || existing.name,
        company: args.company ?? existing.company ?? "",
        phone: args.phone ?? existing.phone ?? "",
        updatedAt: Date.now(),
      });
      return { ok: true, completed: true };
    }

    await ctx.db.insert("profiles", {
      email,
      name: args.name,
      passwordHash: args.passwordHash,
      company: args.company || "",
      phone: args.phone || "",
      updatedAt: Date.now(),
    });
    return { ok: true, created: true };
  },
});

export const login = query({
  args: { email: v.string(), passwordHash: v.string() },
  handler: async (ctx, args) => {
    const email = args.email.toLowerCase().trim();
    const row = await ctx.db
      .query("profiles")
      .withIndex("by_email", (q) => q.eq("email", email))
      .unique();
    if (!row || !row.passwordHash || row.passwordHash !== args.passwordHash) {
      return null;
    }
    return {
      email: row.email,
      name: row.name,
      company: row.company || "",
      phone: row.phone || "",
      photoStorageId: row.photoStorageId,
      logoStorageId: row.logoStorageId,
    };
  },
});

export const updateProfile = mutation({
  args: {
    email: v.string(),
    name: v.optional(v.string()),
    company: v.optional(v.string()),
    phone: v.optional(v.string()),
    photoStorageId: v.optional(v.string()),
    logoStorageId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const email = args.email.toLowerCase().trim();
    const row = await ctx.db
      .query("profiles")
      .withIndex("by_email", (q) => q.eq("email", email))
      .unique();
    if (!row) throw new Error("NOT_FOUND");
    const patch: Record<string, unknown> = { updatedAt: Date.now() };
    if (args.name !== undefined) patch.name = args.name;
    if (args.company !== undefined) patch.company = args.company;
    if (args.phone !== undefined) patch.phone = args.phone;
    if (args.photoStorageId !== undefined) patch.photoStorageId = args.photoStorageId;
    if (args.logoStorageId !== undefined) patch.logoStorageId = args.logoStorageId;
    await ctx.db.patch(row._id, patch);
    return { ok: true };
  },
});

export const adminRemove = mutation({
  args: { email: v.string(), adminKey: v.string() },
  handler: async (ctx, args) => {
    // soft gate — frontend sends master password string
    if (!args.adminKey || args.adminKey.length < 4) throw new Error("FORBIDDEN");
    const email = args.email.toLowerCase().trim();
    const row = await ctx.db
      .query("profiles")
      .withIndex("by_email", (q) => q.eq("email", email))
      .unique();
    if (!row) return { ok: false };
    await ctx.db.delete(row._id);
    return { ok: true };
  },
});
