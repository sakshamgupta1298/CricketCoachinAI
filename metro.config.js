const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// react-native-fast-tflite: bundle .tflite model assets via require().
config.resolver.assetExts.push('tflite');

module.exports = config;
