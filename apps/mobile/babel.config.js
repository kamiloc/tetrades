module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ['babel-preset-expo', { jsxImportSource: 'nativewind' }],
      'nativewind/babel',
    ],
    // react-native-worklets/plugin MUST be last. Reanimated 4 (SDK 55)
    // requires it; transitively used by react-native-screens and the
    // navigation libs for transition animations.
    plugins: ['react-native-worklets/plugin'],
  };
};
