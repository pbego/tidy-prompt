/**
 * React wiring around the prompt reducer: context, and the localStorage
 * persistence layer. All editing logic lives in ./reducer.ts, and all prompt
 * semantics live in @tidy-prompt/core.
 */

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  type ReactNode,
} from "react";
import {
  createStarterPrompt,
  parsePromptDocument,
  toPromptDocument,
  type Block,
  type Prompt,
} from "@tidy-prompt/core";
import { readJson, writeJson, StorageKeys, isStorageAvailable } from "../lib/storage.js";
import { initialState, reducer, type Action, type SavedPrompt, type State } from "./reducer.js";

export type { Action, SavedPrompt, State };
export { reducer };

/** Reads persisted state, falling back to a fresh document on anything unusable. */
function loadPersistedState(): State {
  const base = initialState(createStarterPrompt());
  const rawWorking = readJson<unknown>(StorageKeys.working, null);
  if (rawWorking) {
    const parsed = parsePromptDocument(rawWorking);
    if (parsed.ok && parsed.document.prompt.blocks.length > 0) {
      base.prompt = parsed.document.prompt;
    }
  }
  base.customTags = readJson<string[]>(StorageKeys.customTags, []);
  base.saved = readJson<SavedPrompt[]>(StorageKeys.saved, []);
  return base;
}

interface StoreValue {
  state: State;
  dispatch: (action: Action) => void;
  storageAvailable: boolean;
}

const StoreContext = createContext<StoreValue | null>(null);

export function PromptStoreProvider({ children }: { children: ReactNode }): ReactNode {
  const [state, dispatch] = useReducer(reducer, undefined, loadPersistedState);
  const storageAvailable = useMemo(() => isStorageAvailable(), []);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Debounced so a fast typist is not writing to disk on every keystroke.
  useEffect(() => {
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      writeJson(StorageKeys.working, JSON.parse(toPromptDocument(state.prompt)));
    }, 400);
    return () => clearTimeout(saveTimer.current);
  }, [state.prompt]);

  useEffect(() => {
    writeJson(StorageKeys.customTags, state.customTags);
  }, [state.customTags]);

  useEffect(() => {
    writeJson(StorageKeys.saved, state.saved);
  }, [state.saved]);

  const value = useMemo(() => ({ state, dispatch, storageAvailable }), [state, storageAvailable]);
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function usePromptStore(): StoreValue {
  const value = useContext(StoreContext);
  if (!value) throw new Error("usePromptStore must be used inside a PromptStoreProvider");
  return value;
}

/** Convenience wrappers so components do not build action objects by hand. */
export function usePromptActions() {
  const { dispatch } = usePromptStore();
  return useMemo(
    () => ({
      replacePrompt: (prompt: Prompt) => dispatch({ type: "replace-prompt", prompt }),
      addBlock: (tag: string) => dispatch({ type: "add-block", tag }),
      addChild: (parentId: string, tag: string) => dispatch({ type: "add-child", parentId, tag }),
      updateBlock: (id: string, changes: Partial<Omit<Block, "id" | "children">>) =>
        dispatch({ type: "update-block", id, changes }),
      removeBlock: (id: string) => dispatch({ type: "remove-block", id }),
      moveBlock: (activeId: string, overId: string) =>
        dispatch({ type: "move-block", activeId, overId }),
      moveChild: (parentId: string, activeId: string, overId: string) =>
        dispatch({ type: "move-child", parentId, activeId, overId }),
      focusBlock: (id: string | null) => dispatch({ type: "focus-block", id }),
      saveAs: (name: string) =>
        dispatch({ type: "save-as", name, savedAt: new Date().toISOString() }),
      deleteSaved: (name: string) => dispatch({ type: "delete-saved", name }),
    }),
    [dispatch],
  );
}

export { createStarterPrompt };
