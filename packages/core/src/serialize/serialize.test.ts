import { describe, it, expect } from "vitest";
import { createBlock, SCHEMA_VERSION, type Prompt } from "../types.js";
import { serializeXml } from "./xml.js";
import { serializeMarkdown } from "./markdown.js";
import { serializeJsonObject, toMessagesRequest } from "./json.js";

const promptOf = (...blocks: Parameters<typeof createBlock>[0][]): Prompt => ({
  schemaVersion: SCHEMA_VERSION,
  blocks: blocks.map(createBlock),
});

describe("serializeXml", () => {
  it("puts a single-line value inline", () => {
    const xml = serializeXml(promptOf({ tag: "role", content: "You are a senior engineer." }));
    expect(xml).toBe("<role>You are a senior engineer.</role>");
  });

  it("puts multi-line content between tags on its own lines", () => {
    const xml = serializeXml(promptOf({ tag: "instructions", content: "First line.\nSecond line." }));
    expect(xml).toBe("<instructions>\nFirst line.\nSecond line.\n</instructions>");
  });

  it("separates top-level blocks with a blank line", () => {
    const xml = serializeXml(
      promptOf({ tag: "role", content: "a" }, { tag: "context", content: "b" }),
    );
    expect(xml).toBe("<role>a</role>\n\n<context>b</context>");
  });

  it("omits disabled blocks", () => {
    const xml = serializeXml(
      promptOf(
        { tag: "role", content: "kept" },
        { tag: "context", content: "dropped", enabled: false },
      ),
    );
    expect(xml).toBe("<role>kept</role>");
  });

  it("omits blocks with no content and no renderable children", () => {
    const xml = serializeXml(
      promptOf({ tag: "role", content: "kept" }, { tag: "context", content: "   " }),
    );
    expect(xml).toBe("<role>kept</role>");
  });

  it("indents child tags and keeps a container with only children", () => {
    const prompt: Prompt = {
      schemaVersion: SCHEMA_VERSION,
      blocks: [
        createBlock({
          tag: "examples",
          children: [
            createBlock({ tag: "example", content: "in -> out" }),
            createBlock({ tag: "example", content: "up -> down" }),
          ],
        }),
      ],
    };
    expect(serializeXml(prompt)).toBe(
      [
        "<examples>",
        "  <example>in -> out</example>",
        "  <example>up -> down</example>",
        "</examples>",
      ].join("\n"),
    );
  });

  it("leaves content indentation untouched by default", () => {
    const yaml = "spec:\n  replicas: 3";
    const xml = serializeXml(promptOf({ tag: "data", content: yaml }));
    expect(xml).toContain("spec:\n  replicas: 3");
  });

  it("re-indents content when asked to", () => {
    const xml = serializeXml(promptOf({ tag: "data", content: "line one\nline two" }), {
      indentContent: true,
    });
    expect(xml).toBe("<data>\n  line one\n  line two\n</data>");
  });

  it("leaves pasted markup exactly as typed", () => {
    const xml = serializeXml(promptOf({ tag: "existing_code", content: "<div>\n  hi\n</div>" }));
    expect(xml).toBe("<existing_code>\n<div>\n  hi\n</div>\n</existing_code>");
  });

  it("does not turn code or prose into entities", () => {
    const code = "if (a && b) { run(); }\nconst x = a < b ? 1 : 2;";
    expect(serializeXml(promptOf({ tag: "existing_code", content: code }))).toBe(
      `<existing_code>\n${code}\n</existing_code>`,
    );
    expect(serializeXml(promptOf({ tag: "context", content: "Tom & Jerry" }))).toBe(
      "<context>Tom & Jerry</context>",
    );
  });

  it("wraps content in CDATA only when it would close its own block", () => {
    const xml = serializeXml(promptOf({ tag: "data", content: "before </data> after" }));
    expect(xml).toBe("<data><![CDATA[before </data> after]]></data>");
  });

  it("guards a child's text against closing the container around it", () => {
    const prompt: Prompt = {
      schemaVersion: SCHEMA_VERSION,
      blocks: [
        createBlock({
          tag: "acceptance_criteria",
          children: [createBlock({ tag: "criterion", content: "ok </acceptance_criteria> then" })],
        }),
      ],
    };
    expect(serializeXml(prompt)).toContain(
      "<criterion><![CDATA[ok </acceptance_criteria> then]]></criterion>",
    );
  });

  it("produces escaped, well-formed text on request", () => {
    const xml = serializeXml(promptOf({ tag: "context", content: "Tom & Jerry <3" }), {
      strategy: "escape",
    });
    expect(xml).toBe("<context>Tom &amp; Jerry &lt;3</context>");
  });

  it("renders attributes, escaping their values", () => {
    const xml = serializeXml(
      promptOf({ tag: "example", content: "x", attributes: { index: "1", label: 'a "b"' } }),
    );
    expect(xml).toBe('<example index="1" label="a &quot;b&quot;">x</example>');
  });

  it("respects a custom indent width", () => {
    const prompt: Prompt = {
      schemaVersion: SCHEMA_VERSION,
      blocks: [
        createBlock({
          tag: "examples",
          children: [createBlock({ tag: "example", content: "x" })],
        }),
      ],
    };
    expect(serializeXml(prompt, { indent: 4 })).toContain("    <example>x</example>");
  });
});

