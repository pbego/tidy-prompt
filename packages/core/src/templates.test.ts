import { describe, it, expect } from "vitest";
import { isBuiltinTag, getTagDefinition } from "./tags.js";
import {
  PROMPT_TEMPLATES,
  DEFAULT_TEMPLATE_ID,
  createPromptFromTemplate,
  getTemplate,
} from "./templates.js";
import { createStarterPrompt } from "./starter.js";

describe("prompt templates", () => {
  it("offers the six starting points, with the task brief first", () => {
    expect(PROMPT_TEMPLATES.map((t) => t.id)).toEqual([
      "task",
      "research",
      "build",
      "debug",
      "review",
      "blank",
    ]);
    expect(DEFAULT_TEMPLATE_ID).toBe("task");
  });

  it("uses only tags the registry knows, each at most once", () => {
    for (const template of PROMPT_TEMPLATES) {
      const tags = template.blocks.map((b) => b.tag);
      expect(new Set(tags).size, template.id).toBe(tags.length);
      for (const tag of tags) expect(isBuiltinTag(tag), `${template.id}: ${tag}`).toBe(true);
    }
  });

  it("builds blocks in registry order, so material comes before the ask", () => {
    for (const template of PROMPT_TEMPLATES) {
      const orders = createPromptFromTemplate(template.id).blocks.map(
        (b) => getTagDefinition(b.tag)!.defaultOrder,
      );
      expect(orders, template.id).toEqual([...orders].sort((a, b) => a - b));
    }
  });

  it("starts every block empty and switches on only what the template marks", () => {
    for (const template of PROMPT_TEMPLATES) {
      const prompt = createPromptFromTemplate(template.id);
      expect(prompt.blocks.every((b) => b.content === ""), template.id).toBe(true);
      const on = prompt.blocks.filter((b) => b.enabled).map((b) => b.tag);
      const expected = template.blocks.filter((b) => b.on).map((b) => b.tag);
      expect(new Set(on), template.id).toEqual(new Set(expected));
    }
  });

  it("always switches the main task on, except in the blank template", () => {
    for (const template of PROMPT_TEMPLATES.filter((t) => t.id !== "blank")) {
      const task = createPromptFromTemplate(template.id).blocks.find((b) => b.tag === "instructions");
      expect(task?.enabled, template.id).toBe(true);
    }
  });

  it("has no blocks in the blank template", () => {
    expect(createPromptFromTemplate("blank").blocks).toEqual([]);
  });

  it("falls back to the task brief for an unknown id", () => {
    expect(createPromptFromTemplate("nope").blocks.map((b) => b.tag)).toEqual(
      createPromptFromTemplate("task").blocks.map((b) => b.tag),
    );
    expect(getTemplate("nope")).toBeUndefined();
  });

  it("gives every block a fresh id on each call", () => {
    const a = createPromptFromTemplate("build");
    const b = createPromptFromTemplate("build");
    const ids = [...a.blocks, ...b.blocks].map((block) => block.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("makes the starter prompt the task brief", () => {
    expect(createStarterPrompt().blocks.map((b) => [b.tag, b.enabled])).toEqual([
      ["context", false],
      ["instructions", true],
      ["constraints", false],
      ["output_format", false],
    ]);
  });
});
