import XCTest

@testable import RnPdfTextExtractor

final class RnPdfTextExtractorTests: XCTestCase {
  private let sut = RnPdfTextExtractor()

  private func fixturePath(_ name: String) -> String {
    let testBundle = Bundle(for: RnPdfTextExtractorTests.self)
    if let url = testBundle.url(forResource: name, withExtension: "pdf") {
      return url.path
    }
    // CocoaPods test_spec resources may land in a nested resource bundle
    // rather than directly in the test bundle.
    for bundlePath in testBundle.paths(forResourcesOfType: "bundle", inDirectory: nil) {
      if let nested = Bundle(path: bundlePath),
        let url = nested.url(forResource: name, withExtension: "pdf")
      {
        return url.path
      }
    }
    XCTFail("Missing fixture \(name).pdf in test bundle \(testBundle.bundlePath)")
    return ""
  }

  private func awaitResolve(
    _ call: (@escaping RCTPromiseResolveBlock, @escaping RCTPromiseRejectBlock) -> Void
  ) -> Any? {
    let expectation = expectation(description: "resolve")
    var result: Any?
    call(
      { value in
        result = value
        expectation.fulfill()
      },
      { code, message, _ in
        XCTFail("unexpected rejection: \(code ?? "?") \(message ?? "?")")
        expectation.fulfill()
      }
    )
    wait(for: [expectation], timeout: 5)
    return result
  }

  private func awaitReject(
    _ call: (@escaping RCTPromiseResolveBlock, @escaping RCTPromiseRejectBlock) -> Void
  ) -> String? {
    let expectation = expectation(description: "reject")
    var code: String?
    call(
      { value in
        XCTFail("expected rejection but resolved with \(String(describing: value))")
        expectation.fulfill()
      },
      { errorCode, _, _ in
        code = errorCode
        expectation.fulfill()
      }
    )
    wait(for: [expectation], timeout: 5)
    return code
  }

  func testGetPageCount_plainTextDocument() {
    let path = fixturePath("sample-plain-text")
    let result = awaitResolve { resolve, reject in
      self.sut.getPageCount(path, resolve: resolve, reject: reject)
    }
    XCTAssertEqual(result as? Int, 1)
  }

  func testGetPageCount_multiPageDocument() {
    let path = fixturePath("sample-multi-page")
    let result = awaitResolve { resolve, reject in
      self.sut.getPageCount(path, resolve: resolve, reject: reject)
    }
    XCTAssertEqual(result as? Int, 5)
  }

  func testExtractText_plainTextDocument() {
    let path = fixturePath("sample-plain-text")
    let result = awaitResolve { resolve, reject in
      self.sut.extractText(path, resolve: resolve, reject: reject)
    }
    XCTAssertTrue((result as? String ?? "").contains("PLAIN-TEXT-SAMPLE-OK"))
  }

  func testExtractAllText_multiPageDocumentHasDistinctPerPageText() {
    let path = fixturePath("sample-multi-page")
    let result = awaitResolve { resolve, reject in
      self.sut.extractAllText(path, resolve: resolve, reject: reject)
    }
    guard let pages = result as? [String] else {
      XCTFail("expected [String]")
      return
    }
    XCTAssertEqual(pages.count, 5)
    for (index, page) in pages.enumerated() {
      XCTAssertTrue(
        page.contains("MULTI-PAGE-SAMPLE-PAGE-\(index + 1)-OK"),
        "page \(index) missing its sentinel: \(page)"
      )
    }
  }

  func testExtractPageText_returnsRequestedPageOnly() {
    let path = fixturePath("sample-multi-page")
    let result = awaitResolve { resolve, reject in
      self.sut.extractPageText(path, pageIndex: 2, resolve: resolve, reject: reject)
    }
    let text = result as? String ?? ""
    XCTAssertTrue(text.contains("MULTI-PAGE-SAMPLE-PAGE-3-OK"))
    XCTAssertFalse(text.contains("PAGE-1-OK"))
    XCTAssertFalse(text.contains("PAGE-5-OK"))
  }

  func testExtractAllText_scannedImageOnlyDocumentReturnsEmptyStringsNotError() {
    let path = fixturePath("sample-scanned-image-only")
    let result = awaitResolve { resolve, reject in
      self.sut.extractAllText(path, resolve: resolve, reject: reject)
    }
    guard let pages = result as? [String] else {
      XCTFail("expected [String]")
      return
    }
    XCTAssertEqual(pages.count, 2)
    for page in pages {
      XCTAssertEqual(page, "", "scanned/image-only page should extract to an empty string")
    }
  }

  func testGetPageCount_nonexistentFileRejectsWithFileNotFound() {
    let code = awaitReject { resolve, reject in
      self.sut.getPageCount("/no/such/path.pdf", resolve: resolve, reject: reject)
    }
    XCTAssertEqual(code, "E_FILE_NOT_FOUND")
  }

  func testExtractPageText_outOfRangeIndexRejectsWithInvalidPage() {
    let path = fixturePath("sample-plain-text")
    let code = awaitReject { resolve, reject in
      self.sut.extractPageText(path, pageIndex: 99, resolve: resolve, reject: reject)
    }
    XCTAssertEqual(code, "E_INVALID_PAGE")
  }
}
