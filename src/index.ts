import RnPdfTextExtractor from './NativeRnPdfTextExtractor';
import {
  normalizeExtractedText,
  type NormalizeTextOptions,
} from './normalizeExtractedText';

export { normalizeExtractedText };
export type { NormalizeTextOptions };

export type PdfTextExtractorErrorCode =
  | 'E_FILE_NOT_FOUND'
  | 'E_UNSUPPORTED_URI'
  | 'E_INVALID_PAGE'
  | 'E_PDF_PROCESSING';

function assertFilePath(filePath: string): void {
  if (typeof filePath !== 'string' || filePath.length === 0) {
    throw new Error('filePath must be a non-empty string');
  }
}

function assertPageIndex(pageIndex: number): void {
  if (
    typeof pageIndex !== 'number' ||
    !Number.isInteger(pageIndex) ||
    pageIndex < 0
  ) {
    throw new Error('pageIndex must be a non-negative integer');
  }
}

export interface ExtractOptions {
  /**
   * Clean up extraction artifacts (hyphenated line-wraps, hard line breaks,
   * invisible characters) before resolving. Omitted/`false` by default,
   * leaving text exactly as the native extractor returned it. Pass `true`
   * to normalize with the default steps, or a {@link NormalizeTextOptions}
   * object to enable only specific steps.
   */
  normalize?: boolean | NormalizeTextOptions;
}

function applyNormalize(
  text: string,
  normalize: boolean | NormalizeTextOptions | undefined
): string {
  if (!normalize) {
    return text;
  }
  return normalizeExtractedText(text, normalize === true ? undefined : normalize);
}

/**
 * Returns the number of pages in the PDF at `filePath`.
 */
export function getPageCount(filePath: string): Promise<number> {
  assertFilePath(filePath);
  return RnPdfTextExtractor.getPageCount(filePath);
}

/**
 * Extracts and concatenates the text of every page in the PDF at `filePath`
 * into a single string, in page order, separated by newlines.
 */
export function extractText(
  filePath: string,
  options: ExtractOptions = {}
): Promise<string> {
  assertFilePath(filePath);
  return RnPdfTextExtractor.extractText(filePath).then((text) =>
    applyNormalize(text, options.normalize)
  );
}

/**
 * Extracts the text of every page in the PDF at `filePath`, returned as one
 * string per page (index 0 = first page). Pages with no extractable text
 * (e.g. scanned/image-only pages) resolve to an empty string rather than
 * throwing. When `options.normalize` is set, each page is normalized
 * independently (not the joined text).
 */
export function extractAllText(
  filePath: string,
  options: ExtractOptions = {}
): Promise<string[]> {
  assertFilePath(filePath);
  return RnPdfTextExtractor.extractAllText(filePath).then((pages) =>
    pages.map((page) => applyNormalize(page, options.normalize))
  );
}

/**
 * Extracts the text of a single page (0-indexed) from the PDF at `filePath`.
 */
export function extractPageText(
  filePath: string,
  pageIndex: number,
  options: ExtractOptions = {}
): Promise<string> {
  assertFilePath(filePath);
  assertPageIndex(pageIndex);
  return RnPdfTextExtractor.extractPageText(filePath, pageIndex).then((text) =>
    applyNormalize(text, options.normalize)
  );
}
