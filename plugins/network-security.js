const { withAndroidManifest, withInfoPlist } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

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

  // Create network security config XML file
  config = withAndroidManifest(config, (config) => {
    const androidResPath = path.join(config.modRequest.projectRoot, 'android', 'app', 'src', 'main', 'res', 'xml');
    
    // Create directories if they don't exist
    if (!fs.existsSync(androidResPath)) {
      fs.mkdirSync(androidResPath, { recursive: true });
    }
    
    // Create network security config XML
    const networkSecurityConfig = `<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
    <!-- Allow cleartext traffic for all domains (for development) -->
    <base-config cleartextTrafficPermitted="true">
        <trust-anchors>
            <certificates src="system"/>
        </trust-anchors>
    </base-config>
    
    <!-- Specific domain configurations -->
    <domain-config cleartextTrafficPermitted="true">
        <!-- Digital Ocean production backend -->
        <domain includeSubdomains="true">165.232.184.91</domain>
        
        <!-- Local development IPs -->
        <domain includeSubdomains="true">192.168.1.3</domain>
        <domain includeSubdomains="true">10.0.2.2</domain>
        <domain includeSubdomains="true">localhost</domain>
        <domain includeSubdomains="true">127.0.0.1</domain>
        
        <!-- Trust system certificates -->
        <trust-anchors>
            <certificates src="system"/>
        </trust-anchors>
    </domain-config>
</network-security-config>`;
    
    const xmlFilePath = path.join(androidResPath, 'network_security_config.xml');
    fs.writeFileSync(xmlFilePath, networkSecurityConfig);
    
    return config;
  });

  // iOS configuration
  config = withInfoPlist(config, (config) => {
    // Merge with existing NSAppTransportSecurity if it exists
    const existingATS = config.modResults.NSAppTransportSecurity || {};
    
    config.modResults.NSAppTransportSecurity = {
      ...existingATS,
      NSAllowsArbitraryLoads: true,
      NSExceptionDomains: {
        ...(existingATS.NSExceptionDomains || {}),
        '165.232.184.91': {
          NSExceptionAllowsInsecurehttpsLoads: true,
          NSExceptionMinimumTLSVersion: '1.0',
          NSExceptionRequiresForwardSecrecy: false,
          NSIncludesSubdomains: true
        },
        '192.168.1.3': {
          NSExceptionAllowsInsecurehttpsLoads: true,
          NSExceptionMinimumTLSVersion: '1.0',
          NSExceptionRequiresForwardSecrecy: false,
          NSIncludesSubdomains: true
        },
        '10.0.2.2': {
          NSExceptionAllowsInsecurehttpsLoads: true,
          NSExceptionMinimumTLSVersion: '1.0',
          NSExceptionRequiresForwardSecrecy: false,
          NSIncludesSubdomains: true
        },
        'localhost': {
          NSExceptionAllowsInsecurehttpsLoads: true,
          NSExceptionMinimumTLSVersion: '1.0',
          NSExceptionRequiresForwardSecrecy: false,
          NSIncludesSubdomains: true
        },
        '127.0.0.1': {
          NSExceptionAllowsInsecurehttpsLoads: true,
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
