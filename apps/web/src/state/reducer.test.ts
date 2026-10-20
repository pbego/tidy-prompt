import { describe, it, expect } from "vitest";
import { createBlock, createPromptFromTemplate, SCHEMA_VERSION, type Prompt } from "@tidy-prompt/core";
import { initialState, reducer, type State } from "./reducer.js";

function stateWith(...tags: string[]): State {
  const prompt: Prompt = {
    schemaVersion: SCHEMA_VERSION,
    blocks: tags.map((tag) => createBlock({ tag, content: tag })),
  };
  return initialState(prompt);
}

const tagsOf = (state: State) => state.prompt.blocks.map((b) => b.tag);

describe("add-block", () => {
  it("inserts a built-in tag in its natural position rather than at the end", () => {
    // requirements belongs between the task and what is out of scope.
    const next = reducer(stateWith("task", "out_of_scope"), {
      type: "add-block",
      tag: "requirements",
    });
    expect(tagsOf(next)).toEqual(["task", "requirements", "out_of_scope"]);
  });

  it("puts pasted material above the task, not below it", () => {
    let state = stateWith("task", "out_of_scope");
    state = reducer(state, { type: "add-block", tag: "data" });
    state = reducer(state, { type: "add-block", tag: "code" });
    expect(tagsOf(state)).toEqual(["code", "data", "task", "out_of_scope"]);
  });

  it("puts the task ahead of the background, whichever is added first", () => {
    let state = reducer(stateWith(), { type: "add-block", tag: "context" });
    state = reducer(state, { type: "add-block", tag: "task" });
    expect(tagsOf(state)).toEqual(["task", "context"]);
  });

  it("appends an unknown custom tag and remembers it", () => {
    const next = reducer(stateWith("instructions"), { type: "add-block", tag: "rollout_plan" });
    expect(tagsOf(next)).toEqual(["instructions", "rollout_plan"]);
    expect(next.customTags).toEqual(["rollout_plan"]);
  });

  it("does not remember built-in tags as custom ones", () => {
    const next = reducer(stateWith(), { type: "add-block", tag: "context" });
    expect(next.customTags).toEqual([]);
  });

  it("remembers a custom tag only once", () => {
    let state = reducer(stateWith(), { type: "add-block", tag: "rollout_plan" });
    state = reducer(state, { type: "add-block", tag: "rollout_plan" });
    expect(state.customTags).toEqual(["rollout_plan"]);
  });

  it("focuses the block it just added", () => {
    const next = reducer(stateWith(), { type: "add-block", tag: "context" });
    expect(next.focusBlockId).toBe(next.prompt.blocks[0]!.id);
  });
});

describe("update-block", () => {
  it("edits content without disturbing the other blocks", () => {
    const state = stateWith("instructions", "context");
    const id = state.prompt.blocks[0]!.id;
    const next = reducer(state, { type: "update-block", id, changes: { content: "new" } });
    expect(next.prompt.blocks[0]!.content).toBe("new");
    expect(next.prompt.blocks[1]).toBe(state.prompt.blocks[1]);
  });

  it("edits a nested child", () => {
    const child = createBlock({ tag: "example", content: "old" });
    const state = initialState({
      schemaVersion: SCHEMA_VERSION,
      blocks: [createBlock({ tag: "examples", children: [child] })],
    });
    const next = reducer(state, {
      type: "update-block",
      id: child.id,
      changes: { content: "new" },
    });
    expect(next.prompt.blocks[0]!.children![0]!.content).toBe("new");
  });

  it("remembers a tag renamed to something custom", () => {
    const state = stateWith("context");
    const next = reducer(state, {
      type: "update-block",
      id: state.prompt.blocks[0]!.id,
      changes: { tag: "background" },
    });
    expect(next.customTags).toEqual(["background"]);
  });
});

