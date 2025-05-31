import React, { useEffect, useState } from 'react';
import { View, Text, Switch, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { HealthService } from '../services/HealthService';

// Create a singleton instance of our health service
const healthService = new HealthService();

interface HealthIntegrationSettingsProps {
  onStatusChange?: (connected: boolean) => void;
}

/**
 * Component for managing health integration settings
 */
const HealthIntegrationSettings: React.FC<HealthIntegrationSettingsProps> = ({ onStatusChange }) => {
  const [isAvailable, setIsAvailable] = useState<boolean>(false);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [syncEnabled, setSyncEnabled] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const serviceName = healthService.getServiceName();

  // Initialize on component mount
  useEffect(() => {
    checkHealthServiceStatus();
  }, []);

  /**
   * Check the status of the health service
   */
  const checkHealthServiceStatus = async () => {
    setLoading(true);
    
    // Check if health services are available
    const available = healthService.isAvailable();
    setIsAvailable(available);
    
    if (available) {
      // Try to initialize if available
      const initialized = await healthService.initialize();
      setIsConnected(initialized && healthService.hasRequiredPermissions());
      
      // If we had a status change callback, call it
      if (onStatusChange) {
        onStatusChange(initialized && healthService.hasRequiredPermissions());
      }
    }
    
    setLoading(false);
  };

  /**
   * Handle connect button press
   */
  const handleConnect = async () => {
    try {
      setLoading(true);
      const success = await healthService.initialize();
      setIsConnected(success);
      
      if (onStatusChange) {
        onStatusChange(success);
      }
      
      if (!success) {
        Alert.alert(
          'Connection Failed',
          `Unable to connect to ${serviceName}. Please check your permissions and try again.`
        );
      }
    } catch (error) {
      console.error('Failed to connect to health service:', error);
      Alert.alert(
        'Connection Error',
        `Error connecting to ${serviceName}: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle sync toggle change
   */
  const handleSyncToggle = (value: boolean) => {
    setSyncEnabled(value);
    
    // Here you would enable/disable syncing in your app's logic
    // For example, storing the preference in AsyncStorage
  };

  /**
   * Render the appropriate connection status
   */
  const renderConnectionStatus = () => {
    if (!isAvailable) {
      return (
        <Text style={styles.notAvailableText}>
          {serviceName} integration is not available on this device.
        </Text>
      );
    }

    if (isConnected) {
      return (
        <View style={styles.connectedContainer}>
          <Text style={styles.connectedText}>
            {`Connected to ${serviceName}`}
          </Text>
          <View style={styles.settingRow}>
            <Text style={styles.settingText}>Import sleep data</Text>
            <Switch
              value={syncEnabled}
              onValueChange={handleSyncToggle}
              disabled={loading}
            />
          </View>
          <View style={styles.settingRow}>
            <Text style={styles.settingText}>Export sleep data</Text>
            <Switch
              value={syncEnabled}
              onValueChange={handleSyncToggle}
              disabled={loading}
            />
          </View>
        </View>
      );
    }

    return (
      <TouchableOpacity
        style={styles.connectButton}
        onPress={handleConnect}
        disabled={loading}
      >
        <Text style={styles.connectButtonText}>
          {loading ? 'Connecting...' : `Connect to ${serviceName}`}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{serviceName} Integration</Text>
      {renderConnectionStatus()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  connectButton: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  connectButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  notAvailableText: {
    color: '#999',
    fontStyle: 'italic',
    textAlign: 'center',
  },
  connectedContainer: {
    marginTop: 8,
  },
  connectedText: {
    color: '#4CAF50',
    fontWeight: '600',
    marginBottom: 16,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#eee',
  },
  settingText: {
    fontSize: 16,
    color: '#333',
  },
});

export default HealthIntegrationSettings; 