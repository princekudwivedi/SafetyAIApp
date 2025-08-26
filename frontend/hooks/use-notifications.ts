import { useState, useEffect, useCallback } from 'react';
import { useWebSocket } from '@/contexts/websocket-context';

export interface Notification {
  id: string;
  type: 'alert' | 'system' | 'info' | 'success';
  title: string;
  message: string;
  timestamp: Date;
  isRead: boolean;
  data?: any;
}

export interface UseNotificationsReturn {
  notifications: Notification[];
  unreadCount: number;
  markAsRead: (notificationId: string) => void;
  markAllAsRead: () => void;
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'isRead'>) => void;
  removeNotification: (notificationId: string) => void;
  clearAll: () => void;
}

export function useNotifications(): UseNotificationsReturn {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const { subscribe, isConnected } = useWebSocket();

  // Calculate unread count whenever notifications change
  useEffect(() => {
    const unread = notifications.filter(n => !n.isRead).length;
    setUnreadCount(unread);
  }, [notifications]);

  // Subscribe to real-time notifications
  useEffect(() => {
    if (!isConnected) return;

    const unsubscribeNewAlert = subscribe('new_alert', (data) => {
      if (data.type === 'new_alert' && data.payload) {
        const newNotification: Notification = {
          id: `alert-${Date.now()}`,
          type: 'alert',
          title: 'Safety Violation Detected',
          message: `${data.payload.violation_type} detected in ${data.payload.location_id || 'unknown location'}`,
          timestamp: new Date(),
          isRead: false,
          data: {
            alertId: data.payload.alert_id,
            severity: data.payload.severity_level,
            location: data.payload.location_id,
            camera: data.payload.camera_id
          }
        };
        
        addNotification(newNotification);
      }
    });

    const unsubscribeCameraStatus = subscribe('camera_status', (data) => {
      if (data.type === 'camera_status' && data.payload) {
        const newNotification: Notification = {
          id: `camera-${Date.now()}`,
          type: 'system',
          title: `Camera ${data.payload.status === 'offline' ? 'Offline' : 'Online'}`,
          message: `Camera ${data.payload.camera_id} has gone ${data.payload.status}`,
          timestamp: new Date(),
          isRead: false,
          data: {
            cameraId: data.payload.camera_id,
            status: data.payload.status,
            location: data.payload.location
          }
        };
        
        addNotification(newNotification);
      }
    });

    const unsubscribeSystemAlert = subscribe('system_alert', (data) => {
      if (data.type === 'system_alert' && data.payload) {
        const newNotification: Notification = {
          id: `system-${Date.now()}`,
          type: 'info',
          title: data.payload.title || 'System Alert',
          message: data.payload.message || 'System notification',
          timestamp: new Date(),
          isRead: false,
          data: data.payload
        };
        
        addNotification(newNotification);
      }
    });

    return () => {
      unsubscribeNewAlert();
      unsubscribeCameraStatus();
      unsubscribeSystemAlert();
    };
  }, [subscribe, isConnected]);

  const addNotification = useCallback((notification: Notification) => {
    setNotifications(prev => [notification, ...prev.slice(0, 49)]); // Keep max 50 notifications
  }, []);

  const markAsRead = useCallback((notificationId: string) => {
    setNotifications(prev => 
      prev.map(n => 
        n.id === notificationId ? { ...n, isRead: true } : n
      )
    );
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
  }, []);

  const removeNotification = useCallback((notificationId: string) => {
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  return {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    addNotification,
    removeNotification,
    clearAll,
  };
}
