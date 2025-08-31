import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert } from 'react-native';
import NetworkDebugger from '../../debug_network_issues';

const NetworkTestComponent: React.FC = () => {
  const [testResults, setTestResults] = useState<any>(null);
  const [isRunning, setIsRunning] = useState(false);

  const runNetworkTest = async () => {
    setIsRunning(true);
    try {
      const debugger = new NetworkDebugger();
      const results = await debugger.runComprehensiveTest();
      setTestResults(results);
      
      Alert.alert(
        'Network Test Complete',
        `Success Rate: ${results.summary.successRate}\n\n${results.summary.recommendations.join('\n')}`
      );
    } catch (error) {
      Alert.alert('Test Error', error.message);
    } finally {
      setIsRunning(false);
    }
  };

  const showDetailedResults = () => {
    if (testResults) {
      Alert.alert(
        'Detailed Results',
        JSON.stringify(testResults, null, 2),
        [{ text: 'OK' }]
      );
    }
  };

  return (
    <ScrollView style={{ flex: 1, padding: 20 }}>
      <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 20 }}>
        Network Connectivity Test
      </Text>
      
      <TouchableOpacity
        onPress={runNetworkTest}
        disabled={isRunning}
        style={{
          backgroundColor: isRunning ? '#ccc' : '#007AFF',
          padding: 15,
          borderRadius: 8,
          marginBottom: 20
        }}
      >
        <Text style={{ color: 'white', textAlign: 'center', fontWeight: 'bold' }}>
          {isRunning ? 'Running Test...' : 'Run Network Test'}
        </Text>
      </TouchableOpacity>

      {testResults && (
        <View>
          <Text style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 10 }}>
            Test Summary
          </Text>
          
          <Text style={{ marginBottom: 5 }}>
            Success Rate: {testResults.summary.successRate}
          </Text>
          
          <Text style={{ marginBottom: 5 }}>
            Total Tests: {testResults.summary.totalTests}
          </Text>
          
          <Text style={{ marginBottom: 5 }}>
            Successful Tests: {testResults.summary.successfulTests}
          </Text>
          
          <Text style={{ fontSize: 14, fontWeight: 'bold', marginTop: 15, marginBottom: 10 }}>
            Recommendations:
          </Text>
          
          {testResults.summary.recommendations.map((rec: string, index: number) => (
            <Text key={index} style={{ marginBottom: 5, color: '#666' }}>
              • {rec}
            </Text>
          ))}
          
          <TouchableOpacity
            onPress={showDetailedResults}
            style={{
              backgroundColor: '#34C759',
              padding: 10,
              borderRadius: 8,
              marginTop: 15
            }}
          >
            <Text style={{ color: 'white', textAlign: 'center' }}>
              Show Detailed Results
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
};

export default NetworkTestComponent;
