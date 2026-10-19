/**
 * The document a user lands on when they open the app for the first time.
 * Enough structure to show what the tool is for, empty enough that nobody has to
 * delete someone else's words before writing their own: the task brief, with only
 * its main block switched on.
 */

import { createPromptFromTemplate, DEFAULT_TEMPLATE_ID } from "./templates.js";
import type { Prompt } from "./types.js";

export function createStarterPrompt(): Prompt {
  return createPromptFromTemplate(DEFAULT_TEMPLATE_ID);
}
