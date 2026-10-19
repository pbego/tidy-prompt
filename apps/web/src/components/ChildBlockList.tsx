/** Repeated child blocks inside a container tag, e.g. <example> in <examples>. */

import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import type { Block, TagDefinition } from "@tidy-prompt/core";
import { usePromptActions } from "../state/promptStore.js";
import { BlockEditor } from "./BlockEditor.js";

interface Props {
  parent: Block;
  definition: TagDefinition;
}

export function ChildBlockList({ parent, definition }: Props): React.ReactNode {
  const actions = usePromptActions();
  const childTag = definition.childTag ?? "item";
  const children = parent.children ?? [];

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      actions.moveChild(parent.id, String(active.id), String(over.id));
    }
  };

  return (
    <div className="children">
      {children.length > 0 && (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={children.map((c) => c.id)} strategy={verticalListSortingStrategy}>
            <ul className="children__list">
              {children.map((child) => (
                <BlockEditor key={child.id} block={child} parentId={parent.id} />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      )}
      <button
        type="button"
        className="button button--ghost children__add"
        onClick={() => actions.addChild(parent.id, childTag)}
      >
        + {childTag}
      </button>
    </div>
  );
}
