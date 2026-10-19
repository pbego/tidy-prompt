/** The ordered list of top-level blocks, with drag-to-reorder. */

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
import { usePromptActions, usePromptStore } from "../state/promptStore.js";
import { BlockEditor } from "./BlockEditor.js";
import { AddTagMenu } from "./AddTagMenu.js";

export function BlockList(): React.ReactNode {
  const { state } = usePromptStore();
  const actions = usePromptActions();
  const blocks = state.prompt.blocks;

  const sensors = useSensors(
    // A small distance threshold keeps a click on the handle from starting a drag.
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      actions.moveBlock(String(active.id), String(over.id));
    }
  };

  return (
    <div className="blocks">
      {blocks.length === 0 ? (
        <p className="blocks__empty">
          No blocks yet. Add a tag to start building the prompt.
        </p>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={blocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
            <ul className="blocks__list">
              {blocks.map((block) => (
                <BlockEditor key={block.id} block={block} />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      )}
      <AddTagMenu />
    </div>
  );
}
