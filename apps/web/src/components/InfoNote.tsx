/**
 * The "How tags help" note under the title. A native <details> opens and closes
 * on its own summary, but not on a click elsewhere, which leaves a popover
 * hanging over the page — so this closes it on an outside click and on Escape.
 */

import { useEffect, useRef } from "react";

export function InfoNote(): React.ReactNode {
  const ref = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      const note = ref.current;
      if (note?.open && event.target instanceof Node && !note.contains(event.target)) {
        note.open = false;
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      const note = ref.current;
      if (event.key !== "Escape" || !note?.open) return;
      note.open = false;
      // Hand focus back to where the note was opened from.
      note.querySelector("summary")?.focus();
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  return (
    <details ref={ref} className="info">
      <summary className="info__summary">How tags help</summary>
      <div className="info__body">
        <strong>Tags are labels, not code</strong>
        <p>
          The model does not run your XML. It reads the tag names as cues for where the task, the
          background and the limits begin and end. Anthropic recommends tags for prompts that mix
          instructions with pasted material. Clear writing inside them matters more than the tags
          themselves.
        </p>
        <strong>Stays in this browser</strong>
        <p>
          Your prompt is kept in this browser&rsquo;s local storage so a reload does not lose it.
          Nothing is uploaded, and there are no cookies.
        </p>
      </div>
    </details>
  );
}
