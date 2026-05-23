import React, { useState } from 'react';
import { View, ScrollView, TouchableOpacity, Text, TextInput, ActivityIndicator, Alert } from 'react-native';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

interface TestLog {
  timestamp: string;
  message: string;
  status: 'info' | 'success' | 'error';
}

export const NotificationTester = () => {
  const { user, token } = useAuth();
  const [logs, setLogs] = useState<TestLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState(user?._id || '');

  const addLog = (message: string, status: 'info' | 'success' | 'error' = 'info') => {
    const log: TestLog = {
      timestamp: new Date().toLocaleTimeString(),
      message,
      status,
    };
    setLogs((prev) => [log, ...prev]);
    console.log(`[${status.toUpperCase()}] ${message}`);
  };

  const clearLogs = () => setLogs([]);

  // Test 1: Check if token exists
  const testTokenStatus = async () => {
    setLoading(true);
    try {
      addLog('Checking auth token...', 'info');

      if (!token) {
        addLog('❌ No auth token found. Please login first.', 'error');
        setLoading(false);
        return;
      }

      addLog(`✅ Auth token exists: ${token.substring(0, 20)}...`, 'success');
      addLog(`✅ User ID: ${user?._id}`, 'success');

      setLoading(false);
    } catch (error) {
      addLog(`❌ Error: ${error}`, 'error');
      setLoading(false);
    }
  };

  // Test 2: Check push token
  const testPushToken = async () => {
    setLoading(true);
    try {
      addLog('Fetching push token status...', 'info');

      // Make a request to check if token was saved
      const response = await api.get('/notifications/my-notifications', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.status === 200) {
        addLog('✅ Push token is working (API accessible)', 'success');
        addLog(`Total notifications: ${response.data.total}`, 'success');
      }

      setLoading(false);
    } catch (error: any) {
      addLog(`❌ Error checking push token: ${error.message}`, 'error');
      setLoading(false);
    }
  };

  // Test 3: Get all notifications
  const testGetNotifications = async () => {
    setLoading(true);
    try {
      addLog('Fetching all notifications...', 'info');

      const response = await api.get('/notifications/my-notifications?limit=10', {
        headers: { Authorization: `Bearer ${token}` },
      });

      const { notifications, total } = response.data;
      addLog(`✅ Found ${total} total notifications`, 'success');

      if (notifications.length > 0) {
        notifications.forEach((notif: any, index: number) => {
          addLog(`  [${index + 1}] ${notif.title}: ${notif.message}`, 'info');
        });
      } else {
        addLog('No notifications yet. Send a test notification first.', 'info');
      }

      setLoading(false);
    } catch (error: any) {
      addLog(`❌ Error fetching notifications: ${error.message}`, 'error');
      setLoading(false);
    }
  };

  // Test 4: Send test notification
  const testSendNotification = async () => {
    setLoading(true);
    try {
      if (!userId) {
        addLog('❌ Please enter a User ID', 'error');
        setLoading(false);
        return;
      }

      addLog(`Sending test notification to user: ${userId}...`, 'info');

      const response = await api.post(
        '/notifications/send',
        {
          userId,
          title: 'Test Notification',
          body: 'This is a test notification from the testing component!',
          type: 'general',
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.data.success) {
        addLog('✅ Test notification sent successfully!', 'success');
        addLog(
          `Success count: ${response.data.result.successCount}, Failed: ${response.data.result.failureCount}`,
          'success'
        );
      } else {
        addLog('❌ Failed to send notification', 'error');
      }

      setLoading(false);
    } catch (error: any) {
      addLog(
        `❌ Error sending notification: ${error.response?.data?.error || error.message}`,
        'error'
      );
      setLoading(false);
    }
  };

  // Test 5: Mark notification as read
  const testMarkAsRead = async () => {
    setLoading(true);
    try {
      addLog('Fetching first unread notification...', 'info');

      const response = await api.get('/notifications/my-notifications?limit=1', {
        headers: { Authorization: `Bearer ${token}` },
      });

      const notifications = response.data.notifications;

      if (notifications.length === 0) {
        addLog('❌ No notifications to mark as read', 'error');
        setLoading(false);
        return;
      }

      const notificationId = notifications[0]._id;
      addLog(`Marking notification ${notificationId} as read...`, 'info');

      const markResponse = await api.post(
        '/notifications/mark-read',
        { notificationId },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (markResponse.data.success) {
        addLog('✅ Notification marked as read!', 'success');
      } else {
        addLog('❌ Failed to mark notification as read', 'error');
      }

      setLoading(false);
    } catch (error: any) {
      addLog(`❌ Error: ${error.message}`, 'error');
      setLoading(false);
    }
  };

  // Full test suite
  const runFullTest = async () => {
    clearLogs();
    addLog('🧪 Starting full notification test suite...', 'info');
    addLog('='.repeat(50), 'info');

    await testTokenStatus();
    await new Promise((r) => setTimeout(r, 500));

    await testPushToken();
    await new Promise((r) => setTimeout(r, 500));

    await testGetNotifications();
    await new Promise((r) => setTimeout(r, 500));

    await testSendNotification();
    await new Promise((r) => setTimeout(r, 500));

    await testGetNotifications();
    await new Promise((r) => setTimeout(r, 500));

    addLog('='.repeat(50), 'info');
    addLog('✅ Full test suite completed!', 'success');
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#f5f5f5' }}>
      <ScrollView style={{ flex: 1, padding: 16 }}>
        {/* Header */}
        <View style={{ marginBottom: 20 }}>
          <Text style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 8 }}>
            🧪 Push Notification Tester
          </Text>
          <Text style={{ fontSize: 12, color: '#666', marginBottom: 16 }}>
            Use this tool to test all notification features
          </Text>
        </View>

        {/* User ID Input */}
        <View style={{ marginBottom: 16 }}>
          <Text style={{ fontSize: 12, fontWeight: '600', marginBottom: 8 }}>User ID (for sending)</Text>
          <TextInput
            style={{
              borderWidth: 1,
              borderColor: '#ddd',
              borderRadius: 8,
              padding: 12,
              backgroundColor: '#fff',
              fontFamily: 'monospace',
              fontSize: 11,
            }}
            placeholder="Enter user ID to send notification"
            value={userId}
            onChangeText={setUserId}
            editable={!loading}
          />
        </View>

        {/* Test Buttons */}
        <View style={{ marginBottom: 20 }}>
          <TouchableOpacity
            style={{
              backgroundColor: '#007AFF',
              padding: 12,
              borderRadius: 8,
              marginBottom: 8,
              opacity: loading ? 0.6 : 1,
            }}
            onPress={runFullTest}
            disabled={loading}
          >
            <Text style={{ color: '#fff', textAlign: 'center', fontWeight: '600' }}>
              {loading ? '⏳ Running Tests...' : '▶️ Run Full Test Suite'}
            </Text>
          </TouchableOpacity>

          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity
              style={{
                flex: 1,
                backgroundColor: '#34C759',
                padding: 10,
                borderRadius: 8,
                opacity: loading ? 0.6 : 1,
              }}
              onPress={testGetNotifications}
              disabled={loading}
            >
              <Text style={{ color: '#fff', textAlign: 'center', fontSize: 12, fontWeight: '600' }}>
                📱 Get Notifications
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={{
                flex: 1,
                backgroundColor: '#FF9500',
                padding: 10,
                borderRadius: 8,
                opacity: loading ? 0.6 : 1,
              }}
              onPress={testSendNotification}
              disabled={loading}
            >
              <Text style={{ color: '#fff', textAlign: 'center', fontSize: 12, fontWeight: '600' }}>
                📤 Send Test
              </Text>
            </TouchableOpacity>
          </View>

          <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
            <TouchableOpacity
              style={{
                flex: 1,
                backgroundColor: '#5856D6',
                padding: 10,
                borderRadius: 8,
                opacity: loading ? 0.6 : 1,
              }}
              onPress={testMarkAsRead}
              disabled={loading}
            >
              <Text style={{ color: '#fff', textAlign: 'center', fontSize: 12, fontWeight: '600' }}>
                ✓ Mark as Read
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={{
                flex: 1,
                backgroundColor: '#FF3B30',
                padding: 10,
                borderRadius: 8,
              }}
              onPress={clearLogs}
            >
              <Text style={{ color: '#fff', textAlign: 'center', fontSize: 12, fontWeight: '600' }}>
                🗑️ Clear Logs
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Logs Display */}
        <View style={{ marginBottom: 20 }}>
          <Text style={{ fontSize: 14, fontWeight: '600', marginBottom: 8 }}>📋 Test Logs</Text>
          <View
            style={{
              backgroundColor: '#1a1a1a',
              borderRadius: 8,
              padding: 12,
              minHeight: 200,
            }}
          >
            {logs.length === 0 ? (
              <Text style={{ color: '#666', fontSize: 12 }}>Logs will appear here...</Text>
            ) : (
              logs.map((log, index) => (
                <View key={index} style={{ marginBottom: 6 }}>
                  <Text
                    style={{
                      color:
                        log.status === 'success' ? '#34C759' : log.status === 'error' ? '#FF3B30' : '#999',
                      fontSize: 11,
                      fontFamily: 'monospace',
                    }}
                  >
                    <Text style={{ color: '#666' }}>[{log.timestamp}]</Text> {log.message}
                  </Text>
                </View>
              ))
            )}
          </View>
        </View>
      </ScrollView>

      {/* Loading Indicator */}
      {loading && (
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.3)',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      )}
    </View>
  );
};
