import { describe, it, expect } from "vitest";
import { validateTagName, isValidTagName, suggestTagName, validatePrompt } from "./validate.js";
import { createBlock, SCHEMA_VERSION, type Prompt } from "./types.js";

const promptOf = (...blocks: Parameters<typeof createBlock>[0][]): Prompt => ({
  schemaVersion: SCHEMA_VERSION,
  blocks: blocks.map(createBlock),
});

describe("validateTagName", () => {
  it("accepts ordinary tag names", () => {
    for (const tag of ["instructions", "output_format", "step-1", "a.b", "_private"]) {
      expect(isValidTagName(tag)).toBe(true);
    }
  });

  it("rejects empty, spaced, punctuated and digit-leading names", () => {
    expect(validateTagName("")?.code).toBe("empty-tag-name");
    expect(validateTagName("   ")?.code).toBe("empty-tag-name");
    expect(validateTagName("my tag")?.code).toBe("invalid-tag-name");
    expect(validateTagName("<tag>")?.code).toBe("invalid-tag-name");
    expect(validateTagName("1st")?.code).toBe("invalid-tag-name");
  });

  it("rejects the reserved xml prefix in any case", () => {
    expect(validateTagName("xmlThing")?.code).toBe("reserved-tag-name");
    expect(validateTagName("XMLNS")?.code).toBe("reserved-tag-name");
  });

  it("attaches the block id when given one", () => {
    expect(validateTagName("my tag", "block-1")?.blockId).toBe("block-1");
  });
});

describe("suggestTagName", () => {
  it("normalises free text into a usable tag", () => {
    expect(suggestTagName("Output Format")).toBe("output_format");
    expect(suggestTagName("  Acceptance Criteria!  ")).toBe("acceptance_criteria");
    expect(suggestTagName("123 steps")).toBe("steps");
  });
});

describe("validatePrompt", () => {
  it("returns nothing for a well-formed prompt", () => {
    const prompt = promptOf(
      { tag: "instructions", content: "Build the saved views feature." },
      { tag: "context", content: "Filters reset on reload." },
    );
    expect(validatePrompt(prompt)).toEqual([]);
  });

  it("flags an invalid tag name as an error against its block", () => {
    const prompt = promptOf({ tag: "my tag", content: "text" });
    const issues = validatePrompt(prompt);
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({
      severity: "error",
      code: "invalid-tag-name",
      blockId: prompt.blocks[0]!.id,
    });
  });

  it("warns about an enabled but empty block", () => {
    const issues = validatePrompt(promptOf({ tag: "context", content: "   " }));
    expect(issues.map((i) => i.code)).toContain("empty-block");
  });

  it("does not warn about an empty block that is disabled", () => {
    const issues = validatePrompt(promptOf({ tag: "context", content: "", enabled: false }));
    expect(issues.map((i) => i.code)).not.toContain("empty-block");
  });

  it("warns once about a repeated top-level tag", () => {
    const issues = validatePrompt(
      promptOf({ tag: "context", content: "a" }, { tag: "context", content: "b" }),
    );
    const duplicates = issues.filter((i) => i.code === "duplicate-tag");
    expect(duplicates).toHaveLength(1);
    expect(duplicates[0]!.message).toContain("2 times");
  });

  it("warns when content stops part-way through a tag", () => {
    const issues = validatePrompt(promptOf({ tag: "existing_code", content: "<div>hi</di" }));
    expect(issues.map((i) => i.code)).toContain("unbalanced-markup");
  });

  it("stays quiet on comparisons and arrows in ordinary code", () => {
    const issues = validatePrompt(
      promptOf({ tag: "existing_code", content: "if (a < b) return items.map((x) => x * 2);" }),
    );
    expect(issues.map((i) => i.code)).not.toContain("unbalanced-markup");
  });

  it("warns when the content already carries the tag the composer adds", () => {
    const issues = validatePrompt(
      promptOf({ tag: "instructions", content: "<instructions>Build it.</instructions>" }),
    );
    expect(issues.map((i) => i.code)).toContain("redundant-tag");
  });

  it("does not mistake a different tag in the content for a redundant wrapper", () => {
    const issues = validatePrompt(
      promptOf({ tag: "existing_code", content: "<div>hello</div>" }),
    );
    expect(issues.map((i) => i.code)).not.toContain("redundant-tag");
  });

  it("validates nested children too", () => {
    const child = createBlock({ tag: "bad name", content: "x" });
    const prompt: Prompt = {
      schemaVersion: SCHEMA_VERSION,
      blocks: [createBlock({ tag: "examples", children: [child] })],
    };
    const issues = validatePrompt(prompt);
    expect(issues.find((i) => i.code === "invalid-tag-name")?.blockId).toBe(child.id);
  });

  it("rejects invalid attribute names", () => {
    const prompt = promptOf({ tag: "example", content: "x", attributes: { "not ok": "1" } });
    expect(validatePrompt(prompt).map((i) => i.code)).toContain("invalid-attribute-name");
  });

  it("warns once the prompt passes the size threshold", () => {
    const prompt = promptOf({ tag: "data", content: "word ".repeat(500) });
    expect(validatePrompt(prompt, { largePromptThreshold: 100 }).map((i) => i.code)).toContain(
      "large-prompt",
    );
  });
});
