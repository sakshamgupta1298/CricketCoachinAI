import React, { useState } from 'react';
import { Alert, ScrollView, Text, TouchableOpacity, View } from 'react-native';

const SimpleNetworkTest: React.FC = () => {
  const [results, setResults] = useState<string[]>([]);
  const [isTesting, setIsTesting] = useState(false);

  const addResult = (message: string) => {
    setResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const testConnection = async () => {
    setIsTesting(true);
    setResults([]);
    
    addResult('🚀 Starting network test...');
    
    // Test 1: Basic internet connectivity
    try {
      addResult('📡 Testing basic internet connectivity...');
      const response = await fetch('https://httpbin.org/get', {
        method: 'GET',
        timeout: 10000
      });
      
      if (response.ok) {
        addResult('✅ Basic internet connectivity: OK');
      } else {
        addResult(`❌ Basic internet connectivity: Failed (${response.status})`);
      }
    } catch (error) {
      addResult(`❌ Basic internet connectivity: Error - ${error.message}`);
    }

    // Test 2: Backend health check
    try {
      addResult('🏥 Testing backend health endpoint...');
      const response = await fetch('http://206.189.141.194:3000/api/health', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      addResult(`📊 Backend response status: ${response.status}`);
      
      if (response.ok) {
        const data = await response.text();
        addResult(`✅ Backend health check: OK - ${data}`);
      } else {
        addResult(`❌ Backend health check: Failed (${response.status})`);
      }
    } catch (error) {
      addResult(`❌ Backend health check: Error - ${error.message}`);
      addResult(`🔍 Error type: ${error.constructor.name}`);
    }

    // Test 3: Try with different headers
    try {
      addResult('🔧 Testing with mobile-like headers...');
      const response = await fetch('http://206.189.141.194:3000/api/health', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'User-Agent': 'CrickCoach/1.0 (React Native)',
        },
      });
      
      if (response.ok) {
        addResult('✅ Mobile headers test: OK');
      } else {
        addResult(`❌ Mobile headers test: Failed (${response.status})`);
      }
    } catch (error) {
      addResult(`❌ Mobile headers test: Error - ${error.message}`);
    }

    // Test 4: Try POST request
    try {
      addResult('📝 Testing POST request...');
      const response = await fetch('http://206.189.141.194:3000/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: 'test_user_debug',
          email: 'test_debug@example.com',
          password: 'testpass123'
        }),
      });
      
      addResult(`📊 POST response status: ${response.status}`);
      
      if (response.ok) {
        const data = await response.text();
        addResult(`✅ POST request: OK - ${data.substring(0, 100)}...`);
      } else {
        const data = await response.text();
        addResult(`⚠️ POST request: ${response.status} - ${data.substring(0, 100)}...`);
      }
    } catch (error) {
      addResult(`❌ POST request: Error - ${error.message}`);
    }

    addResult('🏁 Network test completed!');
    setIsTesting(false);
  };

  const showResults = () => {
    Alert.alert(
      'Network Test Results',
      results.join('\n'),
      [{ text: 'OK' }]
    );
  };

  return (
    <ScrollView style={{ flex: 1, padding: 20 }}>
      <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 20 }}>
        Simple Network Test
      </Text>
      
      <TouchableOpacity
        onPress={testConnection}
        disabled={isTesting}
        style={{
          backgroundColor: isTesting ? '#ccc' : '#007AFF',
          padding: 15,
          borderRadius: 8,
          marginBottom: 20
        }}
      >
        <Text style={{ color: 'white', textAlign: 'center', fontWeight: 'bold' }}>
          {isTesting ? 'Testing...' : 'Run Network Test'}
        </Text>
      </TouchableOpacity>

      {results.length > 0 && (
        <View>
          <Text style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 10 }}>
            Test Results:
          </Text>
          
          <ScrollView style={{ maxHeight: 300, backgroundColor: '#f5f5f5', padding: 10, borderRadius: 8 }}>
            {results.map((result, index) => (
              <Text key={index} style={{ marginBottom: 5, fontSize: 12 }}>
                {result}
              </Text>
            ))}
          </ScrollView>
          
          <TouchableOpacity
            onPress={showResults}
            style={{
              backgroundColor: '#34C759',
              padding: 10,
              borderRadius: 8,
              marginTop: 15
            }}
          >
            <Text style={{ color: 'white', textAlign: 'center' }}>
              Show Full Results
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
};

export default SimpleNetworkTest;
