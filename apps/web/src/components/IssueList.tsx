/**
 * Validation issues and quality hints, clickable to jump to the block they
 * belong to. Anything that is not an error is shown as a suggestion.
 */

import type { ValidationIssue } from "@tidy-prompt/core";
import { usePromptActions } from "../state/promptStore.js";

export function IssueList({ issues }: { issues: ValidationIssue[] }): React.ReactNode {
  const actions = usePromptActions();
  if (issues.length === 0) return null;

  const errors = issues.filter((issue) => issue.severity === "error").length;

  return (
    <details className="issues" open={errors > 0}>
      <summary className="issues__summary">
        <span className={errors > 0 ? "issues__badge issues__badge--error" : "issues__badge"}>
          {issues.length}
        </span>
        {errors > 0
          ? `${errors} error${errors === 1 ? "" : "s"} to fix`
          : `${issues.length} suggestion${issues.length === 1 ? "" : "s"}`}
      </summary>
      <ul className="issues__list">
        {issues.map((issue, index) => (
          <li key={`${issue.code}-${issue.blockId ?? "prompt"}-${index}`}>
            <button
              type="button"
              className={`issues__item issues__item--${issue.severity}`}
              disabled={!issue.blockId}
              onClick={() => issue.blockId && actions.focusBlock(issue.blockId)}
            >
              {issue.message}
            </button>
          </li>
        ))}
      </ul>
    </details>
  );
}
