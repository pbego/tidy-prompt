import { describe, it, expect } from "vitest";
import { estimateTokens, estimateBlockTokens, estimatePromptTokens } from "./tokens.js";
import { createBlock, SCHEMA_VERSION, type Prompt } from "./types.js";

describe("estimateTokens", () => {
  it("is zero for empty text", () => {
    expect(estimateTokens("")).toBe(0);
  });

  it("scales roughly with length for prose", () => {
    const short = estimateTokens("Add a saved views feature to the dashboard.");
    const long = estimateTokens("Add a saved views feature to the dashboard. ".repeat(10));
    expect(short).toBeGreaterThan(0);
    expect(long).toBeGreaterThan(short * 8);
  });

  it("counts CJK characters far more heavily than chars/4 would", () => {
    const cjk = "保存したビューをダッシュボードに追加する";
    expect(estimateTokens(cjk)).toBeGreaterThanOrEqual(cjk.length);
  });
});

describe("estimateBlockTokens", () => {
  it("returns zero for a disabled block", () => {
    const block = createBlock({ tag: "context", content: "lots of words here", enabled: false });
    expect(estimateBlockTokens(block)).toBe(0);
  });

  it("includes children", () => {
    const withoutChildren = createBlock({ tag: "examples" });
    const withChildren = createBlock({
      tag: "examples",
      children: [createBlock({ tag: "example", content: "input -> output" })],
    });
    expect(estimateBlockTokens(withChildren)).toBeGreaterThan(estimateBlockTokens(withoutChildren));
  });
});

describe("estimatePromptTokens", () => {
  it("reports a per-block breakdown that sums to the total", () => {
    const a = createBlock({ tag: "instructions", content: "Build the thing." });
    const b = createBlock({ tag: "context", content: "It lands in the dashboard." });
    const prompt: Prompt = { schemaVersion: SCHEMA_VERSION, blocks: [a, b] };
    const estimate = estimatePromptTokens(prompt);
    expect(Object.keys(estimate.byBlock)).toEqual([a.id, b.id]);
    expect(estimate.byBlock[a.id]! + estimate.byBlock[b.id]!).toBe(estimate.total);
  });
});
