const mockNativeModule = {
  getPageCount: jest.fn(),
  extractText: jest.fn(),
  extractAllText: jest.fn(),
  extractPageText: jest.fn(),
};

jest.mock('../NativeRnPdfTextExtractor', () => ({
  __esModule: true,
  default: mockNativeModule,
}));

import type * as IndexModule from '../index';

// Required (not imported) after jest.mock so the mock is registered before
// '../index' evaluates the native module at module scope. A plain top-level
// `import` gets hoisted above `jest.mock` by the RN jest preset's custom test
// environment, which defeats the mock.
const { getPageCount, extractText, extractAllText, extractPageText } =
  require('../index') as typeof IndexModule;

describe('argument validation (JS layer, no native call)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('throws synchronously for an empty filePath', () => {
    expect(() => getPageCount('')).toThrow(/non-empty string/);
    expect(mockNativeModule.getPageCount).not.toHaveBeenCalled();
  });

  it('throws synchronously for a non-string filePath', () => {
    // @ts-expect-error intentionally wrong type
    expect(() => extractText(42)).toThrow(/non-empty string/);
  });

  it('throws synchronously for a negative pageIndex', () => {
    expect(() => extractPageText('/tmp/a.pdf', -1)).toThrow(
      /non-negative integer/
    );
    expect(mockNativeModule.extractPageText).not.toHaveBeenCalled();
  });

  it('throws synchronously for a non-integer pageIndex', () => {
    expect(() => extractPageText('/tmp/a.pdf', 1.5)).toThrow(
      /non-negative integer/
    );
  });
});

describe('native calls and rejection propagation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('forwards a valid getPageCount call to native and resolves its result', async () => {
    mockNativeModule.getPageCount.mockResolvedValueOnce(3);
    await expect(getPageCount('/tmp/a.pdf')).resolves.toBe(3);
    expect(mockNativeModule.getPageCount).toHaveBeenCalledWith('/tmp/a.pdf');
  });

  it('propagates E_FILE_NOT_FOUND rejections from native unchanged', async () => {
    const error = Object.assign(new Error('No such file: /tmp/missing.pdf'), {
      code: 'E_FILE_NOT_FOUND',
    });
    mockNativeModule.extractText.mockRejectedValueOnce(error);
    await expect(extractText('/tmp/missing.pdf')).rejects.toMatchObject({
      code: 'E_FILE_NOT_FOUND',
    });
  });

  it('propagates E_INVALID_PAGE rejections from native unchanged', async () => {
    const error = Object.assign(new Error('Page index 99 out of range'), {
      code: 'E_INVALID_PAGE',
    });
    mockNativeModule.extractPageText.mockRejectedValueOnce(error);
    await expect(extractPageText('/tmp/a.pdf', 99)).rejects.toMatchObject({
      code: 'E_INVALID_PAGE',
    });
  });

  it('resolves extractAllText with per-page strings, including empty pages', async () => {
    mockNativeModule.extractAllText.mockResolvedValueOnce(['hello', '']);
    await expect(extractAllText('/tmp/a.pdf')).resolves.toEqual([
      'hello',
      '',
    ]);
  });
});
