import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

const MASTER_EMAIL = "tarcisio.rocha.engenheiro@gmail.com";
/** Legacy master password (plain) — also accepted if profile login fails */
const MASTER_PLAIN = "2004103007";

function isMasterEmail(email: string) {
  return email.toLowerCase().trim() === MASTER_EMAIL;
}

/** Soft gate: master email + (adminKey matches plain OR any non-empty key for dashboard after FE already authenticated) */
function assertAdmin(email: string, adminKey: string) {
  const e = email.toLowerCase().trim();
  if (!isMasterEmail(e)) throw new Error("FORBIDDEN_EMAIL");
  if (!adminKey || adminKey.length < 4) throw new Error("FORBIDDEN_KEY");
}

export const verifyMaster = query({
  args: {
    email: v.string(),
    passwordHash: v.optional(v.string()),
    adminKey: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const email = args.email.toLowerCase().trim();
    if (!isMasterEmail(email)) return { ok: false, reason: "not_master_email" };

    const row = await ctx.db
      .query("profiles")
      .withIndex("by_email", (q) => q.eq("email", email))
      .unique();

    // Path A: real profile password hash
    if (row?.passwordHash && args.passwordHash && row.passwordHash === args.passwordHash) {
      return {
        ok: true,
        email,
        name: row.name,
        role: row.role || "master",
        via: "profile",
      };
    }

    // Path B: legacy master plain password (adminKey)
    if (args.adminKey && args.adminKey === MASTER_PLAIN) {
      return {
        ok: true,
        email,
        name: row?.name || "Master",
        role: "master",
        via: "legacy_key",
      };
    }

    return { ok: false, reason: "bad_credentials" };
  },
});

export const ensureMasterProfile = mutation({
  args: {
    email: v.string(),
    adminKey: v.string(),
    name: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    assertAdmin(args.email, args.adminKey);
    const email = args.email.toLowerCase().trim();
    const existing = await ctx.db
      .query("profiles")
      .withIndex("by_email", (q) => q.eq("email", email))
      .unique();
    if (existing) {
      await ctx.db.patch(existing._id, {
        role: "master",
        updatedAt: Date.now(),
        name: args.name || existing.name,
      });
      return { ok: true, patched: true };
    }
    await ctx.db.insert("profiles", {
      email,
      name: args.name || "Master Admin",
      role: "master",
      company: "Fluxora",
      phone: "",
      updatedAt: Date.now(),
      loginCount: 0,
    });
    return { ok: true, created: true };
  },
});

