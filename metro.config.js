const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Add wasm to asset extensions to prevent Metro from trying to resolve it as JS
config.resolver.assetExts.push('wasm');

module.exports = config;
