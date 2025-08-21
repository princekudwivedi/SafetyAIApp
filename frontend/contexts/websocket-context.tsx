'use client';

import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { useAuth } from './auth-context';

interface WebSocketMessage {
  type: string;
  data: any;
  timestamp: string;
}

interface WebSocketContextType {
  isConnected: boolean;
  sendMessage: (message: any) => void;
  subscribe: (type: string, callback: (data: any) => void) => () => void;
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);

export function WebSocketProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const subscribersRef = useRef<Map<string, Set<(data: any) => void>>>(new Map());
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const connect = () => {
    if (!user) return;

    // For demo purposes, simulate connection without actual WebSocket
    // In production, this would connect to the real backend
    try {
      // Simulate successful connection
      setIsConnected(true);
      console.log('WebSocket connection simulated for demo');
      
      // Simulate some initial data
      setTimeout(() => {
        handleMessage({
          type: 'dashboard_stats',
          data: {
            totalViolations: 156,
            activeAlerts: 23,
            activeCameras: 8,
            workersMonitored: 45,
            violationsToday: 12,
            violationsYesterday: 8,
            safetyScore: 87,
          },
          timestamp: new Date().toISOString()
        });
      }, 1000);
      
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      // Don't schedule reconnect for demo mode
    }
  };

  const scheduleReconnect = () => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    
    reconnectTimeoutRef.current = setTimeout(() => {
      if (user) {
        connect();
      }
    }, 5000); // Reconnect after 5 seconds
  };

  const handleMessage = (message: WebSocketMessage) => {
    const { type, data } = message;
    
    // Notify subscribers
    const typeSubscribers = subscribersRef.current.get(type);
    if (typeSubscribers) {
      typeSubscribers.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('Error in WebSocket subscriber callback:', error);
        }
      });
    }
  };

  const sendMessage = (message: any) => {
    // For demo purposes, just log the message
    console.log('WebSocket message sent (demo mode):', message);
    
    // Simulate response for certain message types
    if (message.type === 'get_stats') {
      setTimeout(() => {
        handleMessage({
          type: 'dashboard_stats',
          data: {
            totalViolations: 156,
            activeAlerts: 23,
            activeCameras: 8,
            workersMonitored: 45,
            violationsToday: 12,
            violationsYesterday: 8,
            safetyScore: 87,
          },
          timestamp: new Date().toISOString()
        });
      }, 500);
    }
  };

  const subscribe = (type: string, callback: (data: any) => void) => {
    if (!subscribersRef.current.has(type)) {
      subscribersRef.current.set(type, new Set());
    }
    
    const typeSubscribers = subscribersRef.current.get(type)!;
    typeSubscribers.add(callback);
    
    // Return unsubscribe function
    return () => {
      typeSubscribers.delete(callback);
      if (typeSubscribers.size === 0) {
        subscribersRef.current.delete(type);
      }
    };
  };

  useEffect(() => {
    if (user) {
      connect();
    }
    
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [user]);

  const value: WebSocketContextType = {
    isConnected,
    sendMessage,
    subscribe,
  };

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
}

export function useWebSocket() {
  const context = useContext(WebSocketContext);
  if (context === undefined) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
}