export const dashboard = query({
  args: { email: v.string(), adminKey: v.string() },
  handler: async (ctx, args) => {
    assertAdmin(args.email, args.adminKey);
    const now = Date.now();
    const day = 24 * 60 * 60 * 1000;

    const profiles = await ctx.db.query("profiles").collect();
    const flows = await ctx.db.query("flows").collect();
    const shares = await ctx.db.query("shares").collect();
    const presence = await ctx.db.query("presence").collect();
    const sessions = await ctx.db.query("sessions").collect();
    const audits = await ctx.db.query("auditLogs").collect();
    const banners = await ctx.db.query("systemBanners").collect();

    const onlineSessions = sessions.filter(
      (s) => s.active && now - s.lastSeen < 90_000
    );
    const onlinePresence = presence.filter((p) => now - p.lastSeen < 90_000);

    // usage tiers by loginCount
    const heavy = profiles.filter((p) => (p.loginCount || 0) >= 20).length;
    const medium = profiles.filter(
      (p) => (p.loginCount || 0) >= 5 && (p.loginCount || 0) < 20
    ).length;
    const light = profiles.filter((p) => (p.loginCount || 0) < 5).length;

    // updates last 7 / 30 days
    const audits7 = audits.filter((a) => now - a.at < 7 * day);
    const audits30 = audits.filter((a) => now - a.at < 30 * day);

    // histogram last 14 days
    const hist: { day: string; count: number }[] = [];
    for (let i = 13; i >= 0; i--) {
      const start = now - (i + 1) * day;
      const end = now - i * day;
      const label = new Date(end).toISOString().slice(0, 10);
      hist.push({
        day: label,
        count: audits.filter((a) => a.at >= start && a.at < end).length,
      });
    }

    // top actors
    const byActor: Record<string, number> = {};
    for (const a of audits30) {
      byActor[a.actorEmail] = (byActor[a.actorEmail] || 0) + 1;
    }
    const topActors = Object.entries(byActor)
      .map(([email, count]) => ({ email, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      counts: {
        users: profiles.length,
        flows: flows.length,
        shares: shares.length,
        sharesActive: shares.filter((s) => s.active !== false).length,
        presenceRows: presence.length,
        sessions: sessions.length,
        sessionsOnline: onlineSessions.length,
        presenceOnline: onlinePresence.length,
        auditTotal: audits.length,
        audit7d: audits7.length,
        audit30d: audits30.length,
        bannersActive: banners.filter((b) => b.active).length,
      },
      usageTiers: { heavy, medium, light },
      hist14d: hist,
      topActors,
      online: onlineSessions.map((s) => ({
        email: s.email,
        name: s.name,
        lastSeen: s.lastSeen,
      })),
      recentAudit: audits
        .slice()
        .sort((a, b) => b.at - a.at)
        .slice(0, 40)
        .map((a) => ({
          at: a.at,
          actorEmail: a.actorEmail,
          action: a.action,
          entity: a.entity,
          entityId: a.entityId,
          detail: a.detail,
        })),
      tables: {
        profiles: profiles
          .map((p) => ({
            email: p.email,
            name: p.name,
            role: p.role || "user",
            company: p.company || "",
            loginCount: p.loginCount || 0,
            lastLoginAt: p.lastLoginAt || 0,
            updatedAt: p.updatedAt,
            hasPassword: !!p.passwordHash,
          }))
          .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0)),
        flows: flows
          .map((f) => ({
            key: f.key,
            title: f.title,
            ownerEmail: f.ownerEmail,
            updatedAt: f.updatedAt,
            nodes: (f.data as { nodes?: unknown[] })?.nodes?.length || 0,
            macros: (f.data as { macros?: unknown[] })?.macros?.length || 0,
          }))
          .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0)),
        shares: shares.map((s) => ({
          token: s.token,
          flowKey: s.flowKey,
          emails: s.emails,
          canEdit: s.canEdit,
          active: s.active !== false,
          createdBy: s.createdBy,
          updatedAt: s.updatedAt,
        })),
        presence: presence.map((p) => ({
          flowKey: p.flowKey,
          email: p.email,
          name: p.name,
          lastSeen: p.lastSeen,
        })),
        sessions: sessions
          .slice()
          .sort((a, b) => b.lastSeen - a.lastSeen)
          .slice(0, 100)
          .map((s) => ({
            email: s.email,
            name: s.name,
            startedAt: s.startedAt,
            lastSeen: s.lastSeen,
            active: s.active,
          })),
        banners: banners.map((b) => ({
          id: b._id,
          message: b.message,
          level: b.level,
          active: b.active,
          createdBy: b.createdBy,
          createdAt: b.createdAt,
          expiresAt: b.expiresAt,
        })),
      },
    };
  },
});

export const setBanner = mutation({
  args: {
    email: v.string(),
    adminKey: v.string(),
    message: v.string(),
    level: v.string(),
    active: v.boolean(),
  },
  handler: async (ctx, args) => {
    assertAdmin(args.email, args.adminKey);
    const id = await ctx.db.insert("systemBanners", {
      message: args.message,
      level: args.level || "info",
      active: args.active,
      createdBy: args.email.toLowerCase(),
      createdAt: Date.now(),
    });
    await ctx.db.insert("auditLogs", {
      at: Date.now(),
      actorEmail: args.email.toLowerCase(),
      action: "banner.create",
      entity: "systemBanners",
      entityId: String(id),
      detail: args.message.slice(0, 200),
    });
    return { ok: true, id };
  },
});

export const toggleBanner = mutation({
  args: {
    email: v.string(),
    adminKey: v.string(),
    bannerId: v.id("systemBanners"),
    active: v.boolean(),
  },
  handler: async (ctx, args) => {
    assertAdmin(args.email, args.adminKey);
    await ctx.db.patch(args.bannerId, { active: args.active });
    return { ok: true };
  },
});
