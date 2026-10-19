/**
 * The add-a-tag control: the built-in vocabulary, whatever custom tags the user
 * has invented before, and a field to invent a new one.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { BUILTIN_TAGS, humanizeTag, suggestTagName, validateTagName } from "@tidy-prompt/core";
import { usePromptActions, usePromptStore } from "../state/promptStore.js";

export function AddTagMenu(): React.ReactNode {
  const { state } = usePromptStore();
  const { addBlock } = usePromptActions();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  const usedTags = useMemo(() => new Set(state.prompt.blocks.map((b) => b.tag)), [state.prompt]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const suggested = suggestTagName(draft);
  const draftIssue = draft.trim().length > 0 ? validateTagName(suggested) : null;

  const addCustom = () => {
    if (draft.trim().length === 0 || draftIssue) return;
    addBlock(suggested);
    setDraft("");
    setOpen(false);
  };

  return (
    <div className="add-tag" ref={containerRef}>
      <button
        type="button"
        className="button button--primary"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        + Add tag
      </button>

      {open && (
        <div className="add-tag__menu" role="menu">
          <p className="add-tag__heading">Built-in</p>
          <ul className="add-tag__list">
            {BUILTIN_TAGS.map((definition) => (
              <li key={definition.tag}>
                <button
                  type="button"
                  className="add-tag__option"
                  onClick={() => {
                    addBlock(definition.tag);
                    setOpen(false);
                  }}
                >
                  <span className="add-tag__option-name">
                    &lt;{definition.tag}&gt;
                    {usedTags.has(definition.tag) && (
                      <span className="add-tag__used" title="Already in this prompt">
                        in use
                      </span>
                    )}
                  </span>
                  <span className="add-tag__option-desc">{definition.description}</span>
                </button>
              </li>
            ))}
          </ul>

          {state.customTags.length > 0 && (
            <>
              <p className="add-tag__heading">Your tags</p>
              <ul className="add-tag__list">
                {state.customTags.map((tag) => (
                  <li key={tag}>
                    <button
                      type="button"
                      className="add-tag__option"
                      onClick={() => {
                        addBlock(tag);
                        setOpen(false);
                      }}
                    >
                      <span className="add-tag__option-name">&lt;{tag}&gt;</span>
                      <span className="add-tag__option-desc">{humanizeTag(tag)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}

          <p className="add-tag__heading">New tag</p>
          <div className="add-tag__custom">
            <input
              type="text"
              value={draft}
              placeholder="rollout plan"
              aria-label="New tag name"
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  addCustom();
                }
              }}
            />
            <button
              type="button"
              className="button"
              disabled={draft.trim().length === 0 || draftIssue !== null}
              onClick={addCustom}
            >
              Add
            </button>
          </div>
          {draft.trim().length > 0 && (
            <p className={draftIssue ? "add-tag__hint add-tag__hint--error" : "add-tag__hint"}>
              {draftIssue ? draftIssue.message : `Will be added as <${suggested}>`}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
