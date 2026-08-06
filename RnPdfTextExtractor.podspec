require "json"

package = JSON.parse(File.read(File.join(__dir__, "package.json")))

# `install_modules_dependencies` is defined by react_native_pods.rb. The
# consuming app's Podfile normally requires it before evaluating this
# podspec, but standalone tooling (`pod lib lint`, `pod spec lint`) doesn't
# go through a Podfile at all, so require it defensively here too, the same
# way the example app's Podfile locates it via Node module resolution.
unless respond_to?(:install_modules_dependencies)
  require Pod::Executable.execute_command('node', ['-p',
    'require.resolve(
      "react-native/scripts/react_native_pods.rb",
      {paths: [process.argv[1]]},
    )', __dir__]).strip
end

Pod::Spec.new do |s|
  s.name         = "RnPdfTextExtractor"
  s.version      = package["version"]
  s.summary      = package["description"]
  s.homepage     = package["homepage"]
  s.license      = package["license"]
  s.authors      = package["author"]

  s.platforms    = { :ios => "15.1" }
  s.source       = { :git => package["repository"]["url"], :tag => "v#{s.version}" }

  s.source_files  = "ios/**/*.{h,m,mm,swift}"
  s.exclude_files = "ios/Tests/**/*"
  s.frameworks    = "PDFKit"

  s.pod_target_xcconfig = {
    "DEFINES_MODULE" => "YES"
  }

  install_modules_dependencies(s)

  s.test_spec "Tests" do |test_spec|
    test_spec.source_files = "ios/Tests/**/*.swift"
    test_spec.resources    = ["example/assets/*.pdf"]
  end
end
