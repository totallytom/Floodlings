const { withProjectBuildGradle, withAppBuildGradle } = require('expo/config-plugins');

// RN 0.81.5's C++ sources use std::format, which requires NDK 27+'s libc++ --
// NDK 26.1's libc++ doesn't have it. Pin explicitly rather than relying on AGP's
// "pick whatever is newest installed" default, so the build is reproducible
// across machines regardless of which NDKs happen to be on disk.
const PINNED_NDK_VERSION = '27.1.12297006';

// The SDK's bundled CMake (3.22.1, from 2021) fails to link libc++ against NDK
// 27's restructured toolchain on Windows -- every std:: symbol comes back
// "undefined reference" (operator new/delete, exceptions, everything), even
// though ANDROID_STL=c++_shared is passed correctly. Reproduced in isolation
// with a bare CMakeLists.txt + one .cpp file, no Gradle/AGP involved -- CMake
// 4.4.0 (installed locally via `pip install cmake` into
// $ANDROID_HOME/cmake/4.4.0, structured as an SDK package) links it correctly.
// Windows-only: this exact SDK package won't exist on EAS's Linux build
// machines, and this bug hasn't shown up there, so only force it locally.
const PINNED_CMAKE_VERSION = '4.4.0';

const withPinnedNdkVersionForRoot = (config) =>
  withProjectBuildGradle(config, (config) => {
    if (!config.modResults.contents.includes(`ndkVersion = "${PINNED_NDK_VERSION}"`)) {
      config.modResults.contents = config.modResults.contents.replace(
        'apply plugin: "com.facebook.react.rootproject"',
        `apply plugin: "com.facebook.react.rootproject"\n\nrootProject.ext.ndkVersion = "${PINNED_NDK_VERSION}"`
      );
    }

    // Library subprojects (expo-modules-core, react-native-safe-area-context, etc.)
    // -- :app is deliberately excluded here. AGP locks :app's cmake.version DSL
    // before this late subprojects hook runs (AgpDslLockedException: "It is too
    // late to set version"), so :app is set declaratively in its own
    // build.gradle instead -- see withPinnedCmakeVersionForApp below.
    const cmakeOverrideMarker = 'Windows CMake 4.4.0 override (libraries)';
    if (process.platform === 'win32' && !config.modResults.contents.includes(cmakeOverrideMarker)) {
      config.modResults.contents += `
// ${cmakeOverrideMarker} -- see plugins/withPinnedNdkVersion.js for why.
subprojects { subproject ->
  subproject.plugins.withId('com.android.library') {
    try {
      subproject.android.externalNativeBuild.cmake.version = "${PINNED_CMAKE_VERSION}"
    } catch (Exception ignored) {
      // module has no externalNativeBuild.cmake block
    }
  }
}
`;
    }

    return config;
  });

// :app's own build.gradle -- set declaratively in the same place as
// ndkVersion, before AGP locks the DSL (see note above).
const withPinnedCmakeVersionForApp = (config) =>
  withAppBuildGradle(config, (config) => {
    if (process.platform === 'win32' && !config.modResults.contents.includes('externalNativeBuild')) {
      config.modResults.contents = config.modResults.contents.replace(
        'ndkVersion rootProject.ext.ndkVersion',
        `ndkVersion rootProject.ext.ndkVersion\n\n    // Windows CMake 4.4.0 override -- see plugins/withPinnedNdkVersion.js for why.\n    externalNativeBuild {\n        cmake {\n            version "${PINNED_CMAKE_VERSION}"\n        }\n    }`
      );
    }
    return config;
  });

const withPinnedNdkVersion = (config) =>
  withPinnedCmakeVersionForApp(withPinnedNdkVersionForRoot(config));

module.exports = withPinnedNdkVersion;
