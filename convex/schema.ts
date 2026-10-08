import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  flows: defineTable({
    key: v.string(),
    title: v.optional(v.string()),
    ownerEmail: v.optional(v.string()),
    data: v.any(),
    updatedAt: v.number(),
  })
    .index("by_key", ["key"])
    .index("by_owner", ["ownerEmail"]),

  profiles: defineTable({
    email: v.string(),
    name: v.string(),
    passwordHash: v.optional(v.string()),
    company: v.optional(v.string()),
    phone: v.optional(v.string()),
    photoStorageId: v.optional(v.string()),
    logoStorageId: v.optional(v.string()),
    role: v.optional(v.string()),
    lastLoginAt: v.optional(v.number()),
    loginCount: v.optional(v.number()),
    updatedAt: v.number(),
  }).index("by_email", ["email"]),

  shares: defineTable({
    token: v.string(),
    flowKey: v.string(),
    emails: v.array(v.string()),
    canEdit: v.boolean(),
    active: v.optional(v.boolean()),
    createdBy: v.optional(v.string()),
    updatedAt: v.number(),
  })
    .index("by_token", ["token"])
    .index("by_flow", ["flowKey"]),

  presence: defineTable({
    flowKey: v.string(),
    email: v.string(),
    name: v.string(),
    lastSeen: v.number(),
  })
    .index("by_flow", ["flowKey"])
    .index("by_flow_email", ["flowKey", "email"]),

  sessions: defineTable({
    email: v.string(),
    name: v.optional(v.string()),
    startedAt: v.number(),
    lastSeen: v.number(),
    userAgent: v.optional(v.string()),
    active: v.boolean(),
  }).index("by_email", ["email"]),

  auditLogs: defineTable({
    at: v.number(),
    actorEmail: v.string(),
    action: v.string(),
    entity: v.optional(v.string()),
    entityId: v.optional(v.string()),
    detail: v.optional(v.string()),
    meta: v.optional(v.any()),
  })
    .index("by_actor", ["actorEmail"])
    .index("by_action", ["action"]),

  systemBanners: defineTable({
    message: v.string(),
    level: v.string(),
    active: v.boolean(),
    createdBy: v.string(),
    createdAt: v.number(),
    expiresAt: v.optional(v.number()),
  }),
});
