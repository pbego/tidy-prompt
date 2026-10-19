/**
 * One editable block: its tag, its content, its attributes and — for container
 * tags like <examples> — its child blocks.
 */

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  estimateBlockTokens,
  getTagDefinition,
  humanizeTag,
  validateTagName,
  type Block,
} from "@tidy-prompt/core";
import { usePromptActions, usePromptStore } from "../state/promptStore.js";
import { ChildBlockList } from "./ChildBlockList.js";

interface Props {
  block: Block;
  /** Set for children; drives the nested styling and the child drag context. */
  parentId?: string;
}

export function BlockEditor({ block, parentId }: Props): React.ReactNode {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: block.id,
  });
  const { state } = usePromptStore();
  const actions = usePromptActions();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [showAttributes, setShowAttributes] = useState(
    Object.keys(block.attributes ?? {}).length > 0,
  );

  const definition = getTagDefinition(block.tag);
  const tagIssue = validateTagName(block.tag);
  const tokens = estimateBlockTokens(block);

  useAutoResize(textareaRef, block.content);

  // A click on a validation issue focuses the block it belongs to.
  useEffect(() => {
    if (state.focusBlockId !== block.id) return;
    const node = textareaRef.current;
    node?.scrollIntoView({ block: "center", behavior: "smooth" });
    node?.focus();
    actions.focusBlock(null);
  }, [state.focusBlockId, block.id, actions]);

  const isChild = parentId !== undefined;

  return (
    <li
      ref={setNodeRef}
      className={[
        "block",
        isChild ? "block--child" : "",
        isDragging ? "block--dragging" : "",
        block.enabled ? "" : "block--disabled",
        tagIssue ? "block--invalid" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      style={{ transform: CSS.Transform.toString(transform), transition }}
    >
      <div className="block__header">
        <button
          type="button"
          className="block__handle"
          aria-label={`Reorder ${humanizeTag(block.tag)}`}
          {...attributes}
          {...listeners}
        >
          ⠿
        </button>

        <span className="block__angle">&lt;</span>
        <input
          className="block__tag"
          value={block.tag}
          aria-label="Tag name"
          spellCheck={false}
          size={Math.max(block.tag.length || 1, 4)}
          onChange={(event) => actions.updateBlock(block.id, { tag: event.target.value })}
        />
        <span className="block__angle">&gt;</span>

        <span className="block__tokens" title="Approximate token count">
          ≈{tokens.toLocaleString("en-US")}
        </span>

        <div className="block__actions">
          <label className="block__toggle" title="Include this block in the output">
            <input
              type="checkbox"
              checked={block.enabled}
              onChange={(event) => actions.updateBlock(block.id, { enabled: event.target.checked })}
            />
            <span>{block.enabled ? "On" : "Off"}</span>
          </label>
          <button
            type="button"
            className="button button--ghost"
            aria-pressed={showAttributes}
            title="Edit XML attributes"
            onClick={() => setShowAttributes((value) => !value)}
          >
            Attrs
          </button>
          <button
            type="button"
            className="button button--ghost block__delete"
            aria-label={`Delete ${block.tag}`}
            onClick={() => actions.removeBlock(block.id)}
          >
            ✕
          </button>
        </div>
      </div>

      {tagIssue && <p className="block__error">{tagIssue.message}</p>}
      {definition && !isChild && <p className="block__hint">{definition.description}</p>}

      {showAttributes && (
        <AttributeEditor
          attributes={block.attributes ?? {}}
          onChange={(next) => actions.updateBlock(block.id, { attributes: next })}
        />
      )}

      <textarea
        ref={textareaRef}
        className="block__content"
        value={block.content}
        placeholder={definition?.placeholder ?? `Content for <${block.tag}>`}
        spellCheck={false}
        onChange={(event) => actions.updateBlock(block.id, { content: event.target.value })}
      />

      {definition?.container && <ChildBlockList parent={block} definition={definition} />}
    </li>
  );
}

interface AttributeEditorProps {
  attributes: Record<string, string>;
  onChange: (next: Record<string, string>) => void;
}

function AttributeEditor({ attributes, onChange }: AttributeEditorProps): React.ReactNode {
  // Kept as a list rather than an object so a half-typed key does not collide
  // with an existing one while the user is still typing it.
  const entries = Object.entries(attributes);

  const update = (index: number, key: string, value: string) => {
    const next: Array<[string, string]> = entries.map((entry, i) =>
      i === index ? [key, value] : entry,
    );
    onChange(Object.fromEntries(next.filter(([name]) => name.length > 0)));
  };

  return (
    <div className="attrs">
      {entries.map(([key, value], index) => (
        <div className="attrs__row" key={index}>
          <input
            className="attrs__key"
            value={key}
            aria-label="Attribute name"
            placeholder="name"
            spellCheck={false}
            onChange={(event) => update(index, event.target.value, value)}
          />
          <span className="attrs__equals">=</span>
          <input
            className="attrs__value"
            value={value}
            aria-label="Attribute value"
            placeholder="value"
            spellCheck={false}
            onChange={(event) => update(index, key, event.target.value)}
          />
          <button
            type="button"
            className="button button--ghost"
            aria-label={`Remove attribute ${key}`}
            onClick={() =>
              onChange(Object.fromEntries(entries.filter((_, i) => i !== index)))
            }
          >
            ✕
          </button>
        </div>
      ))}
      <button
        type="button"
        className="button button--ghost"
        onClick={() => onChange({ ...attributes, [`attr${entries.length + 1}`]: "" })}
      >
        + Attribute
      </button>
    </div>
  );
}

const MIN_HEIGHT = 72;
/** Past this a block gets its own scrollbar rather than an endless page. */
const MAX_HEIGHT = 560;

/**
 * Grows a textarea to fit its content so nothing is hidden behind a scrollbar.
 *
 * The measurement is repeated on the next frame: on first mount the stylesheet
 * and web fonts have not necessarily been applied, and measuring an unstyled
 * textarea yields a wildly wrong height that then sets the layout.
 */
function useAutoResize(ref: React.RefObject<HTMLTextAreaElement | null>, value: string): void {
  useLayoutEffect(() => {
    const node = ref.current;
    if (!node) return;

    const resize = () => {
      node.style.height = "auto";
      const fitted = Math.min(Math.max(node.scrollHeight, MIN_HEIGHT), MAX_HEIGHT);
      node.style.height = `${fitted}px`;
      node.style.overflowY = node.scrollHeight > MAX_HEIGHT ? "auto" : "hidden";
    };

    resize();
    const frame = requestAnimationFrame(resize);
    return () => cancelAnimationFrame(frame);
  }, [ref, value]);
}
