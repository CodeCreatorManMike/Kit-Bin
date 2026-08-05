/** JSON formatting, minifying, and validating. All synchronous string work, so
 * the page can run it on every keystroke if it wants to. */

export type Indent = 2 | 4 | 'tab';

export type ValidationResult =
  | { valid: true }
  | { valid: false; message: string; line: number; column: number };

function indentValue(indent: Indent): string | number {
  return indent === 'tab' ? '\t' : indent;
}

/** Pretty-prints JSON. Throws the raw parse error when the input is invalid,
 * so callers that care about the position should run `validateJson` first. */
export function formatJson(text: string, indent: Indent): string {
  return JSON.stringify(JSON.parse(text), null, indentValue(indent));
}

/** Strips all insignificant whitespace. */
export function minifyJson(text: string): string {
  return JSON.stringify(JSON.parse(text));
}

/** Converts a character offset into a 1-based line and column. */
function positionToLineColumn(text: string, position: number): { line: number; column: number } {
  const clamped = Math.max(0, Math.min(position, text.length));
  let line = 1;
  let lineStart = 0;
  for (let i = 0; i < clamped; i++) {
    if (text.charCodeAt(i) === 10 /* \n */) {
      line++;
      lineStart = i + 1;
    }
  }
  return { line, column: clamped - lineStart + 1 };
}

/** Trims the engine-appended location text so we can print our own. */
function cleanMessage(raw: string): string {
  return raw
    .replace(/\s*in JSON at position \d+(\s*\(line \d+ column \d+\))?/i, '')
    .replace(/\s*at position \d+(\s*\(line \d+ column \d+\))?/i, '')
    .replace(/\s*\(line \d+ column \d+\)/i, '')
    .replace(/\s*of the JSON data$/i, '')
    .replace(/\s*at line \d+ column \d+.*$/i, '')
    .replace(/^JSON\.parse:\s*/i, '')
    .trim()
    .replace(/[.,]$/, '');
}

/** Validates JSON and, on failure, reports a real line and column.
 *
 * Browsers disagree about what `JSON.parse` puts in the error message: V8 gives
 * a character offset ("at position 7"), newer V8 adds "(line 1 column 8)", and
 * SpiderMonkey/JavaScriptCore give line/column directly. We prefer the
 * character offset and map it onto the input ourselves, since that is the one
 * form we can always translate exactly, and fall back to any line/column the
 * engine reported. */
export function validateJson(text: string): ValidationResult {
  if (text.trim() === '') {
    return { valid: false, message: 'Nothing to validate, the input is empty', line: 1, column: 1 };
  }

  try {
    JSON.parse(text);
    return { valid: true };
  } catch (err) {
    const raw = err instanceof Error ? err.message : String(err);
    const message = cleanMessage(raw) || 'Invalid JSON';

    const positionMatch = /position (\d+)/i.exec(raw);
    if (positionMatch) {
      const { line, column } = positionToLineColumn(text, Number(positionMatch[1]));
      return { valid: false, message, line, column };
    }

    const lineColMatch = /line (\d+) column (\d+)/i.exec(raw);
    if (lineColMatch) {
      return {
        valid: false,
        message,
        line: Number(lineColMatch[1]),
        column: Number(lineColMatch[2]),
      };
    }

    // "Unexpected end of JSON input" carries no location: the problem is that
    // the document stopped early, so point at the very end of the text.
    const { line, column } = positionToLineColumn(text, text.length);
    return { valid: false, message, line, column };
  }
}
