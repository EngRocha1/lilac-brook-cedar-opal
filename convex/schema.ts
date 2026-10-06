import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  flows: defineTable({
    key: v.string(),
    title: v.string(),
    ownerEmail: v.optional(v.string()),
    data: v.any(),
    updatedAt: v.number(),
  })
    .index("by_key", ["key"])
    .index("by_owner", ["ownerEmail"]),
  profiles: defineTable({
    email: v.string(),
    name: v.string(),
    updatedAt: v.number(),
  }).index("by_email", ["email"]),
});
