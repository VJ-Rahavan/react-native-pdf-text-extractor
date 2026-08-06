#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(RnPdfTextExtractor, NSObject)

RCT_EXTERN_METHOD(getPageCount:(NSString *)filePath
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(extractText:(NSString *)filePath
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(extractAllText:(NSString *)filePath
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(extractPageText:(NSString *)filePath
                  pageIndex:(nonnull NSNumber *)pageIndex
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

@end
