import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

const MASTER_EMAIL = "tarcisio.rocha.engenheiro@gmail.com";

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
      role: row.role || (email === MASTER_EMAIL ? "master" : "user"),
      photoStorageId: row.photoStorageId,
      logoStorageId: row.logoStorageId,
      loginCount: row.loginCount || 0,
      lastLoginAt: row.lastLoginAt || 0,
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
        role: r.role || (r.email === MASTER_EMAIL ? "master" : "user"),
        loginCount: r.loginCount || 0,
        lastLoginAt: r.lastLoginAt || 0,
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
    const role = email === MASTER_EMAIL ? "master" : "user";
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
        role: existing.role || role,
        updatedAt: Date.now(),
      });
      await ctx.db.insert("auditLogs", {
        at: Date.now(),
        actorEmail: email,
        action: "auth.register.complete",
        entity: "profiles",
        entityId: email,
      });
      return { ok: true, completed: true };
    }

    await ctx.db.insert("profiles", {
      email,
      name: args.name,
      passwordHash: args.passwordHash,
      company: args.company || "",
      phone: args.phone || "",
      role,
      loginCount: 0,
      updatedAt: Date.now(),
    });
    await ctx.db.insert("auditLogs", {
      at: Date.now(),
      actorEmail: email,
      action: "auth.register",
      entity: "profiles",
      entityId: email,
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
      role: row.role || (email === MASTER_EMAIL ? "master" : "user"),
      photoStorageId: row.photoStorageId,
      logoStorageId: row.logoStorageId,
    };
  },
});

/** Call after successful login (mutation — queries cannot write) */
export const recordLogin = mutation({
  args: {
    email: v.string(),
    userAgent: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const email = args.email.toLowerCase().trim();
    const row = await ctx.db
      .query("profiles")
      .withIndex("by_email", (q) => q.eq("email", email))
      .unique();
    if (!row) return { ok: false };
    const now = Date.now();
    await ctx.db.patch(row._id, {
      lastLoginAt: now,
      loginCount: (row.loginCount || 0) + 1,
      updatedAt: now,
      role: row.role || (email === MASTER_EMAIL ? "master" : "user"),
    });
    await ctx.db.insert("auditLogs", {
      at: now,
      actorEmail: email,
      action: "auth.login",
      entity: "profiles",
      entityId: email,
      detail: args.userAgent?.slice(0, 200),
    });
    // session heartbeat
    const sessions = await ctx.db
      .query("sessions")
      .withIndex("by_email", (q) => q.eq("email", email))
      .collect();
    const active = sessions.find((s) => s.active);
    if (active) {
      await ctx.db.patch(active._id, {
        lastSeen: now,
        name: row.name,
        userAgent: args.userAgent || active.userAgent,
      });
    } else {
      await ctx.db.insert("sessions", {
        email,
        name: row.name,
        startedAt: now,
        lastSeen: now,
        userAgent: args.userAgent || "",
        active: true,
      });
    }
    return { ok: true };
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
    await ctx.db.insert("auditLogs", {
      at: Date.now(),
      actorEmail: email,
      action: "profile.update",
      entity: "profiles",
      entityId: email,
    });
    return { ok: true };
  },
});

export const adminRemove = mutation({
  args: { email: v.string(), adminKey: v.string() },
  handler: async (ctx, args) => {
    if (!args.adminKey || args.adminKey.length < 4) throw new Error("FORBIDDEN");
    const email = args.email.toLowerCase().trim();
    if (email === MASTER_EMAIL) throw new Error("CANNOT_DELETE_MASTER");
    const row = await ctx.db
      .query("profiles")
      .withIndex("by_email", (q) => q.eq("email", email))
      .unique();
    if (!row) return { ok: false };
    await ctx.db.delete(row._id);
    await ctx.db.insert("auditLogs", {
      at: Date.now(),
      actorEmail: "admin",
      action: "profile.delete",
      entity: "profiles",
      entityId: email,
    });
    return { ok: true };
  },
});
