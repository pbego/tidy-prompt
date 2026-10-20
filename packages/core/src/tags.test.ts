import { describe, it, expect } from "vitest";
import {
  BUILTIN_TAGS,
  DEFAULT_SYSTEM_TAGS,
  builtinTagsFor,
  getTagDefinition,
  isBuiltinTag,
  isMaterialTag,
} from "./tags.js";

const orderOf = (tag: string) => getTagDefinition(tag)!.defaultOrder;

/** Pasted material: long enough to matter, so it sits above the task. */
const PASTED = ["code", "data"];

/** Where each tag sits in a prompt, first to last. */
const PROMPT_ORDER = [
  "code",
  "data",
  "task",
  "symptoms",
  "expected_behavior",
  "reproduction",
  "review_focus",
  "context",
  "references",
  "requirements",
  "examples",
  "out_of_scope",
];

/** The Add tag menu: everyday tags first, the ones tied to one kind of brief after. */
const MENU_ORDER = [
  "task",
  "context",
  "references",
  "requirements",
  "code",
  "data",
  "examples",
  "out_of_scope",
  "symptoms",
  "expected_behavior",
  "reproduction",
  "review_focus",
];

/** Cut as near-synonyms, or as tags that do not fit an agent brief. */
const REMOVED = [
  "role",
  "instructions",
  "sources",
  "codebase",
  "tech_stack",
  "existing_code",
  "changes",
  "acceptance_criteria",
  "constraints",
  "edge_cases",
  "testing",
  "approach",
  "output_format",
];

describe("the built-in vocabulary", () => {
  it("stays small", () => {
    expect(BUILTIN_TAGS.length).toBeLessThanOrEqual(12);
    expect(BUILTIN_TAGS.map((t) => t.tag).sort()).toEqual([...PROMPT_ORDER].sort());
  });

  it("no longer carries the near-synonyms it replaced", () => {
    for (const tag of REMOVED) expect(isBuiltinTag(tag), tag).toBe(false);
  });

  it("describes references as pointers and data as pasted material", () => {
    expect(getTagDefinition("references")!.description).toMatch(/where to look/i);
    expect(getTagDefinition("data")!.description).toMatch(/pasted/i);
  });

  it("makes requirements the place for 'done when'", () => {
    expect(getTagDefinition("requirements")!.description).toMatch(/done/i);
    expect(getTagDefinition("requirements")!.container).toBe(true);
  });
});

describe("where a block sits in the prompt", () => {
  const byPosition = () =>
    [...BUILTIN_TAGS].sort((a, b) => a.defaultOrder - b.defaultOrder).map((t) => t.tag);

  it("gives every tag a distinct position", () => {
    expect(new Set(BUILTIN_TAGS.map((t) => t.defaultOrder)).size).toBe(BUILTIN_TAGS.length);
  });

  it("runs pasted material, the task, what a brief centres on, then the background and the rest", () => {
    expect(byPosition()).toEqual(PROMPT_ORDER);
  });

  it("puts pasted material above the task", () => {
    for (const tag of PASTED) expect(orderOf(tag), tag).toBeLessThan(orderOf("task"));
  });

  it("puts everything else after the task, so a brief with nothing pasted in reads task first", () => {
    for (const tag of PROMPT_ORDER.filter((t) => !PASTED.includes(t) && t !== "task")) {
      expect(orderOf(tag), tag).toBeGreaterThan(orderOf("task"));
    }
  });

  it("keeps the bug report and the review focus right behind the task, ahead of the background", () => {
    for (const tag of ["symptoms", "expected_behavior", "reproduction", "review_focus"]) {
      expect(orderOf(tag), tag).toBeLessThan(orderOf("context"));
    }
  });
});

describe("the Add tag menu order", () => {
  it("lists the everyday tags first, with the task at the top", () => {
    expect(BUILTIN_TAGS.map((t) => t.tag)).toEqual(MENU_ORDER);
    expect(BUILTIN_TAGS[0]!.tag).toBe("task");
  });

  it("puts the tags tied to one kind of brief after the general ones", () => {
    const tied = BUILTIN_TAGS.findIndex((t) => t.templates);
    expect(BUILTIN_TAGS.slice(0, tied).every((t) => !t.templates)).toBe(true);
    expect(BUILTIN_TAGS.slice(tied).every((t) => t.templates)).toBe(true);
  });
});

describe("isMaterialTag", () => {
  it("is true for exactly the pasted material that sits above the task", () => {
    expect(BUILTIN_TAGS.map((t) => t.tag).filter(isMaterialTag)).toEqual(PASTED);
  });

  it("is false for the task, everything after it, and tags it does not know", () => {
    for (const tag of PROMPT_ORDER.filter((t) => !PASTED.includes(t))) {
      expect(isMaterialTag(tag), tag).toBe(false);
    }
    expect(isMaterialTag("role")).toBe(false);
    expect(isMaterialTag("rollout_plan")).toBe(false);
  });
});

describe("builtinTagsFor", () => {
  const names = (templateId: string | null) => builtinTagsFor(templateId).map((t) => t.tag);
  const GENERAL = MENU_ORDER.slice(0, 8);

  it("offers the general tags everywhere, in menu order", () => {
    for (const templateId of [null, "task", "build", "debug", "review", "research", "blank"]) {
      expect(names(templateId).slice(0, 8), String(templateId)).toEqual(GENERAL);
    }
  });

  it("offers the bug-report tags only in the debug template", () => {
    const bug = ["symptoms", "expected_behavior", "reproduction"];
    for (const tag of bug) expect(names("debug")).toContain(tag);
    for (const templateId of [null, "task", "build", "review", "research", "blank"]) {
      for (const tag of bug) expect(names(templateId), `${templateId}: ${tag}`).not.toContain(tag);
    }
  });

  it("offers the review focus only in the review template", () => {
    expect(names("review")).toContain("review_focus");
    expect(names("debug")).not.toContain("review_focus");
    expect(names(null)).not.toContain("review_focus");
  });

  it("keeps a template-only tag's definition available for lookup", () => {
    expect(getTagDefinition("symptoms")!.placeholder).toBeTruthy();
    expect(isBuiltinTag("review_focus")).toBe(true);
  });
});

describe("system routing", () => {
  it("sends only a hand-typed role to the system prompt", () => {
    expect(DEFAULT_SYSTEM_TAGS).toEqual(["role"]);
  });

  it("routes no built-in tag to the system prompt", () => {
    for (const { tag } of BUILTIN_TAGS) expect(DEFAULT_SYSTEM_TAGS, tag).not.toContain(tag);
  });
});
