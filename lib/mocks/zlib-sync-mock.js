// Mock implementation of zlib-sync to prevent module resolution errors
// This provides stub implementations for the functions that discord.js might use

// Create a more comprehensive mock that matches zlib-sync's API
const zlibSync = {
  deflateSync: function(data, options) {
    console.warn('zlib-sync mock: deflateSync called, returning uncompressed data');
    return data;
  },
  
  inflateSync: function(data, options) {
    console.warn('zlib-sync mock: inflateSync called, returning data as-is');
    return data;
  },
  
  gzipSync: function(data, options) {
    console.warn('zlib-sync mock: gzipSync called, returning uncompressed data');
    return data;
  },
  
  gunzipSync: function(data, options) {
    console.warn('zlib-sync mock: gunzipSync called, returning data as-is');
    return data;
  },
  
  deflateRawSync: function(data, options) {
    console.warn('zlib-sync mock: deflateRawSync called, returning uncompressed data');
    return data;
  },
  
  inflateRawSync: function(data, options) {
    console.warn('zlib-sync mock: inflateRawSync called, returning data as-is');
    return data;
  },
  
  brotliCompressSync: function(data, options) {
    console.warn('zlib-sync mock: brotliCompressSync called, returning uncompressed data');
    return data;
  },
  
  brotliDecompressSync: function(data, options) {
    console.warn('zlib-sync mock: brotliDecompressSync called, returning data as-is');
    return data;
  }
};

// Export as both CommonJS and ES module
module.exports = zlibSync;
module.exports.default = zlibSync;

// Also support named exports
Object.keys(zlibSync).forEach(key => {
  module.exports[key] = zlibSync[key];
});