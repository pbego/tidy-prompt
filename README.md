# tidy-prompt

Compose structured, XML-tagged prompts for AI coding agents.

Tagging a prompt — `<instructions>`, `<context>`, `<requirements>` — is one of the most reliable
ways to get consistent results out of a model. Doing it by hand in a text box is where it falls
apart: unescaped `&` and `<`, a `<div>` in the middle that breaks the document, blocks in an order
nobody chose, and no idea how large the thing has become. tidy-prompt is a form for the parts and a
correct, live assembly of the whole.

The default tag vocabulary is aimed at briefing an agent to build software — what to build, the
codebase it lands in, what "done" means, what to leave alone — but any tag name works.

Nothing leaves the browser. There is no backend and no network call.

## Getting started

```bash
pnpm install
```

```bash
pnpm dev
```

The app runs at `http://localhost:5173`.

| Command | What it does |
| --- | --- |
| `pnpm dev` | Web app in dev mode with hot reload across both packages |
| `pnpm test` | Vitest over the core package and the editor reducer |
| `pnpm typecheck` | `tsc --noEmit` across the workspace |
| `pnpm build` | Builds `@tidy-prompt/core`, then a static bundle in `apps/web/dist` |

`apps/web/dist` is a plain static site — it needs no server beyond something to serve files.

## Layout

```
packages/core   @tidy-prompt/core — the prompt model, validation and serializers.
                Zero dependencies, no DOM, no framework.
apps/web        The React editor. One consumer of core, not the home of its logic.
```

The split is the point. Everything about what a prompt *is* lives in `packages/core`, so a browser
extension, an editor plugin, or a server-side "tidy this prompt" pass can import the same
serializers instead of reimplementing them and drifting. `apps/web` resolves core through its
source in dev (hot reload) and through `dist` when built.

## Core API

```ts
import {
  createBlock, createStarterPrompt,        // building documents
  serializeXml, serializeMarkdown,          // outputs
  serializeJson, toMessagesRequest,
  validatePrompt, validateTagName,          // checks
  estimatePromptTokens,                     // rough sizing
  toPromptDocument, parsePromptDocument,    // save files
} from "@tidy-prompt/core";
```

A prompt is plain data:

```ts
interface Block {
  id: string;
  tag: string;                          // validated as an XML NCName
  content: string;
  enabled: boolean;                     // disabled blocks stay, but never render
  attributes?: Record<string, string>;
  children?: Block[];                   // e.g. several <example> in <examples>
}

interface Prompt { schemaVersion: 1; blocks: Block[] }
```

### Outputs

| Function | Result |
| --- | --- |
| `serializeXml` | Tagged sections. The primary format. |
| `serializeMarkdown` | The same structure as `##` headings. |
| `serializeJson` | One field per tag; repeated tags collapse to arrays. |
| `toMessagesRequest` | A Messages API body — standing instructions in `system`, material in the user turn. |

Blocks that are disabled, or empty with no renderable children, are omitted from every output —
and from the token estimate, so the count always matches what would actually be sent.

### Decisions worth knowing

**Material first, ask last.** New blocks slot in with background, code and data above the
instructions, and the output format last. Anthropic's prompting guidance puts long inputs above the
query; short prompts don't care, large ones do. You can still drag blocks into any order.

**No `<thinking>` tag.** Current Claude models may decline a request to write their reasoning out,
and are steered with effort settings instead. The built-in `approach` tag covers method — what to
read first, when to ask — as goals rather than a step list. Any tag name still works, including
`thinking` in a saved prompt.

**Content is never re-indented.** Leading whitespace is meaningful in the things people paste into
prompts — Python, YAML, diffs, log excerpts — so tags are indented by depth while content between
them is emitted exactly as typed. `serializeXml(prompt, { indentContent: true })` opts out.

**Markup goes in CDATA, prose gets entities.** Escaping a pasted React component into
`&lt;div&gt;` soup is correct and unreadable. `escapeContent` detects markup and wraps it in CDATA
instead, splitting around any literal `]]>` so the section always closes.

**A bare `>` is left alone.** It only has to be escaped inside `]]>`, and `->`, `=>` and `if (a > b)`
appear constantly in prompts about code.

**Token counts are estimates.** `estimateTokens` is a heuristic — CJK characters counted
individually, chars/4 for the rest, floored by a word-based estimate — not a tokenizer. The UI
labels every figure with `≈` for that reason.

**Validation returns issues, it never throws.** A prompt being edited is allowed to be temporarily
invalid; the UI renders the problem next to the field. Checks cover tag and attribute names, empty
enabled blocks, duplicated top-level tags, content truncated mid-tag, content that already carries
the tag the composer will add, and overall size.

## Storage

`localStorage`, namespaced under `tidy-prompt:` — the working document (debounced), named saves,
and remembered custom tags. Every access degrades to "no saved state" rather than throwing, since
storage can be full or disabled. Import/export uses a versioned JSON document that also accepts a
bare prompt, regenerates missing ids, and reports malformed input instead of failing.

## Status

v1 is the standalone web app. Deliberately not built yet: templates and presets, share-by-URL,
accounts, AI-assisted critique of a prompt, and the browser and editor plugins themselves. The core
package is shaped so each of those is additive rather than a rewrite.
