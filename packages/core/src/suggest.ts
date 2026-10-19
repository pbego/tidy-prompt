/**
 * Quality hints: whether the prompt asks clearly, as opposed to whether the
 * output is well-formed (that is ./validate.ts).
 *
 * These are cheap, deterministic heuristics — no model call — so they can only
 * catch the common, mechanical slips: a task that is one phrase long, wording
 * that leaves the model to guess, nothing saying how to tell the work is done,
 * material pasted in with no instruction. Each returns at most one hint and
 * points at the block to fix, and a hint is silent until there is something to
 * judge, so an empty prompt never nags.
 */

import { isMaterialTag } from "./tags.js";
import { isRenderable } from "./serialize/xml.js";
import type { Block, Prompt, ValidationIssue } from "./types.js";

/**
 * Tags that hold the task itself. `task` is the built-in one; `instructions` is
 * what older prompts and people typing by hand tend to call it.
 */
const TASK_TAGS = new Set(["task", "instructions"]);

/**
 * Blocks that give the model a way to tell the work is done or well-shaped. The
 * first three are built in; the rest are names people type by hand.
 */
const DONE_TAGS = new Set([
  "requirements",
  "expected_behavior",
  "review_focus",
  "acceptance_criteria",
  "testing",
  "output_format",
]);

/** A task shorter than this is a topic, not an outcome. */
const THIN_TASK_WORDS = 8;
/** Pasted material shorter than this is a note, not a document to act on. */
const SUBSTANTIAL_MATERIAL_WORDS = 20;

/**
 * Phrases that leave the model to decide what was meant. Deliberately short:
 * words like "improve" or "better" are often fine, so only the ones that are
 * almost always a placeholder for a missing detail are listed.
 */
const VAGUE =
  /\b(etc\.?|and so on|and the like|and stuff|somehow|something like|make it (?:better|nicer|cleaner|good)|as appropriate|as needed)(?=\W|$)/i;

export function suggestImprovements(prompt: Prompt): ValidationIssue[] {
  const hints: ValidationIssue[] = [];

  const renderable = prompt.blocks.filter(isRenderable);
  const task = renderable.find((block) => TASK_TAGS.has(block.tag));

  if (task) {
    const words = wordCount(task.content);

    if (words < THIN_TASK_WORDS) {
      hints.push(
        hint(
          "thin-task",
          task,
          `<${task.tag}> is only ${words} word${words === 1 ? "" : "s"}. Say what the finished result looks like — one concrete outcome, not just a topic.`,
        ),
      );
    }

    const vague = VAGUE.exec(task.content);
    if (vague) {
      hints.push(
        hint(
          "vague-wording",
          task,
          `"${vague[0]}" leaves the model to guess. Say specifically what should happen.`,
        ),
      );
    }

    const hasDoneCheck = renderable.some((block) => DONE_TAGS.has(block.tag));
    if (words >= THIN_TASK_WORDS && !hasDoneCheck) {
      hints.push(
        hint(
          "no-done-check",
          task,
          "Nothing says how to tell the work is done. Add a requirement you could check.",
        ),
      );
    }
  } else {
    const material = renderable.find(
      (block) => isMaterialTag(block.tag) && wordCount(block.content) >= SUBSTANTIAL_MATERIAL_WORDS,
    );
    if (material) {
      hints.push({
        severity: "hint",
        code: "material-without-task",
        message: `<${material.tag}> has material but no task. Say what to do with it.`,
        blockId: material.id,
      });
    }
  }

  return hints;
}

function hint(code: ValidationIssue["code"], block: Block, message: string): ValidationIssue {
  return { severity: "hint", code, message, blockId: block.id };
}

function wordCount(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}
