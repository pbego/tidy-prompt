/**
 * The document a user lands on when they open the app for the first time.
 * Enough structure to show what the tool is for, empty enough that nobody has to
 * delete someone else's words before writing their own.
 */

import { BUILTIN_TAGS } from "./tags.js";
import { createBlock, SCHEMA_VERSION, type Prompt } from "./types.js";

export function createStarterPrompt(): Prompt {
  const blocks = BUILTIN_TAGS.filter((definition) => definition.defaultEnabled)
    .slice()
    .sort((a, b) => a.defaultOrder - b.defaultOrder)
    .map((definition) => createBlock({ tag: definition.tag }));

  return { schemaVersion: SCHEMA_VERSION, blocks };
}
