import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

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
      if (!existing.passwordHash && args.passwordHash) {
        await ctx.db.patch(existing._id, {
          passwordHash: args.passwordHash,
          name: args.name || existing.name,
          updatedAt: Date.now(),
        });
        return { ok: true, updated: true };
      }
      throw new Error("E-mail já cadastrado");
    }
    await ctx.db.insert("profiles", {
      email,
      name: args.name,
      passwordHash: args.passwordHash,
      company: args.company || "",
      phone: args.phone || "",
      updatedAt: Date.now(),
    });
    return { ok: true };
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

export const setPassword = mutation({
  args: {
    email: v.string(),
    name: v.optional(v.string()),
    passwordHash: v.string(),
  },
  handler: async (ctx, args) => {
    const email = args.email.toLowerCase().trim();
    const row = await ctx.db
      .query("profiles")
      .withIndex("by_email", (q) => q.eq("email", email))
      .unique();
    if (row) {
      await ctx.db.patch(row._id, {
        passwordHash: args.passwordHash,
        name: args.name || row.name,
        updatedAt: Date.now(),
      });
      return { ok: true };
    }
    await ctx.db.insert("profiles", {
      email,
      name: args.name || email.split("@")[0],
      passwordHash: args.passwordHash,
      company: "",
      phone: "",
      updatedAt: Date.now(),
    });
    return { ok: true, created: true };
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
    if (!row) throw new Error("Perfil não encontrado");
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
