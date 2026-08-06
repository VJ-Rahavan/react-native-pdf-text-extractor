import Foundation
import PDFKit
import React

enum PdfTextExtractorError: Error {
  case fileNotFound
  case unsupportedUri
  case processingFailed

  var code: String {
    switch self {
    case .fileNotFound: return "E_FILE_NOT_FOUND"
    case .unsupportedUri: return "E_UNSUPPORTED_URI"
    case .processingFailed: return "E_PDF_PROCESSING"
    }
  }

  var message: String {
    switch self {
    case .fileNotFound:
      return "No such file or the path could not be resolved."
    case .unsupportedUri:
      return "content:// URIs are not supported. Copy the file to a local path first."
    case .processingFailed:
      return "The file could not be opened as a PDF. It may be corrupt, encrypted, or not a PDF."
    }
  }
}

@objc(RnPdfTextExtractor)
class RnPdfTextExtractor: NSObject {

  @objc
  static func requiresMainQueueSetup() -> Bool {
    return false
  }

  private func resolveURL(_ filePath: String) throws -> URL {
    if filePath.hasPrefix("content://") {
      throw PdfTextExtractorError.unsupportedUri
    }
    if let url = URL(string: filePath), url.scheme != nil {
      return url
    }
    return URL(fileURLWithPath: filePath)
  }

  private func loadDocument(_ filePath: String) throws -> PDFDocument {
    let url = try resolveURL(filePath)
    guard FileManager.default.fileExists(atPath: url.path) else {
      throw PdfTextExtractorError.fileNotFound
    }
    guard let document = PDFDocument(url: url) else {
      throw PdfTextExtractorError.processingFailed
    }
    return document
  }

  private func handle(_ error: Error, _ reject: RCTPromiseRejectBlock) {
    if let pdfError = error as? PdfTextExtractorError {
      reject(pdfError.code, pdfError.message, error)
    } else {
      reject("E_PDF_PROCESSING", error.localizedDescription, error)
    }
  }

  @objc(getPageCount:resolve:reject:)
  func getPageCount(
    _ filePath: String,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    do {
      let document = try loadDocument(filePath)
      resolve(document.pageCount)
    } catch {
      handle(error, reject)
    }
  }

  @objc(extractText:resolve:reject:)
  func extractText(
    _ filePath: String,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    do {
      let document = try loadDocument(filePath)
      var text = ""
      for i in 0..<document.pageCount {
        text += document.page(at: i)?.string ?? ""
        if i < document.pageCount - 1 {
          text += "\n"
        }
      }
      resolve(text)
    } catch {
      handle(error, reject)
    }
  }

  @objc(extractAllText:resolve:reject:)
  func extractAllText(
    _ filePath: String,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    do {
      let document = try loadDocument(filePath)
      var pages: [String] = []
      for i in 0..<document.pageCount {
        pages.append(document.page(at: i)?.string ?? "")
      }
      resolve(pages)
    } catch {
      handle(error, reject)
    }
  }

  @objc(extractPageText:pageIndex:resolve:reject:)
  func extractPageText(
    _ filePath: String,
    pageIndex: NSNumber,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    do {
      let document = try loadDocument(filePath)
      let index = pageIndex.intValue
      guard index >= 0 && index < document.pageCount else {
        reject(
          "E_INVALID_PAGE",
          "Page index \(index) out of range (document has \(document.pageCount) pages)",
          nil
        )
        return
      }
      guard let page = document.page(at: index) else {
        reject("E_PDF_PROCESSING", "Unable to load page \(index)", nil)
        return
      }
      resolve(page.string ?? "")
    } catch {
      handle(error, reject)
    }
  }
}