describe("serializeMarkdown", () => {
  it("renders top-level blocks as h2 with humanized labels", () => {
    const md = serializeMarkdown(
      promptOf({ tag: "output_format", content: "A unified diff." }),
    );
    expect(md).toBe("## Output format\n\nA unified diff.");
  });

  it("nests children one heading level deeper", () => {
    const prompt: Prompt = {
      schemaVersion: SCHEMA_VERSION,
      blocks: [
        createBlock({
          tag: "examples",
          children: [createBlock({ tag: "example", content: "in -> out" })],
        }),
      ],
    };
    expect(serializeMarkdown(prompt)).toBe("## Examples\n\n### Example\n\nin -> out");
  });

  it("honours a custom base level", () => {
    const md = serializeMarkdown(promptOf({ tag: "context", content: "x" }), { baseLevel: 1 });
    expect(md.startsWith("# Context")).toBe(true);
  });

  it("humanizes an unknown custom tag", () => {
    const md = serializeMarkdown(promptOf({ tag: "rollout_plan", content: "x" }));
    expect(md.startsWith("## Rollout plan")).toBe(true);
  });

  it("skips disabled and empty blocks like the XML output does", () => {
    const md = serializeMarkdown(
      promptOf(
        { tag: "context", content: "kept" },
        { tag: "data", content: "dropped", enabled: false },
        { tag: "role", content: "" },
      ),
    );
    expect(md).toBe("## Context\n\nkept");
  });
});

describe("serializeJsonObject", () => {
  it("keys content by tag name", () => {
    expect(
      serializeJsonObject(
        promptOf({ tag: "instructions", content: "Build it." }, { tag: "context", content: "Why." }),
      ),
    ).toEqual({ instructions: "Build it.", context: "Why." });
  });

  it("collapses a container of same-tagged children into an array", () => {
    const prompt: Prompt = {
      schemaVersion: SCHEMA_VERSION,
      blocks: [
        createBlock({
          tag: "requirements",
          children: [
            createBlock({ tag: "requirement", content: "One." }),
            createBlock({ tag: "requirement", content: "Two." }),
          ],
        }),
      ],
    };
    expect(serializeJsonObject(prompt)).toEqual({ requirements: ["One.", "Two."] });
  });

  it("collapses repeated top-level tags into an array", () => {
    expect(
      serializeJsonObject(promptOf({ tag: "context", content: "a" }, { tag: "context", content: "b" })),
    ).toEqual({ context: ["a", "b"] });
  });

  it("keeps a block's own text separate from its children", () => {
    const prompt: Prompt = {
      schemaVersion: SCHEMA_VERSION,
      blocks: [
        createBlock({
          tag: "requirements",
          content: "Must hold overall:",
          children: [createBlock({ tag: "requirement", content: "One." })],
        }),
      ],
    };
    expect(serializeJsonObject(prompt)).toEqual({
      requirements: { content: "Must hold overall:", requirement: "One." },
    });
  });

  it("omits disabled blocks", () => {
    expect(
      serializeJsonObject(
        promptOf({ tag: "context", content: "kept" }, { tag: "data", content: "x", enabled: false }),
      ),
    ).toEqual({ context: "kept" });
  });
});

describe("toMessagesRequest", () => {
  it("puts only a role in the system prompt; the material and the task go in the user turn", () => {
    const request = toMessagesRequest(
      promptOf(
        { tag: "role", content: "You are an engineer." },
        { tag: "code", content: "const a = 1;" },
        { tag: "data", content: "rows" },
        { tag: "task", content: "Refactor it." },
      ),
    );
    expect(request.system).toBe("<role>You are an engineer.</role>");
    expect(request.messages).toHaveLength(1);
    expect(request.messages[0]!.role).toBe("user");
    expect(request.messages[0]!.content).toBe(
      "<code>const a = 1;</code>\n\n<data>rows</data>\n\n<task>Refactor it.</task>",
    );
  });

  it("sends a brief with no role as one user message and no system prompt", () => {
    const request = toMessagesRequest(
      promptOf({ tag: "context", content: "Why." }, { tag: "task", content: "Do it." }),
    );
    expect(request.system).toBeUndefined();
    expect(request.messages[0]!.content).toBe("<context>Why.</context>\n\n<task>Do it.</task>");
  });

  it("defaults to a current model and an explicit max_tokens", () => {
    const request = toMessagesRequest(promptOf({ tag: "data", content: "x" }));
    expect(request.model).toBe("claude-opus-5-5");
    expect(request.max_tokens).toBe(4096);
  });

  it("honours model, max_tokens and a custom system tag set", () => {
    const request = toMessagesRequest(
      promptOf({ tag: "role", content: "r" }, { tag: "task", content: "t" }),
      { model: "claude-sonnet-5", maxTokens: 1024, systemTags: ["task"] },
    );
    expect(request.model).toBe("claude-sonnet-5");
    expect(request.max_tokens).toBe(1024);
    expect(request.system).toBe("<task>t</task>");
    expect(request.messages[0]!.content).toBe("<role>r</role>");
  });

  it("moves everything to the user message when nothing else is left", () => {
    const request = toMessagesRequest(promptOf({ tag: "role", content: "r" }));
    expect(request.system).toBeUndefined();
    expect(request.messages[0]!.content).toBe("<role>r</role>");
  });
});
