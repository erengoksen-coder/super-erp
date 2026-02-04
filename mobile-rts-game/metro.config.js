/** @type {import('metro').MetroConfig} */
const config = {
  transformer: {
    getTransformOptions: async () => ({
      transform: {
        experimentalImportSupport: false,
        inlineRequires: true,
      },
    }),
  },
  resolver: {
    alias: {
      'react-native': 'react-native-web',
    },
  },
};

module.exports = config;