import { describe, it, expect } from "vitest";
import { BUILTIN_TAGS, DEFAULT_SYSTEM_TAGS, getTagDefinition, isBuiltinTag } from "./tags.js";

const orderOf = (tag: string) => getTagDefinition(tag)!.defaultOrder;

describe("built-in tag order", () => {
  it("lists the registry in the same order as defaultOrder", () => {
    const orders = BUILTIN_TAGS.map((t) => t.defaultOrder);
    expect(orders).toEqual([...orders].sort((a, b) => a - b));
  });

  it("gives every tag a distinct position", () => {
    expect(new Set(BUILTIN_TAGS.map((t) => t.defaultOrder)).size).toBe(BUILTIN_TAGS.length);
  });

  it("puts material the model reads before the instructions that act on it", () => {
    for (const material of ["context", "codebase", "tech_stack", "existing_code", "data"]) {
      expect(orderOf(material), material).toBeLessThan(orderOf("instructions"));
    }
  });

  it("keeps the ask after the material, with the output shape last", () => {
    for (const ask of ["requirements", "acceptance_criteria", "constraints", "approach"]) {
      expect(orderOf(ask), ask).toBeGreaterThan(orderOf("instructions"));
    }
    const last = BUILTIN_TAGS[BUILTIN_TAGS.length - 1]!;
    expect(last.tag).toBe("output_format");
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
