package com.pdftextextractor

import android.net.Uri
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.WritableArray
import com.tom_roush.pdfbox.android.PDFBoxResourceLoader
import com.tom_roush.pdfbox.pdmodel.PDDocument
import com.tom_roush.pdfbox.text.PDFTextStripper
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch
import java.io.File
import java.io.FileNotFoundException
import java.io.IOException

private class UnsupportedUriException(message: String) : Exception(message)

class RnPdfTextExtractorModule(reactContext: ReactApplicationContext) :
  NativeRnPdfTextExtractorSpec(reactContext) {

  private val moduleScope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

  init {
    if (!PDFBoxResourceLoader.isReady()) {
      PDFBoxResourceLoader.init(reactContext.applicationContext)
    }
  }

  override fun invalidate() {
    super.invalidate()
    moduleScope.cancel()
  }

  private fun resolveFile(filePath: String): File {
    val uri = Uri.parse(filePath)
    if (uri.scheme == "content") {
      throw UnsupportedUriException(
        "content:// URIs are not supported. Copy the file to a local path first."
      )
    }
    val path = if (uri.scheme == "file") uri.path ?: filePath else filePath
    val file = File(path)
    if (!file.exists() || !file.isFile) {
      throw FileNotFoundException("No such file: $filePath")
    }
    return file
  }

  private fun reject(promise: Promise, e: Exception) {
    when (e) {
      is FileNotFoundException -> promise.reject("E_FILE_NOT_FOUND", e.message, e)
      is UnsupportedUriException -> promise.reject("E_UNSUPPORTED_URI", e.message, e)
      is IOException -> promise.reject("E_PDF_PROCESSING", e.message, e)
      else -> promise.reject("E_PDF_PROCESSING", e.message, e)
    }
  }

  override fun getPageCount(filePath: String, promise: Promise) {
    moduleScope.launch {
      try {
        val file = resolveFile(filePath)
        PDDocument.load(file).use { document ->
          promise.resolve(document.numberOfPages)
        }
      } catch (e: Exception) {
        reject(promise, e)
      }
    }
  }

  override fun extractText(filePath: String, promise: Promise) {
    moduleScope.launch {
      try {
        val file = resolveFile(filePath)
        PDDocument.load(file).use { document ->
          // PDFTextStripper pads its output with a trailing line separator per
          // page even when the page has no text at all, so trim the edges to
          // match the "empty string means no extractable text" contract.
          promise.resolve(PDFTextStripper().getText(document).trim())
        }
      } catch (e: Exception) {
        reject(promise, e)
      }
    }
  }

  override fun extractAllText(filePath: String, promise: Promise) {
    moduleScope.launch {
      try {
        val file = resolveFile(filePath)
        PDDocument.load(file).use { document ->
          val pages: WritableArray = Arguments.createArray()
          val stripper = PDFTextStripper()
          for (pageIndex in 0 until document.numberOfPages) {
            stripper.startPage = pageIndex + 1
            stripper.endPage = pageIndex + 1
            pages.pushString(stripper.getText(document).trim())
          }
          promise.resolve(pages)
        }
      } catch (e: Exception) {
        reject(promise, e)
      }
    }
  }

  override fun extractPageText(filePath: String, pageIndex: Double, promise: Promise) {
    val index = pageIndex.toInt()
    moduleScope.launch {
      try {
        val file = resolveFile(filePath)
        PDDocument.load(file).use { document ->
          val pageCount = document.numberOfPages
          if (index < 0 || index >= pageCount) {
            promise.reject(
              "E_INVALID_PAGE",
              "Page index $index out of range (document has $pageCount pages)"
            )
            return@use
          }
          val stripper = PDFTextStripper()
          stripper.startPage = index + 1
          stripper.endPage = index + 1
          promise.resolve(stripper.getText(document).trim())
        }
      } catch (e: Exception) {
        reject(promise, e)
      }
    }
  }

  companion object {
    const val NAME = NativeRnPdfTextExtractorSpec.NAME
  }
}
