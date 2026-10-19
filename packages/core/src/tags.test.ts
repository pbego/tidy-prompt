import { describe, it, expect } from "vitest";
import {
  BUILTIN_TAGS,
  DEFAULT_SYSTEM_TAGS,
  getTagDefinition,
  isBuiltinTag,
  isMaterialTag,
} from "./tags.js";

const orderOf = (tag: string) => getTagDefinition(tag)!.defaultOrder;

const MATERIAL = [
  "context",
  "sources",
  "symptoms",
  "expected_behavior",
  "reproduction",
  "codebase",
  "tech_stack",
  "existing_code",
  "changes",
  "data",
];

describe("built-in tag order", () => {
  it("lists the registry in the same order as defaultOrder", () => {
    const orders = BUILTIN_TAGS.map((t) => t.defaultOrder);
    expect(orders).toEqual([...orders].sort((a, b) => a - b));
  });

  it("gives every tag a distinct position", () => {
    expect(new Set(BUILTIN_TAGS.map((t) => t.defaultOrder)).size).toBe(BUILTIN_TAGS.length);
  });

  it("puts material the model reads before the instructions that act on it", () => {
    for (const material of MATERIAL) {
      expect(orderOf(material), material).toBeLessThan(orderOf("instructions"));
    }
  });

  it("keeps the ask after the material, with the output shape last", () => {
    for (const ask of ["review_focus", "requirements", "acceptance_criteria", "constraints", "approach"]) {
      expect(orderOf(ask), ask).toBeGreaterThan(orderOf("instructions"));
    }
    const last = BUILTIN_TAGS[BUILTIN_TAGS.length - 1]!;
    expect(last.tag).toBe("output_format");
  });
});

describe("isMaterialTag", () => {
  it("is true for exactly the tags that sit between the role and the instructions", () => {
    expect(BUILTIN_TAGS.map((t) => t.tag).filter(isMaterialTag)).toEqual(MATERIAL);
  });

  it("is false for the role, the ask and tags it does not know", () => {
    expect(isMaterialTag("role")).toBe(false);
    expect(isMaterialTag("instructions")).toBe(false);
    expect(isMaterialTag("constraints")).toBe(false);
    expect(isMaterialTag("rollout_plan")).toBe(false);
  });
});

describe("approach tag", () => {
  it("replaces the old thinking tag", () => {
    expect(isBuiltinTag("approach")).toBe(true);
    expect(isBuiltinTag("thinking")).toBe(false);
  });

  it("is routed to the system prompt like the other standing guidance", () => {
    expect(DEFAULT_SYSTEM_TAGS).toContain("approach");
    expect(DEFAULT_SYSTEM_TAGS).not.toContain("thinking");
  });
});
