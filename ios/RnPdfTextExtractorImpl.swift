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

@objc(RnPdfTextExtractorImpl)
public class RnPdfTextExtractorImpl: NSObject {

  override public init() {
    super.init()
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
  public func getPageCount(
    _ filePath: String,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    DispatchQueue.global(qos: .userInitiated).async {
      do {
        let document = try self.loadDocument(filePath)
        resolve(document.pageCount)
      } catch {
        self.handle(error, reject)
      }
    }
  }

  @objc(extractText:resolve:reject:)
  public func extractText(
    _ filePath: String,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    DispatchQueue.global(qos: .userInitiated).async {
      do {
        let document = try self.loadDocument(filePath)
        var text = ""
        for i in 0..<document.pageCount {
          text += document.page(at: i)?.string ?? ""
          if i < document.pageCount - 1 {
            text += "\n"
          }
        }
        resolve(text.trimmingCharacters(in: .whitespacesAndNewlines))
      } catch {
        self.handle(error, reject)
      }
    }
  }

  @objc(extractAllText:resolve:reject:)
  public func extractAllText(
    _ filePath: String,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    DispatchQueue.global(qos: .userInitiated).async {
      do {
        let document = try self.loadDocument(filePath)
        var pages: [String] = []
        for i in 0..<document.pageCount {
          let pageText = document.page(at: i)?.string ?? ""
          pages.append(pageText.trimmingCharacters(in: .whitespacesAndNewlines))
        }
        resolve(pages)
      } catch {
        self.handle(error, reject)
      }
    }
  }

  @objc(extractPageText:pageIndex:resolve:reject:)
  public func extractPageText(
    _ filePath: String,
    pageIndex: NSNumber,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    DispatchQueue.global(qos: .userInitiated).async {
      do {
        let document = try self.loadDocument(filePath)
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
        resolve((page.string ?? "").trimmingCharacters(in: .whitespacesAndNewlines))
      } catch {
        self.handle(error, reject)
      }
    }
  }
}
