/**
 * Prompt editing operations as a pure reducer.
 *
 * Kept free of React and of the DOM so the operations that back the UI — most
 * of which are also what drag-and-drop invokes — can be tested directly, and so
 * a future extension or editor plugin can reuse them.
 */

import { createBlock, getTagDefinition, type Block, type Prompt } from "@tidy-prompt/core";

export interface SavedPrompt {
  name: string;
  savedAt: string;
  prompt: Prompt;
}

export interface State {
  prompt: Prompt;
  /** Custom tag names the user has invented, offered again in the add menu. */
  customTags: string[];
  saved: SavedPrompt[];
  /** Block to scroll to and focus, set when the user clicks a validation issue. */
  focusBlockId: string | null;
}

export type Action =
  | { type: "replace-prompt"; prompt: Prompt }
  | { type: "add-block"; tag: string }
  | { type: "add-child"; parentId: string; tag: string }
  | { type: "update-block"; id: string; changes: Partial<Omit<Block, "id" | "children">> }
  | { type: "remove-block"; id: string }
  | { type: "move-block"; activeId: string; overId: string }
  | { type: "move-child"; parentId: string; activeId: string; overId: string }
  | { type: "focus-block"; id: string | null }
  | { type: "save-as"; name: string; savedAt: string }
  | { type: "delete-saved"; name: string }
  | { type: "hydrate"; state: Partial<State> };

export function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "replace-prompt":
      return { ...state, prompt: action.prompt, focusBlockId: null };

    case "add-block": {
      const block = createBlock({ tag: action.tag });
      return {
        ...state,
        prompt: { ...state.prompt, blocks: insertByDefaultOrder(state.prompt.blocks, block) },
        customTags: rememberTag(state.customTags, action.tag),
        focusBlockId: block.id,
      };
    }

    case "add-child": {
      const child = createBlock({ tag: action.tag });
      return {
        ...state,
        prompt: {
          ...state.prompt,
          blocks: mapBlock(state.prompt.blocks, action.parentId, (parent) => ({
            ...parent,
            children: [...(parent.children ?? []), child],
          })),
        },
        focusBlockId: child.id,
      };
    }

    case "update-block":
      return {
        ...state,
        prompt: {
          ...state.prompt,
          blocks: mapBlock(state.prompt.blocks, action.id, (block) => ({
            ...block,
            ...action.changes,
          })),
        },
        customTags:
          typeof action.changes.tag === "string"
            ? rememberTag(state.customTags, action.changes.tag)
            : state.customTags,
      };

    case "remove-block":
      return {
        ...state,
        prompt: { ...state.prompt, blocks: removeBlock(state.prompt.blocks, action.id) },
        focusBlockId: state.focusBlockId === action.id ? null : state.focusBlockId,
      };

    case "move-block":
      return {
        ...state,
        prompt: {
          ...state.prompt,
          blocks: reorder(state.prompt.blocks, action.activeId, action.overId),
        },
      };

    case "move-child":
      return {
        ...state,
        prompt: {
          ...state.prompt,
          blocks: mapBlock(state.prompt.blocks, action.parentId, (parent) => ({
            ...parent,
            children: reorder(parent.children ?? [], action.activeId, action.overId),
          })),
        },
      };

    case "focus-block":
      return { ...state, focusBlockId: action.id };

    case "save-as": {
      const entry: SavedPrompt = {
        name: action.name,
        savedAt: action.savedAt,
        prompt: state.prompt,
      };
      const rest = state.saved.filter((s) => s.name !== action.name);
      return { ...state, saved: [entry, ...rest] };
    }

    case "delete-saved":
      return { ...state, saved: state.saved.filter((s) => s.name !== action.name) };

    case "hydrate":
      return { ...state, ...action.state };

    default:
      return state;
  }
}

/** Places a new block near its siblings rather than always at the bottom. */
function insertByDefaultOrder(blocks: Block[], block: Block): Block[] {
  const order = getTagDefinition(block.tag)?.defaultOrder;
  if (order === undefined) return [...blocks, block];

  const index = blocks.findIndex((existing) => {
    const existingOrder = getTagDefinition(existing.tag)?.defaultOrder;
    return existingOrder !== undefined && existingOrder > order;
  });
  if (index === -1) return [...blocks, block];
  return [...blocks.slice(0, index), block, ...blocks.slice(index)];
}

function rememberTag(customTags: string[], tag: string): string[] {
  if (!tag || getTagDefinition(tag) || customTags.includes(tag)) return customTags;
  return [...customTags, tag];
}

function mapBlock(blocks: Block[], id: string, update: (block: Block) => Block): Block[] {
  return blocks.map((block) => {
    if (block.id === id) return update(block);
    if (block.children) return { ...block, children: mapBlock(block.children, id, update) };
    return block;
  });
}

function removeBlock(blocks: Block[], id: string): Block[] {
  return blocks
    .filter((block) => block.id !== id)
    .map((block) =>
      block.children ? { ...block, children: removeBlock(block.children, id) } : block,
    );
}

function reorder(blocks: Block[], activeId: string, overId: string): Block[] {
  const from = blocks.findIndex((b) => b.id === activeId);
  const to = blocks.findIndex((b) => b.id === overId);
  if (from === -1 || to === -1 || from === to) return blocks;
  const next = [...blocks];
  const [moved] = next.splice(from, 1);
  if (!moved) return blocks;
  next.splice(to, 0, moved);
  return next;
}


export function initialState(prompt: Prompt): State {
  return { prompt, customTags: [], saved: [], focusBlockId: null };
}
