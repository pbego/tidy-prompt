/** Prompt-level counters. Token figures are estimates and say so. */

import type { PromptTokenEstimate } from "@tidy-prompt/core";

interface Props {
  estimate: PromptTokenEstimate;
  blockCount: number;
  enabledCount: number;
  characters: number;
}

export function StatsBar({ estimate, blockCount, enabledCount, characters }: Props): React.ReactNode {
  return (
    <dl className="stats" aria-label="Prompt statistics">
      <div className="stats__item">
        <dt>Blocks</dt>
        <dd>
          {enabledCount}
          {enabledCount !== blockCount && <span className="stats__muted"> / {blockCount}</span>}
        </dd>
      </div>
      <div className="stats__item">
        <dt>Characters</dt>
        <dd>{characters.toLocaleString("en-US")}</dd>
      </div>
      <div className="stats__item" title="A heuristic, not a tokenizer — treat it as a rough guide">
        <dt>Tokens</dt>
        <dd>≈{estimate.total.toLocaleString("en-US")}</dd>
      </div>
    </dl>
  );
}
