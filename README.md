# react-native-pdf-text-extractor

Fully offline, on-device PDF text extraction for React Native. No network
calls, no cloud OCR — text is extracted locally using each platform's native
PDF stack:

- **iOS** — [PDFKit](https://developer.apple.com/documentation/pdfkit)
- **Android** — [PdfBox-Android](https://github.com/TomRoush/PdfBox-Android) (`com.tom-roush:pdfbox-android`)

This library extracts text embedded in a PDF (e.g. text layers, generated
documents). It does **not** perform OCR — scanned/image-only pages will
resolve to an empty string rather than throwing.

## Installation

```sh
npm install react-native-pdf-text-extractor
```

### iOS

```sh
cd ios && pod install
```

Requires iOS 15.1+.

### Android

No extra setup — `com.tom-roush:pdfbox-android` resolves automatically from
Maven Central. Minimum SDK 24.

## Usage

```ts
import {
  getPageCount,
  extractText,
  extractAllText,
  extractPageText,
} from 'react-native-pdf-text-extractor';

const pageCount = await getPageCount(filePath);
// 12

const wholeDocument = await extractText(filePath);
// "Page 1 text\nPage 2 text\n..."

const perPage = await extractAllText(filePath);
// ["Page 1 text", "Page 2 text", ...]

const secondPage = await extractPageText(filePath, 1); // 0-indexed
// "Page 2 text"
```

## API

### `getPageCount(filePath: string): Promise<number>`

Resolves with the number of pages in the PDF.

### `extractText(filePath: string, options?: ExtractOptions): Promise<string>`

Extracts the text of every page and concatenates it into a single string,
separated by newlines.

Pass `{ normalize: true }` to clean up common extraction artifacts (see
[Text normalization](#text-normalization)) before the promise resolves.
Omitting `options` leaves the text exactly as extracted, unchanged from
previous versions.

```ts
await extractText(filePath, { normalize: true });
// runs every normalization step with its default settings

await extractText(filePath, { normalize: { dehyphenate: false } });
// runs normalization, but leaves hyphenated line-wraps alone
```

### `extractAllText(filePath: string, options?: ExtractOptions): Promise<string[]>`

Extracts the text of every page, returned as one string per page (index 0 is
the first page). A page with no extractable text (e.g. a scanned image with
no OCR layer) resolves to `''` rather than throwing.

The `normalize` option (see [Text normalization](#text-normalization))
applies to each page independently, not to the array as a whole:

```ts
await extractAllText(filePath, { normalize: true });

await extractAllText(filePath, {
  normalize: { stripInvisibleChars: true, unwrapLines: false },
});
```

### `extractPageText(filePath: string, pageIndex: number, options?: ExtractOptions): Promise<string>`

Extracts the text of a single page. `pageIndex` is 0-indexed.

```ts
await extractPageText(filePath, 1, { normalize: true });
```

## Text normalization

PDF text layers often carry artifacts that are harmless to read but noisy
for downstream NLP — words split by a hyphen at a line-wrap, hard line
breaks in the middle of a sentence, invisible control/format characters. The
`normalize` option on `extractText`, `extractAllText`, and `extractPageText`
(and the standalone `normalizeExtractedText` function) cleans these up.
This is **opt-in** — omitting `options` (or passing `normalize: false`)
leaves extracted text exactly as returned by the native extractor.

```ts
import { normalizeExtractedText } from 'react-native-pdf-text-extractor';

normalizeExtractedText('under-\nstand this'); // "understand this"
```

`normalize` accepts either `true` (run every step below with its default)
or a partial `NormalizeTextOptions` object (unspecified steps still default
to `true`):

| Option               | Default | Effect                                                              |
| --------------------- | ------- | --------------------------------------------------------------------- |
| `stripInvisibleChars` | `true`  | Removes invisible control/format characters (zero-width spaces, etc.), keeping `\n` and `\t`. |
| `dehyphenate`         | `true`  | Rejoins a word split by a hyphen at a line-wrap, e.g. `"under-\nstand"` -> `"understand"`. |
| `collapseBlankLines`  | `true`  | Collapses runs of 3+ newlines down to a single blank line.          |
| `unwrapLines`         | `true`  | Replaces a single mid-paragraph line break with a space, while preserving real paragraph breaks (`\n\n`). |

Whitespace is always tidied (runs of spaces/tabs collapsed, trailing
spaces before a newline stripped) and the result is always `.trim()`ed,
regardless of which steps above are enabled.

## `filePath`

All methods take a local file system path — either a bare absolute path
(`/data/.../document.pdf`) or a `file://` URL. Remote URLs and `content://`
URIs (as returned directly by some Android document pickers) are **not**
supported; copy the file to a local path first (e.g. with
[`react-native-document-picker`](https://github.com/rnmods/react-native-document-picker)'s
`copyTo: 'cachesDirectory'` option, or
[`react-native-fs`](https://github.com/itinance/react-native-fs)).

## Errors

Rejections carry one of the following codes:

| Code                | Meaning                                                             |
| -------------------- | -------------------------------------------------------------------- |
| `E_FILE_NOT_FOUND`   | No file exists at the given path.                                    |
| `E_UNSUPPORTED_URI`  | A `content://` URI was passed instead of a local file path.          |
| `E_INVALID_PAGE`     | `pageIndex` is out of range for the document.                        |
| `E_PDF_PROCESSING`   | The file could not be parsed as a PDF (corrupt, encrypted, etc.).    |

`filePath` and `pageIndex` are also validated synchronously in JS before any
native call is made — passing a non-string path or a non-integer/negative
page index throws immediately rather than rejecting a promise.

## Example app

See [`example/`](./example) for a runnable app that picks a PDF (or falls
back to bundled sample PDFs) and displays extracted text.

## License

MIT
# react-native-pdf-text-extractor