describe("remove-block", () => {
  it("removes a top-level block", () => {
    const state = stateWith("instructions", "context");
    const next = reducer(state, { type: "remove-block", id: state.prompt.blocks[0]!.id });
    expect(tagsOf(next)).toEqual(["context"]);
  });

  it("removes a nested child without touching its siblings", () => {
    const first = createBlock({ tag: "example", content: "one" });
    const second = createBlock({ tag: "example", content: "two" });
    const state = initialState({
      schemaVersion: SCHEMA_VERSION,
      blocks: [createBlock({ tag: "examples", children: [first, second] })],
    });
    const next = reducer(state, { type: "remove-block", id: first.id });
    expect(next.prompt.blocks[0]!.children!.map((c) => c.content)).toEqual(["two"]);
  });

  it("clears the focus when the focused block is deleted", () => {
    const state = stateWith("context");
    const id = state.prompt.blocks[0]!.id;
    const focused = reducer(state, { type: "focus-block", id });
    expect(reducer(focused, { type: "remove-block", id }).focusBlockId).toBeNull();
  });
});

describe("move-block", () => {
  it("moves a block down the list", () => {
    const state = stateWith("a", "b", "c");
    const [a, , c] = state.prompt.blocks;
    const next = reducer(state, { type: "move-block", activeId: a!.id, overId: c!.id });
    expect(tagsOf(next)).toEqual(["b", "c", "a"]);
  });

  it("moves a block up the list", () => {
    const state = stateWith("a", "b", "c");
    const [a, , c] = state.prompt.blocks;
    const next = reducer(state, { type: "move-block", activeId: c!.id, overId: a!.id });
    expect(tagsOf(next)).toEqual(["c", "a", "b"]);
  });

  it("is a no-op when a block is dropped on itself", () => {
    const state = stateWith("a", "b");
    const id = state.prompt.blocks[0]!.id;
    const next = reducer(state, { type: "move-block", activeId: id, overId: id });
    expect(next.prompt.blocks).toBe(state.prompt.blocks);
  });

  it("ignores an unknown id rather than dropping a block", () => {
    const state = stateWith("a", "b");
    const next = reducer(state, {
      type: "move-block",
      activeId: state.prompt.blocks[0]!.id,
      overId: "nope",
    });
    expect(tagsOf(next)).toEqual(["a", "b"]);
  });
});

describe("add-child and move-child", () => {
  it("appends a child to its container", () => {
    const state = stateWith("examples");
    const parentId = state.prompt.blocks[0]!.id;
    const next = reducer(state, { type: "add-child", parentId, tag: "example" });
    expect(next.prompt.blocks[0]!.children!.map((c) => c.tag)).toEqual(["example"]);
  });

  it("reorders children within their container", () => {
    const first = createBlock({ tag: "example", content: "one" });
    const second = createBlock({ tag: "example", content: "two" });
    const parent = createBlock({ tag: "examples", children: [first, second] });
    const state = initialState({ schemaVersion: SCHEMA_VERSION, blocks: [parent] });
    const next = reducer(state, {
      type: "move-child",
      parentId: parent.id,
      activeId: second.id,
      overId: first.id,
    });
    expect(next.prompt.blocks[0]!.children!.map((c) => c.content)).toEqual(["two", "one"]);
  });
});

describe("saved prompts", () => {
  it("saves under a name and overwrites a previous save of that name", () => {
    const state = stateWith("instructions");
    const once = reducer(state, { type: "save-as", name: "brief", savedAt: "2026-01-01" });
    const twice = reducer(once, { type: "save-as", name: "brief", savedAt: "2026-01-02" });
    expect(twice.saved).toHaveLength(1);
    expect(twice.saved[0]!.savedAt).toBe("2026-01-02");
  });

  it("deletes a saved prompt by name", () => {
    const saved = reducer(stateWith("instructions"), {
      type: "save-as",
      name: "brief",
      savedAt: "2026-01-01",
    });
    expect(reducer(saved, { type: "delete-saved", name: "brief" }).saved).toEqual([]);
  });

  it("keeps saved prompts and custom tags when the document is replaced", () => {
    let state = reducer(stateWith("instructions"), { type: "add-block", tag: "rollout_plan" });
    state = reducer(state, { type: "save-as", name: "brief", savedAt: "2026-01-01" });
    const replaced = reducer(state, {
      type: "replace-prompt",
      prompt: { schemaVersion: SCHEMA_VERSION, blocks: [] },
    });
    expect(replaced.saved).toHaveLength(1);
    expect(replaced.customTags).toEqual(["rollout_plan"]);
    expect(replaced.prompt.blocks).toEqual([]);
  });
});

