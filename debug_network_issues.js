// Comprehensive Network Debugging Tool for CrickCoach APK
// Add this to your mobile app to debug network connectivity issues

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

class NetworkDebugger {
  constructor() {
    this.debugLogs = [];
    this.testResults = {};
  }

  // Log debug information
  log(message, data = null) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      message,
      data,
      platform: Platform.OS,
      platformVersion: Platform.Version
    };
    this.debugLogs.push(logEntry);
    console.log(`🔍 [DEBUG] ${message}`, data || '');
  }

  // Test basic network connectivity
  async testBasicConnectivity() {
    this.log('Testing basic network connectivity...');
    
    try {
      // Test with fetch
      const response = await fetch('https://httpbin.org/get', {
        method: 'GET',
        timeout: 10000
      });
      
      if (response.ok) {
        this.log('✅ Basic internet connectivity: OK');
        return true;
      } else {
        this.log('❌ Basic internet connectivity: Failed', { status: response.status });
        return false;
      }
    } catch (error) {
      this.log('❌ Basic internet connectivity: Error', { error: error.message });
      return false;
    }
  }

  // Test backend connectivity with different methods
  async testBackendConnectivity() {
    this.log('Testing backend connectivity...');
    
    const testUrls = [
      'http://165.232.184.91:3000',
      'https://165.232.184.91:3000',
      'http://165.232.184.91:3000/api/health',
      'https://165.232.184.91:3000/api/health'
    ];

    for (const url of testUrls) {
      try {
        this.log(`📡 Testing URL: ${url}`);
        
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          timeout: 15000
        });

        this.log(`📊 Response for ${url}:`, {
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries())
        });

        if (response.ok) {
          const data = await response.text();
          this.log(`✅ Success for ${url}`, { data });
          this.testResults[url] = { success: true, status: response.status, data };
        } else {
          this.log(`⚠️ Response not OK for ${url}`, { status: response.status });
          this.testResults[url] = { success: false, status: response.status };
        }
      } catch (error) {
        this.log(`❌ Error for ${url}`, { 
          error: error.message, 
          errorType: error.constructor.name,
          errorStack: error.stack 
        });
        this.testResults[url] = { success: false, error: error.message };
      }
    }
  }

  // Test specific API endpoints
  async testAPIEndpoints() {
    this.log('Testing specific API endpoints...');
    
    const baseUrl = 'http://165.232.184.91:3000';
    const endpoints = [
      '/api/health',
      '/api/auth/register',
      '/api/auth/login'
    ];

    for (const endpoint of endpoints) {
      try {
        const url = `${baseUrl}${endpoint}`;
        this.log(`🔗 Testing endpoint: ${endpoint}`);
        
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: 10000
        });

        this.log(`📊 Endpoint ${endpoint} response:`, {
          status: response.status,
          statusText: response.statusText
        });

        if (response.ok) {
          const data = await response.text();
          this.log(`✅ Endpoint ${endpoint} success`, { data });
        } else {
          this.log(`⚠️ Endpoint ${endpoint} failed`, { status: response.status });
        }
      } catch (error) {
        this.log(`❌ Endpoint ${endpoint} error`, { error: error.message });
      }
    }
  }

  // Test with different HTTP methods
  async testHTTPMethods() {
    this.log('Testing different HTTP methods...');
    
    const baseUrl = 'http://165.232.184.91:3000/api/health';
    const methods = ['GET', 'POST', 'OPTIONS'];

    for (const method of methods) {
      try {
        this.log(`🔗 Testing ${method} method`);
        
        const response = await fetch(baseUrl, {
          method: method,
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: 10000
        });

        this.log(`📊 ${method} method response:`, {
          status: response.status,
          statusText: response.statusText
        });
      } catch (error) {
        this.log(`❌ ${method} method error`, { error: error.message });
      }
    }
  }

  // Test CORS and headers
  async testCORSAndHeaders() {
    this.log('Testing CORS and headers...');
    
    try {
      const response = await fetch('http://165.232.184.91:3000/api/health', {
        method: 'OPTIONS',
        headers: {
          'Origin': 'https://example.com',
          'Access-Control-Request-Method': 'POST',
          'Access-Control-Request-Headers': 'Content-Type'
        },
        timeout: 10000
      });

      this.log('📊 CORS response headers:', {
        status: response.status,
        headers: Object.fromEntries(response.headers.entries())
      });
    } catch (error) {
      this.log('❌ CORS test error', { error: error.message });
    }
  }

  // Get device information
  getDeviceInfo() {
    const deviceInfo = {
      platform: Platform.OS,
      platformVersion: Platform.Version,
      isDev: __DEV__,
      userAgent: navigator?.userAgent || 'React Native',
      timestamp: new Date().toISOString()
    };
    
    this.log('📱 Device information:', deviceInfo);
    return deviceInfo;
  }

  // Save debug logs
  async saveDebugLogs() {
    try {
      const debugData = {
        timestamp: new Date().toISOString(),
        deviceInfo: this.getDeviceInfo(),
        testResults: this.testResults,
        logs: this.debugLogs
      };
      
      await AsyncStorage.setItem('network_debug_logs', JSON.stringify(debugData));
      this.log('💾 Debug logs saved to AsyncStorage');
      
      return debugData;
    } catch (error) {
      this.log('❌ Failed to save debug logs', { error: error.message });
    }
  }

  // Run comprehensive network test
  async runComprehensiveTest() {
    this.log('🚀 Starting comprehensive network test...');
    
    // Get device info
    this.getDeviceInfo();
    
    // Test basic connectivity
    await this.testBasicConnectivity();
    
    // Test backend connectivity
    await this.testBackendConnectivity();
    
    // Test API endpoints
    await this.testAPIEndpoints();
    
    // Test HTTP methods
    await this.testHTTPMethods();
    
    // Test CORS
    await this.testCORSAndHeaders();
    
    // Save results
    const debugData = await this.saveDebugLogs();
    
    this.log('✅ Comprehensive network test completed');
    
    return {
      success: Object.values(this.testResults).some(result => result.success),
      debugData,
      summary: this.generateSummary()
    };
  }

  // Generate test summary
  generateSummary() {
    const totalTests = Object.keys(this.testResults).length;
    const successfulTests = Object.values(this.testResults).filter(result => result.success).length;
    
    return {
      totalTests,
      successfulTests,
      successRate: `${(successfulTests / totalTests * 100).toFixed(1)}%`,
      recommendations: this.generateRecommendations()
    };
  }

  // Generate recommendations based on test results
  generateRecommendations() {
    const recommendations = [];
    
    if (!Object.values(this.testResults).some(result => result.success)) {
      recommendations.push('🔴 No successful connections - Check backend status and network configuration');
    }
    
    if (this.testResults['http://165.232.184.91:3000']?.success && !this.testResults['https://165.232.184.91:3000']?.success) {
      recommendations.push('🟡 HTTP works but HTTPS fails - Consider setting up SSL certificates');
    }
    
    if (this.testResults['http://165.232.184.91:3000']?.success && !this.testResults['http://165.232.184.91:3000/api/health']?.success) {
      recommendations.push('🟡 Base URL works but API endpoints fail - Check API routing');
    }
    
    return recommendations;
  }
}

export default NetworkDebugger;
