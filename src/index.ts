import { NativeModules, Platform } from 'react-native';

const LINKING_ERROR =
  `The package 'react-native-pdf-text-extractor' doesn't seem to be linked. Make sure: \n\n` +
  Platform.select({ ios: "- You have run 'pod install'\n", default: '' }) +
  '- You rebuilt the app after installing the package\n' +
  '- You are not using Expo Go\n';

export type PdfTextExtractorErrorCode =
  | 'E_FILE_NOT_FOUND'
  | 'E_UNSUPPORTED_URI'
  | 'E_INVALID_PAGE'
  | 'E_PDF_PROCESSING'
  | 'E_INVALID_ARGUMENT';

interface RnPdfTextExtractorModule {
  getPageCount(filePath: string): Promise<number>;
  extractText(filePath: string): Promise<string>;
  extractAllText(filePath: string): Promise<string[]>;
  extractPageText(filePath: string, pageIndex: number): Promise<string>;
}

const RnPdfTextExtractor: RnPdfTextExtractorModule = NativeModules.RnPdfTextExtractor
  ? NativeModules.RnPdfTextExtractor
  : new Proxy(
      {},
      {
        get() {
          throw new Error(LINKING_ERROR);
        },
      }
    );

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
export function extractText(filePath: string): Promise<string> {
  assertFilePath(filePath);
  return RnPdfTextExtractor.extractText(filePath);
}

/**
 * Extracts the text of every page in the PDF at `filePath`, returned as one
 * string per page (index 0 = first page). Pages with no extractable text
 * (e.g. scanned/image-only pages) resolve to an empty string rather than
 * throwing.
 */
export function extractAllText(filePath: string): Promise<string[]> {
  assertFilePath(filePath);
  return RnPdfTextExtractor.extractAllText(filePath);
}

/**
 * Extracts the text of a single page (0-indexed) from the PDF at `filePath`.
 */
export function extractPageText(
  filePath: string,
  pageIndex: number
): Promise<string> {
  assertFilePath(filePath);
  assertPageIndex(pageIndex);
  return RnPdfTextExtractor.extractPageText(filePath, pageIndex);
}
