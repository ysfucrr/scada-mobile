module.exports = function(api) {
  // Expo için cache yapılandırması
  api.cache.using(() => process.env.NODE_ENV);
  
  // Expo build sisteminde production kontrolü - KESIN PRODUCTION KONTROLÜ
  // Tüm olası production göstergelerini kontrol et
  const isProduction = 
    process.env.NODE_ENV === 'production' || 
    process.env.EXPO_PUBLIC_ENV === 'production' ||
    process.env.BABEL_ENV === 'production';
  
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Production build'lerde console.log, console.info, console.debug KESINLIKLE kaldır
      // console.error ve console.warn korunur (kritik hatalar için)
      isProduction
        ? ['transform-remove-console', { exclude: ['error', 'warn'] }]
        : null
    ].filter(Boolean),
  };
};

