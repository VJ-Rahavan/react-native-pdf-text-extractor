export interface NormalizeTextOptions {
  /**
   * Strip invisible control/format characters (zero-width spaces, BOM,
   * other formatting marks) that PDF text layers sometimes embed. `\n` and
   * `\t` are always preserved. Default `true`.
   */
  stripInvisibleChars?: boolean;
  /**
   * Rejoin words that were split by a hyphen at a line-wrap, e.g.
   * `"under-\nstand"` -> `"understand"`. Default `true`.
   */
  dehyphenate?: boolean;
  /**
   * Collapse runs of 3+ newlines down to a single blank line. Default
   * `true`.
   */
  collapseBlankLines?: boolean;
  /**
   * Replace a single mid-paragraph line break with a space, while
   * preserving intentional paragraph breaks (double newlines). Default
   * `true`.
   */
  unwrapLines?: boolean;
}

// Matches \p{Cc}\p{Cf}\uFFF9-\uFFFF, excluding \n and \t via lookahead
// (Unicode property escapes can't be negated inline within a class).
const INVISIBLE_CHARS_REGEX = /(?![\n\t])[\p{Cc}\p{Cf}\uFFF9-\uFFFF]/gu;
const DEHYPHENATE_REGEX = /(\p{Ll})[-\u2010\u2011]\n(\p{Ll})/gu;
const COLLAPSE_BLANK_LINES_REGEX = /[ \t]*\n(?:[ \t]*\n)+/g;
const UNWRAP_LINES_REGEX = /([^\n])\n(?!\n)/g;
const COLLAPSE_SPACES_REGEX = /[ \t]{2,}/g;
const TRAILING_SPACE_BEFORE_NEWLINE_REGEX = /[ \t]+\n/g;

/**
 * Cleans up common PDF text-extraction artifacts -- hyphenated words split
 * across line-wraps, hard mid-sentence line breaks, invisible control
 * characters -- so the result reads as continuous prose. Useful when
 * extracted text feeds into an embedding model or other NLP pipeline.
 *
 * Pure function; each step is independently toggleable via `options` and
 * defaults to `true`. Always finishes with whitespace tidying and a final
 * `.trim()`, regardless of which steps are enabled.
 */
export function normalizeExtractedText(
  text: string,
  options: NormalizeTextOptions = {}
): string {
  const {
    stripInvisibleChars = true,
    dehyphenate = true,
    collapseBlankLines = true,
    unwrapLines = true,
  } = options;

  let result = text;

  if (stripInvisibleChars) {
    result = result.replace(INVISIBLE_CHARS_REGEX, '');
  }

  if (dehyphenate) {
    result = result.replace(DEHYPHENATE_REGEX, '$1$2');
  }

  if (collapseBlankLines) {
    result = result.replace(COLLAPSE_BLANK_LINES_REGEX, '\n\n');
  }

  if (unwrapLines) {
    result = result.replace(UNWRAP_LINES_REGEX, '$1 ');
  }

  result = result
    .replace(COLLAPSE_SPACES_REGEX, ' ')
    .replace(TRAILING_SPACE_BEFORE_NEWLINE_REGEX, '\n');

  return result.trim();
}
