export type {
  Block,
  Prompt,
  ValidationIssue,
  IssueSeverity,
  CreateBlockInput,
} from "./types.js";
export { SCHEMA_VERSION, emptyPrompt, createBlock, createId } from "./types.js";

export type { TagDefinition } from "./tags.js";
export {
  BUILTIN_TAGS,
  DEFAULT_SYSTEM_TAGS,
  getTagDefinition,
  isBuiltinTag,
  isMaterialTag,
  humanizeTag,
} from "./tags.js";

export { createStarterPrompt } from "./starter.js";

export type { PromptTemplate, TemplateBlock } from "./templates.js";
export {
  PROMPT_TEMPLATES,
  DEFAULT_TEMPLATE_ID,
  getTemplate,
  createPromptFromTemplate,
} from "./templates.js";

export { suggestImprovements } from "./suggest.js";

export {
  escapeXmlText,
  escapeXmlAttribute,
  escapeContent,
  looksLikeMarkup,
  wrapCdata,
} from "./escape.js";
export type { EscapeContentOptions } from "./escape.js";

export {
  validateTagName,
  isValidTagName,
  suggestTagName,
  validatePrompt,
} from "./validate.js";
export type { ValidatePromptOptions } from "./validate.js";

export { estimateTokens, estimateBlockTokens, estimatePromptTokens } from "./tokens.js";
export type { PromptTokenEstimate } from "./tokens.js";

export { serializeXml, serializeBlock, isRenderable } from "./serialize/xml.js";
export type { SerializeXmlOptions } from "./serialize/xml.js";

export { serializeMarkdown } from "./serialize/markdown.js";
export type { SerializeMarkdownOptions } from "./serialize/markdown.js";

export {
  serializeJson,
  serializeJsonObject,
  toMessagesRequest,
  serializeMessagesRequest,
} from "./serialize/json.js";
export type { JsonValue, MessagesRequest, MessagesRequestOptions } from "./serialize/json.js";

export { parsePromptDocument, toPromptDocument } from "./document.js";
export type { PromptDocument } from "./document.js";