describe("folding blocks", () => {
  const taskBrief = () => initialState(createPromptFromTemplate("task"));
  const idOf = (state: State, tag: string) => state.prompt.blocks.find((b) => b.tag === tag)!.id;
  const foldedTags = (state: State) =>
    state.prompt.blocks.filter((b) => state.collapsed.includes(b.id)).map((b) => b.tag);

  it("starts with the blocks that are off and empty folded", () => {
    expect(foldedTags(taskBrief())).toEqual(["context", "references", "requirements"]);
  });

  it("does not fold a block that is on, or off but holding text", () => {
    const prompt: Prompt = {
      schemaVersion: SCHEMA_VERSION,
      blocks: [
        createBlock({ tag: "instructions", content: "Build it." }),
        createBlock({ tag: "context", enabled: false, content: "Kept for later." }),
        createBlock({ tag: "constraints", enabled: false }),
      ],
    };
    expect(foldedTags(initialState(prompt))).toEqual(["constraints"]);
  });

  it("folds and unfolds a block on request", () => {
    const state = taskBrief();
    const id = idOf(state, "task");
    const folded = reducer(state, { type: "toggle-collapsed", id });
    expect(folded.collapsed).toContain(id);
    expect(reducer(folded, { type: "toggle-collapsed", id }).collapsed).not.toContain(id);
  });

  it("works out what to fold again when the whole prompt is replaced", () => {
    const state = reducer(taskBrief(), {
      type: "replace-prompt",
      prompt: createPromptFromTemplate("review"),
    });
    expect(foldedTags(state)).toEqual(["context", "references"]);
  });

  it("opens a folded block when it is switched on", () => {
    const state = taskBrief();
    const id = idOf(state, "requirements");
    const next = reducer(state, { type: "update-block", id, changes: { enabled: true } });
    expect(next.collapsed).not.toContain(id);
  });

  it("keeps a block folded when it is switched off", () => {
    const state = taskBrief();
    const id = idOf(state, "task");
    const folded = reducer(state, { type: "toggle-collapsed", id });
    const next = reducer(folded, { type: "update-block", id, changes: { enabled: false } });
    expect(next.collapsed).toContain(id);
  });

  it("opens a folded block when a hint sends you to it", () => {
    const state = taskBrief();
    const id = idOf(state, "references");
    const next = reducer(state, { type: "focus-block", id });
    expect(next.collapsed).not.toContain(id);
    expect(next.focusBlockId).toBe(id);
  });

  it("leaves folding alone when focus is cleared", () => {
    const state = taskBrief();
    expect(reducer(state, { type: "focus-block", id: null }).collapsed).toEqual(state.collapsed);
  });

  it("forgets a block that is deleted", () => {
    const state = taskBrief();
    const id = idOf(state, "context");
    expect(reducer(state, { type: "remove-block", id }).collapsed).not.toContain(id);
  });

  it("does not fold a block that has just been added", () => {
    const next = reducer(taskBrief(), { type: "add-block", tag: "data" });
    expect(next.collapsed).not.toContain(next.focusBlockId);
  });
});

describe("the template in use", () => {
  it("starts with none recorded, so the picker can read 'Custom'", () => {
    expect(initialState(createPromptFromTemplate("task")).templateId).toBeNull();
  });

  it("remembers the template a replacement came from", () => {
    const next = reducer(initialState(createPromptFromTemplate("task")), {
      type: "replace-prompt",
      prompt: createPromptFromTemplate("debug"),
      templateId: "debug",
    });
    expect(next.templateId).toBe("debug");
  });

  it("goes back to none when the prompt comes from somewhere else", () => {
    const fromTemplate = initialState(createPromptFromTemplate("task"), "task");
    const next = reducer(fromTemplate, {
      type: "replace-prompt",
      prompt: { schemaVersion: SCHEMA_VERSION, blocks: [] },
    });
    expect(next.templateId).toBeNull();
  });

  it("keeps the template while the prompt is edited", () => {
    const state = initialState(createPromptFromTemplate("build"), "build");
    const next = reducer(state, { type: "add-block", tag: "data" });
    expect(next.templateId).toBe("build");
  });
});
