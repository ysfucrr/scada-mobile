module.exports = function(api) {
  api.cache(true);
  
  // Expo build sisteminde production kontrolü
  // Hem NODE_ENV hem de Expo'nun build modunu kontrol et
  const isProduction = 
    process.env.NODE_ENV === 'production' || 
    process.env.EXPO_PUBLIC_ENV === 'production' ||
    api.env('production');
  
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Production build'lerde console.log, console.info, console.debug kaldır
      // console.error ve console.warn korunur (kritik hatalar için)
      isProduction
        ? ['transform-remove-console', { exclude: ['error', 'warn'] }]
        : null
    ].filter(Boolean),
  };
};

