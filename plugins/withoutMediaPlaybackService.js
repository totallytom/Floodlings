const { withAndroidManifest } = require('expo/config-plugins');

const REMOVED_PERMISSIONS = [
  'android.permission.FOREGROUND_SERVICE',
  'android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK',
];

const REMOVED_SERVICE = 'expo.modules.audio.service.AudioControlsService';

// expo-audio's native manifest always declares a media-session foreground
// service for background playback controls, which we never use (SFX only,
// played in the foreground). Gradle's manifest merger only honors tools:node
// markers placed in the app's own manifest -- library manifests (like
// expo-audio's) are merged in at build time, after prebuild -- so these
// entries must be added here rather than filtered out of modResults.
const withoutMediaPlaybackService = (config) =>
  withAndroidManifest(config, (config) => {
    const manifest = config.modResults.manifest;

    manifest.$['xmlns:tools'] = 'http://schemas.android.com/tools';

    if (!Array.isArray(manifest['uses-permission'])) {
      manifest['uses-permission'] = [];
    }
    for (const name of REMOVED_PERMISSIONS) {
      manifest['uses-permission'].push({
        $: { 'android:name': name, 'tools:node': 'remove' },
      });
    }

    const application = manifest.application?.[0];
    if (application) {
      if (!Array.isArray(application.service)) {
        application.service = [];
      }
      application.service.push({
        $: { 'android:name': REMOVED_SERVICE, 'tools:node': 'remove' },
      });
    }

    return config;
  });

module.exports = withoutMediaPlaybackService;
