import { normalizeExtractedText } from '../normalizeExtractedText';

const ZERO_WIDTH_SPACE = String.fromCharCode(0x200b);
const BELL_CONTROL_CHAR = String.fromCharCode(0x0007);

describe('normalizeExtractedText (pure function)', () => {
  it('dehyphenates a word split across a line-wrap', () => {
    expect(normalizeExtractedText('under-\nstand this')).toBe(
      'understand this'
    );
  });

  it('unwraps a mid-sentence line break but preserves paragraph breaks', () => {
    const input =
      'This is line one\nthis is line two.\n\nNew paragraph here.';
    expect(normalizeExtractedText(input)).toBe(
      'This is line one this is line two.\n\nNew paragraph here.'
    );
  });

  it('collapses 3+ blank lines down to a single blank line', () => {
    const input = 'Para one.\n\n\n\nPara two.';
    expect(normalizeExtractedText(input)).toBe('Para one.\n\nPara two.');
  });

  it('strips invisible control/format characters but keeps newlines and tabs', () => {
    const input = `Hello${ZERO_WIDTH_SPACE}world${BELL_CONTROL_CHAR}!\n\tTabbed line`;
    // Isolate stripInvisibleChars: unwrapLines is on by default and would
    // otherwise turn this test's own "\n\t" into a space, unrelated to what
    // this test is checking.
    expect(normalizeExtractedText(input, { unwrapLines: false })).toBe(
      'Helloworld!\n\tTabbed line'
    );
  });

  it('leaves the hyphen and unwraps the line instead when dehyphenate is disabled', () => {
    expect(
      normalizeExtractedText('under-\nstand this', { dehyphenate: false })
    ).toBe('under- stand this');
  });

  it('returns an empty string for empty string input', () => {
    expect(normalizeExtractedText('')).toBe('');
  });
});

// The remaining tests exercise `normalize` as wired through extractText /
// extractAllText, so they need the same native-module mock as
// index.test.ts.
const mockNativeModule = {
  getPageCount: jest.fn(),
  extractText: jest.fn(),
  extractAllText: jest.fn(),
  extractPageText: jest.fn(),
};

jest.mock('react-native', () => ({
  NativeModules: { RnPdfTextExtractor: mockNativeModule },
  Platform: { select: (obj: Record<string, unknown>) => obj.ios ?? obj.default },
}));

import type * as IndexModule from '../index';

// Required (not imported) after jest.mock for the same reason as
// index.test.ts: a top-level `import` gets hoisted above `jest.mock` by the
// RN jest preset's custom test environment, which defeats the mock.
const { extractText, extractAllText } = require('../index') as typeof IndexModule;

describe('normalize option wired through extractText/extractAllText', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('leaves text untouched when normalize is omitted', async () => {
    mockNativeModule.extractText.mockResolvedValueOnce('under-\nstand this');
    await expect(extractText('/tmp/a.pdf')).resolves.toBe('under-\nstand this');
  });

  it('cleans text when normalize is true', async () => {
    mockNativeModule.extractText.mockResolvedValueOnce('under-\nstand this');
    await expect(
      extractText('/tmp/a.pdf', { normalize: true })
    ).resolves.toBe('understand this');
  });

  it('only applies the specified steps when given a partial options object', async () => {
    mockNativeModule.extractText.mockResolvedValueOnce('under-\nstand this');
    // dehyphenate disabled, but unwrapLines (unspecified) still defaults to
    // true, so the hyphen survives while the line-wrap still gets unwrapped.
    await expect(
      extractText('/tmp/a.pdf', { normalize: { dehyphenate: false } })
    ).resolves.toBe('under- stand this');
  });

  it('normalizes each page of extractAllText independently', async () => {
    mockNativeModule.extractAllText.mockResolvedValueOnce([
      'under-\nstand',
      'another-\npage',
    ]);
    await expect(
      extractAllText('/tmp/a.pdf', { normalize: true })
    ).resolves.toEqual(['understand', 'anotherpage']);
  });

  it('leaves extractAllText pages untouched when normalize is omitted', async () => {
    mockNativeModule.extractAllText.mockResolvedValueOnce([
      'under-\nstand',
      '',
    ]);
    await expect(extractAllText('/tmp/a.pdf')).resolves.toEqual([
      'under-\nstand',
      '',
    ]);
  });
});
