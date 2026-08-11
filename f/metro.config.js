const { getDefaultConfig } = require('expo/metro-config');

module.exports = (() => {
  const config = getDefaultConfig(__dirname);
  const { transformer, resolver } = config;

  // 💡 核心拦截：把 svg 的解析权交给 transformer，而不是当作普通静态图片
  config.transformer = {
    ...transformer,
    babelTransformerPath: require.resolve('react-native-svg-transformer/expo'),
  };

  config.resolver = {
    ...resolver,
    assetExts: resolver.assetExts.filter((ext) => ext !== 'svg'), // 从静态资源里移除 svg
    sourceExts: [...resolver.sourceExts, 'svg'], // 把 svg 当作源码文件来解析
  };

  return config;
})();
