import { describe, it, expect } from "vitest";
import { parsePromptDocument, toPromptDocument } from "./document.js";
import { createBlock, SCHEMA_VERSION, type Prompt } from "./types.js";
import { createStarterPrompt } from "./starter.js";

describe("prompt documents", () => {
  const prompt: Prompt = {
    schemaVersion: SCHEMA_VERSION,
    blocks: [
      createBlock({ tag: "instructions", content: "Build it." }),
      createBlock({
        tag: "examples",
        children: [createBlock({ tag: "example", content: "in -> out" })],
      }),
      createBlock({ tag: "context", content: "off", enabled: false }),
    ],
  };

  it("round-trips through export and import unchanged", () => {
    const result = parsePromptDocument(toPromptDocument(prompt, "my brief"));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.document.name).toBe("my brief");
    expect(result.document.prompt).toEqual(prompt);
  });

  it("accepts a bare prompt without the document wrapper", () => {
    const result = parsePromptDocument(JSON.stringify(prompt));
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.document.prompt.blocks).toHaveLength(3);
  });

  it("generates ids for blocks that lack them", () => {
    const result = parsePromptDocument('{"blocks":[{"tag":"context","content":"x"}]}');
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.document.prompt.blocks[0]!.id).toMatch(/.+/);
  });

  it("treats a missing enabled flag as enabled", () => {
    const result = parsePromptDocument('{"blocks":[{"tag":"context","content":"x"}]}');
    if (result.ok) expect(result.document.prompt.blocks[0]!.enabled).toBe(true);
  });

  it("drops entries that are not blocks", () => {
    const result = parsePromptDocument('{"blocks":[{"tag":"ok","content":"x"},null,{"content":"no tag"}]}');
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.document.prompt.blocks).toHaveLength(1);
  });

  it("reports malformed JSON rather than throwing", () => {
    const result = parsePromptDocument("{not json");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("Not valid JSON");
  });

  it("reports a missing blocks array", () => {
    const result = parsePromptDocument('{"name":"x"}');
    expect(result.ok).toBe(false);
  });

  it("refuses a schema version it does not understand", () => {
    const result = parsePromptDocument('{"schemaVersion":99,"blocks":[]}');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("schemaVersion");
  });
});

describe("createStarterPrompt", () => {
  it("opens as the task brief: every block empty, only the task switched on", () => {
    const prompt = createStarterPrompt();
    expect(prompt.blocks.map((b) => b.tag)).toEqual([
      "task",
      "context",
      "references",
      "requirements",
    ]);
    expect(prompt.blocks.every((b) => b.content === "")).toBe(true);
    expect(prompt.blocks.filter((b) => b.enabled).map((b) => b.tag)).toEqual(["task"]);
  });

  it("gives every block a distinct id", () => {
    const prompt = createStarterPrompt();
    expect(new Set(prompt.blocks.map((b) => b.id)).size).toBe(prompt.blocks.length);
  });
});
