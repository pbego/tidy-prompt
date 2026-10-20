import { describe, it, expect } from "vitest";
import { BUILTIN_TAGS, isBuiltinTag, getTagDefinition } from "./tags.js";
import {
  PROMPT_TEMPLATES,
  DEFAULT_TEMPLATE_ID,
  createPromptFromTemplate,
  getTemplate,
} from "./templates.js";
import { createStarterPrompt } from "./starter.js";

const tagsOf = (id: string) => createPromptFromTemplate(id).blocks.map((b) => b.tag);

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

  it("lays every template out in the order the registry gives", () => {
    for (const template of PROMPT_TEMPLATES) {
      const orders = createPromptFromTemplate(template.id).blocks.map(
        (b) => getTagDefinition(b.tag)!.defaultOrder,
      );
      expect(orders, template.id).toEqual([...orders].sort((a, b) => a - b));
    }
  });

  it("lays out each template as pasted material, the task, then the rest", () => {
    expect(tagsOf("task")).toEqual(["task", "context", "references", "requirements"]);
    expect(tagsOf("research")).toEqual(["data", "task", "context", "references"]);
    expect(tagsOf("build")).toEqual([
      "code",
      "task",
      "context",
      "references",
      "requirements",
      "out_of_scope",
    ]);
    expect(tagsOf("debug")).toEqual([
      "code",
      "task",
      "symptoms",
      "expected_behavior",
      "reproduction",
      "context",
      "references",
    ]);
    expect(tagsOf("review")).toEqual(["code", "task", "review_focus", "context", "references"]);
  });

  it("opens every template on the task, unless something is pasted in above it", () => {
    for (const template of PROMPT_TEMPLATES.filter((t) => t.id !== "blank")) {
      const first = tagsOf(template.id)[0]!;
      expect(["task", "code", "data"], template.id).toContain(first);
      if (first !== "task") expect(tagsOf(template.id)[1], template.id).toBe("task");
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

  it("always switches the task on, except in the blank template", () => {
    for (const template of PROMPT_TEMPLATES.filter((t) => t.id !== "blank")) {
      const task = createPromptFromTemplate(template.id).blocks.find((b) => b.tag === "task");
      expect(task?.enabled, template.id).toBe(true);
    }
  });

  it("offers references, switched off, in every template but the blank one", () => {
    for (const template of PROMPT_TEMPLATES.filter((t) => t.id !== "blank")) {
      const block = createPromptFromTemplate(template.id).blocks.find((b) => b.tag === "references");
      expect(block, template.id).toBeDefined();
      expect(block?.enabled, template.id).toBe(false);
    }
  });

  it("includes every tag that belongs to a template, switched on", () => {
    for (const definition of BUILTIN_TAGS.filter((d) => d.templates)) {
      for (const id of definition.templates!) {
        const block = createPromptFromTemplate(id).blocks.find((b) => b.tag === definition.tag);
        expect(block, `${id}: ${definition.tag}`).toBeDefined();
        expect(block?.enabled, `${id}: ${definition.tag}`).toBe(true);
      }
    }
  });

  it("has no blocks in the blank template", () => {
    expect(createPromptFromTemplate("blank").blocks).toEqual([]);
  });

  it("falls back to the task brief for an unknown id", () => {
    expect(tagsOf("nope")).toEqual(tagsOf("task"));
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
      ["task", true],
      ["context", false],
      ["references", false],
      ["requirements", false],
    ]);
  });
});

describe("template vocabulary", () => {
  it("leaves out the tags that were cut", () => {
    const cut = ["constraints", "output_format", "instructions", "acceptance_criteria", "role"];
    for (const template of PROMPT_TEMPLATES) {
      const tags = template.blocks.map((b) => b.tag);
      for (const tag of cut) expect(tags, `${template.id}: ${tag}`).not.toContain(tag);
    }
  });
});
