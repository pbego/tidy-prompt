# tidy-prompt

Compose structured, XML-tagged prompts for AI work.

Tagging a prompt — `<task>`, `<context>`, `<requirements>` — helps a model tell the task
from the background and from the material you pasted in; Anthropic recommends it for exactly that.
The model does not run the XML, though: the tags are cues, and clear writing inside them matters
more. Doing it by hand in a text box is where it falls apart: a pasted `</data>` that ends its block
early, blocks in an order nobody chose, and no idea how large the thing has become. tidy-prompt is
a form for the parts and a live assembly of the whole.

It starts from a template — task brief, research, build a feature, debug an issue, code review, or
blank. There are a dozen built-in tags, and any other tag name works too.

Nothing leaves the browser. There is no backend and no network call.

## Getting started

```bash
pnpm install
```

```bash
pnpm dev
```

The app runs at `http://localhost:5180`.

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
  PROMPT_TEMPLATES, createPromptFromTemplate,
  serializeXml, serializeMarkdown,          // outputs
  serializeJson, toMessagesRequest,
  validatePrompt, validateTagName,          // checks
  suggestImprovements,                      // quality hints
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
| `toMessagesRequest` | A Messages API body — a hand-typed `role` in `system`, everything else in the user turn. |

Blocks that are disabled, or empty with no renderable children, are omitted from every output —
and from the token estimate, so the count always matches what would actually be sent.

### Decisions worth knowing

**A small vocabulary.** Twelve built-in tags, one per job: `task`, `context`, `references`,
`code`, `data`, `requirements`, `examples`, `out_of_scope`, and the bug-report and review tags
(`symptoms`, `expected_behavior`, `reproduction`, `review_focus`). `context` also carries the
codebase and stack, `code` covers both code to change and a diff to review, and `requirements` is
where "done when" goes. There is no `role`, `constraints` or `output_format`: they added little for
agent briefs, and each near-synonym is one more name to choose between. The tags tied to one kind
of brief appear in the Add tag menu only while that template is in use. A prompt that already uses
a removed name keeps it as an ordinary custom tag.

**`references` is pointers, `data` is pasted text.** An agent can read a file or follow a link, so
`references` lists where to look instead of pasting it in, where it would go stale.

**Material first, ask last.** New blocks slot in with background, code and data above the task and
the rest of the ask below it. Anthropic's prompting guidance puts long inputs above the query;
short prompts don't care, large ones do. You can still drag blocks into any order.

**Templates list tags, never content.** A template is a set of empty blocks with the main one
switched on and the rest present but off, so it can offer more than it makes you fill in. Positions
come from the tag registry, so no template repeats the material-first order. The app folds the
blocks that are off and empty; folding is view state, kept beside the document, not in it.

**Hints are heuristics, and they stay quiet.** `suggestImprovements` is a handful of mechanical
checks, with no model call: a task that is one phrase long, wording like "etc." that leaves the
model to guess, nothing saying how to tell the work is done, material pasted in with no task. Each
points at the block to fix, and none fires on a prompt that is still empty. They are a nudge, not a
grade — a prompt can pass them all and still be unclear.

**No `<thinking>` tag.** Current Claude models may decline a request to write their reasoning out,
and are steered with effort settings instead, so there is no built-in tag for it. Any tag name
still works, including `thinking` in a saved prompt.

**Content is never re-indented.** Leading whitespace is meaningful in the things people paste into
prompts — Python, YAML, diffs, log excerpts — so tags are indented by depth while content between
them is emitted exactly as typed. `serializeXml(prompt, { indentContent: true })` opts out.

**Content goes in as typed, not as XML.** The output is read by a model, not parsed, so it does not
have to be well-formed — and escaping it would change what the model sees. `if (a && b)` becoming
`if (a &amp;&amp; b)` is not the code that was pasted, and a model may copy the entities into a file.
So `&`, `<` and `>` are left alone.

**Only a block's own closing tag is guarded.** What can go wrong is structural: text inside
`<data>` that contains `</data>` reads as the block ending. When content closes the block it sits in,
or any block around it, `escapeContent` wraps it in CDATA to mark it literal, splitting around any
`]]>` so the section still closes. The match is by whole tag name, ignoring case and spacing, so
`</database>` is left alone.

**Strict XML is opt-in.** If something downstream really does parse the output,
`serializeXml(prompt, { strategy: "escape" })` entity-escapes `&` and `<`, and `"cdata"` wraps every
block. `"raw"` turns the guard off.

**Token counts are estimates.** `estimateTokens` is a heuristic — CJK characters counted
individually, chars/4 for the rest, floored by a word-based estimate — not a tokenizer. The UI
labels every figure with `≈` for that reason.

**Validation returns issues, it never throws.** A prompt being edited is allowed to be temporarily
invalid; the UI renders the problem next to the field. Checks cover tag and attribute names, empty
enabled blocks, duplicated top-level tags, content truncated mid-tag, content that already carries
the tag the composer will add, and overall size.

## Storage

`localStorage`, namespaced under `tidy-prompt:` — the working document (debounced), named saves,
remembered custom tags, and which blocks are folded. Every access degrades to "no saved state" rather than throwing, since
storage can be full or disabled. Import/export uses a versioned JSON document that also accepts a
bare prompt, regenerates missing ids, and reports malformed input instead of failing.

## Status

v1 is the standalone web app. Deliberately not built yet: your own saved templates, share-by-URL,
accounts, AI-assisted critique of a prompt, and the browser and editor plugins themselves. The core
package is shaped so each of those is additive rather than a rewrite.
