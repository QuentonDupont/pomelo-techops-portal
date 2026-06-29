// src/components/docs/studio/editorActions.js
// Cursor-aware Markdown transforms for a plain <textarea>. Each action takes
// the current value + selection and returns { value, selStart, selEnd } so the
// caller can update state and restore the caret. No contentEditable, no deps —
// predictable round-tripping to Markdown.

// Wrap the current selection with `before`/`after` (e.g. **bold**). If nothing
// is selected, inserts the markers with `placeholder` selected so the user can
// type over it.
export function wrapSelection(value, start, end, before, after = before, placeholder = '') {
  const selected = value.slice(start, end) || placeholder;
  const next = value.slice(0, start) + before + selected + after + value.slice(end);
  return {
    value: next,
    selStart: start + before.length,
    selEnd: start + before.length + selected.length,
  };
}

// Prefix every line touched by the selection with `prefix` (e.g. "- ", "> ").
// `ordered` renumbers as 1. 2. 3. when true.
export function prefixLines(value, start, end, prefix, ordered = false) {
  const lineStart = value.lastIndexOf('\n', start - 1) + 1;
  let lineEnd = value.indexOf('\n', end);
  if (lineEnd === -1) lineEnd = value.length;
  const block = value.slice(lineStart, lineEnd);
  const lines = block.split('\n');
  const transformed = lines
    .map((ln, i) => (ordered ? `${i + 1}. ${ln}` : `${prefix}${ln}`))
    .join('\n');
  const next = value.slice(0, lineStart) + transformed + value.slice(lineEnd);
  return { value: next, selStart: lineStart, selEnd: lineStart + transformed.length };
}

// Insert a standalone block at the start of the line containing the caret,
// separated by blank lines. Returns selection spanning the inserted snippet.
export function insertBlock(value, start, end, snippet) {
  // Find end of current line so we insert after it when there is existing text.
  let lineEnd = value.indexOf('\n', end);
  if (lineEnd === -1) lineEnd = value.length;
  const before = value.slice(0, lineEnd);
  const after = value.slice(lineEnd);
  const needsLeadingBreak = before.trim().length > 0;
  const prefix = needsLeadingBreak ? '\n\n' : '';
  const text = prefix + snippet;
  const insertAt = lineEnd + prefix.length;
  const next = before + text + (after.startsWith('\n') ? after : '\n' + after);
  return { value: next, selStart: insertAt, selEnd: insertAt + snippet.length };
}

// Snippets used by the toolbar and slash menu.
export const BLOCK_SNIPPETS = {
  table: '| Column A | Column B |\n| --- | --- |\n| Cell 1 | Cell 2 |\n| Cell 3 | Cell 4 |',
  codeblock: '```js\n// code here\n```',
  divider: '---',
  info: ':::info\nUseful information goes here.\n:::',
  note: ':::note\nA note worth remembering.\n:::',
  tip: ':::tip\nA helpful tip.\n:::',
  success: ':::success\nSomething went well.\n:::',
  warning: ':::warning\nProceed with caution.\n:::',
  error: ':::error\nSomething to avoid.\n:::',
  image: '![alt text](https://)',
};
