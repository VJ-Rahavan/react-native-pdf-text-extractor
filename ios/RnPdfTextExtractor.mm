#import "RnPdfTextExtractor.h"

#import <RnPdfTextExtractorSpec/RnPdfTextExtractorSpec.h>

#if __has_include("RnPdfTextExtractor-Swift.h")
#import "RnPdfTextExtractor-Swift.h"
#else
#import <RnPdfTextExtractor/RnPdfTextExtractor-Swift.h>
#endif

@interface RnPdfTextExtractor () <NativeRnPdfTextExtractorSpec>
@end

@implementation RnPdfTextExtractor {
  RnPdfTextExtractorImpl *_impl;
}

RCT_EXPORT_MODULE()

+ (BOOL)requiresMainQueueSetup
{
  return NO;
}

- (instancetype)init
{
  if (self = [super init]) {
    _impl = [RnPdfTextExtractorImpl new];
  }
  return self;
}

- (void)getPageCount:(NSString *)filePath
              resolve:(RCTPromiseResolveBlock)resolve
               reject:(RCTPromiseRejectBlock)reject
{
  [_impl getPageCount:filePath resolve:resolve reject:reject];
}

- (void)extractText:(NSString *)filePath
             resolve:(RCTPromiseResolveBlock)resolve
              reject:(RCTPromiseRejectBlock)reject
{
  [_impl extractText:filePath resolve:resolve reject:reject];
}

- (void)extractAllText:(NSString *)filePath
                resolve:(RCTPromiseResolveBlock)resolve
                 reject:(RCTPromiseRejectBlock)reject
{
  [_impl extractAllText:filePath resolve:resolve reject:reject];
}

- (void)extractPageText:(NSString *)filePath
               pageIndex:(double)pageIndex
                 resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject
{
  [_impl extractPageText:filePath pageIndex:@(pageIndex) resolve:resolve reject:reject];
}

- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
    (const facebook::react::ObjCTurboModule::InitParams &)params
{
  return std::make_shared<facebook::react::NativeRnPdfTextExtractorSpecJSI>(params);
}

@end
