const { withAndroidManifest, withInfoPlist } = require('@expo/config-plugins');

const withNetworkSecurity = (config) => {
  // Android configuration
  config = withAndroidManifest(config, (config) => {
    const { manifest } = config.modResults;
    
    // Add network security config
    if (manifest.application && manifest.application[0]) {
      manifest.application[0]['$'] = {
        ...manifest.application[0]['$'],
        'android:networkSecurityConfig': '@xml/network_security_config'
      };
    }
    
    return config;
  });

  // iOS configuration
  config = withInfoPlist(config, (config) => {
    config.modResults.NSAppTransportSecurity = {
      NSAllowsArbitraryLoads: true,
      NSExceptionDomains: {
        '206.189.141.194': {
          NSExceptionAllowsInsecureHTTPLoads: true,
          NSExceptionMinimumTLSVersion: '1.0',
          NSExceptionRequiresForwardSecrecy: false,
          NSIncludesSubdomains: true
        }
      }
    };
    
    return config;
  });

  return config;
};

module.exports = withNetworkSecurity;
