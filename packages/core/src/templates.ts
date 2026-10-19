/**
 * Starting points: a set of tags to begin from, not a finished prompt.
 *
 * A template lists tags, never content — blocks start empty, and the placeholder
 * text on each tag shows what belongs there. Only the blocks the job really needs
 * are switched on; the rest are present but off, so a template can offer more
 * than it makes you fill in. Positions come from the tag registry, so a template
 * never has to repeat the material-first order.
 */

import { getTagDefinition } from "./tags.js";
import { createBlock, SCHEMA_VERSION, type Prompt } from "./types.js";

export interface TemplateBlock {
  tag: string;
  /** Switched on from the start. Everything else is present but off. */
  on?: boolean;
}

export interface PromptTemplate {
  id: string;
  label: string;
  description: string;
  blocks: readonly TemplateBlock[];
}

export const PROMPT_TEMPLATES: readonly PromptTemplate[] = [
  {
    id: "task",
    label: "Task brief",
    description: "One clear task, with room for background, references and requirements.",
    blocks: [
      { tag: "context" },
      { tag: "references" },
      { tag: "task", on: true },
      { tag: "requirements" },
    ],
  },
  {
    id: "research",
    label: "Research",
    description: "A question to answer from the material you give.",
    blocks: [
      { tag: "context" },
      { tag: "references" },
      { tag: "data", on: true },
      { tag: "task", on: true },
    ],
  },
  {
    id: "build",
    label: "Build feature",
    description: "A change to a codebase, with requirements and what to leave alone.",
    blocks: [
      { tag: "context", on: true },
      { tag: "references" },
      { tag: "code" },
      { tag: "task", on: true },
      { tag: "requirements", on: true },
      { tag: "out_of_scope" },
    ],
  },
  {
    id: "debug",
    label: "Debug issue",
    description: "Something is broken: what happens, what should, and how to trigger it.",
    blocks: [
      { tag: "context" },
      { tag: "symptoms", on: true },
      { tag: "expected_behavior", on: true },
      { tag: "reproduction", on: true },
      { tag: "references" },
      { tag: "code" },
      { tag: "task", on: true },
    ],
  },
  {
    id: "review",
    label: "Code review",
    description: "A diff to review, and what the review should look at.",
    blocks: [
      { tag: "context" },
      { tag: "references" },
      { tag: "code", on: true },
      { tag: "task", on: true },
      { tag: "review_focus", on: true },
    ],
  },
  {
    id: "blank",
    label: "Blank",
    description: "No blocks. Add the tags you want.",
    blocks: [],
  },
];

export const DEFAULT_TEMPLATE_ID = "task";

export function getTemplate(id: string): PromptTemplate | undefined {
  return PROMPT_TEMPLATES.find((template) => template.id === id);
}

/**
 * Builds a fresh prompt from a template, or from the default one when the id is
 * unknown. Blocks come out in registry order, with a fresh id each time.
 */
export function createPromptFromTemplate(id: string = DEFAULT_TEMPLATE_ID): Prompt {
  const template = getTemplate(id) ?? getTemplate(DEFAULT_TEMPLATE_ID)!;
  const position = (tag: string) => getTagDefinition(tag)?.defaultOrder ?? Number.MAX_SAFE_INTEGER;

  const blocks = template.blocks
    .slice()
    .sort((a, b) => position(a.tag) - position(b.tag))
    .map((entry) => createBlock({ tag: entry.tag, enabled: entry.on === true }));

  return { schemaVersion: SCHEMA_VERSION, blocks };
}
