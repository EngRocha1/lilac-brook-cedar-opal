import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  flows: defineTable({
    key: v.string(),
    data: v.any(),
    updatedAt: v.number(),
  }).index("by_key", ["key"]),
});
