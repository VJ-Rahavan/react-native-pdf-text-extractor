# Changelog

## 0.1.0

Initial release.

- `getPageCount`, `extractText`, `extractAllText`, `extractPageText` APIs.
- iOS implementation backed by PDFKit.
- Android implementation backed by PdfBox-Android (`com.tom-roush:pdfbox-android`).
- Fully offline / on-device — no network access, no cloud OCR.
- Opt-in `normalize` option on `extractText`/`extractAllText`/`extractPageText`,
  plus a standalone `normalizeExtractedText` function, for cleaning up
  extraction artifacts (hyphenated line-wraps, hard line breaks, invisible
  control characters). Purely additive — default behavior is unchanged.
