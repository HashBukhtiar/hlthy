// Mock module for metro-runtime HMR on web platform
// This prevents "MetroHMRClient.default is not a constructor" errors

module.exports = {
  default: function MetroHMRClientMock() {
    // Mock HMR client that does nothing
    return {
      on: () => {},
      off: () => {},
      send: () => {},
      close: () => {},
    };
  },
  setup: () => {},
  enable: () => {},
  disable: () => {},
};
