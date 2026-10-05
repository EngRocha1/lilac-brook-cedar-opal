import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  flows: defineTable({
    key: v.string(),
    title: v.string(),
    version: v.number(),
    updatedAt: v.number(),
  }).index("by_key", ["key"]),
  macros: defineTable({
    flowId: v.id("flows"),
    key: v.string(),
    title: v.string(),
    x: v.number(),
    y: v.number(),
    w: v.number(),
    h: v.number(),
    color: v.string(),
    border: v.string(),
  }).index("by_flow", ["flowId"]),
  nodes: defineTable({
    flowId: v.id("flows"),
    key: v.string(),
    macroKey: v.optional(v.string()),
    type: v.string(),
    title: v.string(),
    x: v.number(),
    y: v.number(),
    w: v.number(),
    h: v.number(),
    style: v.optional(v.string()),
  }).index("by_flow", ["flowId"]),
  edges: defineTable({
    flowId: v.id("flows"),
    key: v.string(),
    fromKey: v.string(),
    toKey: v.string(),
    label: v.optional(v.string()),
    color: v.optional(v.string()),
    points: v.array(v.object({ x: v.number(), y: v.number() })),
  }).index("by_flow", ["flowId"]),
  comments: defineTable({
    flowId: v.id("flows"),
    targetType: v.string(),
    targetKey: v.string(),
    text: v.string(),
    userId: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_target", ["flowId", "targetType", "targetKey"]),
  votes: defineTable({
    flowId: v.id("flows"),
    targetType: v.string(),
    targetKey: v.string(),
    userId: v.string(),
    value: v.union(v.literal("ok"), v.literal("no")),
    updatedAt: v.number(),
  }).index("by_target", ["flowId", "targetType", "targetKey"])
    .index("by_user_target", ["flowId", "userId", "targetType", "targetKey"]),
});
