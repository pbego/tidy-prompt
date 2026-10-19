import { describe, it, expect } from "vitest";
import { suggestImprovements } from "./suggest.js";
import { createBlock, SCHEMA_VERSION, type CreateBlockInput, type Prompt } from "./types.js";

const promptOf = (...blocks: CreateBlockInput[]): Prompt => ({
  schemaVersion: SCHEMA_VERSION,
  blocks: blocks.map((input) => createBlock(input)),
});

const codes = (prompt: Prompt) => suggestImprovements(prompt).map((h) => h.code);

const GOOD_TASK =
  "Add a saved-views feature to the dashboard so users can name a filter set and reload it later.";

describe("suggestImprovements", () => {
  it("says nothing about an empty prompt", () => {
    expect(suggestImprovements(promptOf())).toEqual([]);
    expect(
      suggestImprovements(promptOf({ tag: "task" }, { tag: "context", enabled: false })),
    ).toEqual([]);
  });

  it("flags a task that is only a phrase, and points at its block", () => {
    const prompt = promptOf({ tag: "task", content: "Fix the login bug" });
    const hints = suggestImprovements(prompt);
    expect(hints.map((h) => h.code)).toContain("thin-task");
    const thin = hints.find((h) => h.code === "thin-task")!;
    expect(thin.severity).toBe("hint");
    expect(thin.blockId).toBe(prompt.blocks[0]!.id);
    expect(thin.message).toContain("4 words");
  });

  it("does not call a full sentence thin", () => {
    expect(codes(promptOf({ tag: "task", content: GOOD_TASK }))).not.toContain("thin-task");
  });

  it("flags wording that leaves the model to guess, naming the phrase", () => {
    const hints = suggestImprovements(
      promptOf({ tag: "task", content: `${GOOD_TASK} Handle errors, retries etc.` }),
    );
    const vague = hints.find((h) => h.code === "vague-wording");
    expect(vague?.message).toContain("etc.");
  });

  it("leaves ordinary words alone", () => {
    const content = `${GOOD_TASK} Improve the empty state and keep the code clean.`;
    expect(codes(promptOf({ tag: "task", content }))).not.toContain("vague-wording");
  });

  it("asks how to tell the work is done when nothing says so", () => {
    expect(codes(promptOf({ tag: "task", content: GOOD_TASK }))).toContain("no-done-check");
  });

  it("is satisfied by requirements, an expected behaviour, or a review focus", () => {
    for (const tag of ["requirements", "expected_behavior", "review_focus"]) {
      const prompt = promptOf(
        { tag: "task", content: GOOD_TASK },
        { tag, content: "Something concrete." },
      );
      expect(codes(prompt), tag).not.toContain("no-done-check");
    }
  });

  it("counts requirements written as child blocks", () => {
    const criterion = createBlock({ tag: "requirement", content: "Reload keeps the views." });
    const prompt: Prompt = {
      schemaVersion: SCHEMA_VERSION,
      blocks: [
        createBlock({ tag: "task", content: GOOD_TASK }),
        createBlock({ tag: "requirements", children: [criterion] }),
      ],
    };
    expect(codes(prompt)).not.toContain("no-done-check");
  });

  it("ignores a done-check that is switched off or empty", () => {
    const prompt = promptOf(
      { tag: "task", content: GOOD_TASK },
      { tag: "requirements", content: "Cover the duplicate-name path.", enabled: false },
      { tag: "expected_behavior" },
    );
    expect(codes(prompt)).toContain("no-done-check");
  });

  it("does not ask for a done-check on a task already flagged as too thin", () => {
    expect(codes(promptOf({ tag: "task", content: "Fix it" }))).not.toContain("no-done-check");
  });

  it("notices pasted material with no task", () => {
    const code = "const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);";
    const prompt = promptOf({ tag: "code", content: `${code}\n${code}` });
    const hint = suggestImprovements(prompt).find((h) => h.code === "material-without-task");
    expect(hint?.blockId).toBe(prompt.blocks[0]!.id);
  });

  it("stays quiet about a short note of background", () => {
    expect(codes(promptOf({ tag: "context", content: "Weekly releases." }))).toEqual([]);
  });

  it("also recognises the names people type by hand", () => {
    expect(codes(promptOf({ tag: "instructions", content: "Fix it" }))).toContain("thin-task");
    for (const tag of ["acceptance_criteria", "testing", "output_format"]) {
      const prompt = promptOf(
        { tag: "task", content: GOOD_TASK },
        { tag, content: "Something concrete." },
      );
      expect(codes(prompt), tag).not.toContain("no-done-check");
    }
  });
});
