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
    updatedAt: v.number(),
  }).index("by_email", ["email"]),
  shares: defineTable({
    token: v.string(),
    flowKey: v.string(),
    emails: v.array(v.string()),
    canEdit: v.boolean(),
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
  }).index("by_flow", ["flowKey"]),
});
