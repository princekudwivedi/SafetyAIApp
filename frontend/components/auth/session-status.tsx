'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { TokenManager } from '@/lib/utils/token-manager';
import { Clock, Shield, AlertTriangle, CheckCircle } from 'lucide-react';

export function SessionStatus() {
  const { user } = useAuth();
  const [expirationInfo, setExpirationInfo] = useState<{
    accessTokenExpiresIn: number;
    refreshTokenExpiresIn: number;
    isRememberMe: boolean;
  } | null>(null);

  useEffect(() => {
    if (user) {
      const updateExpirationInfo = () => {
        const info = TokenManager.getTokenExpirationInfo();
        setExpirationInfo(info);
      };

      // Update immediately
      updateExpirationInfo();

      // Update every minute
      const interval = setInterval(updateExpirationInfo, 60 * 1000);

      return () => clearInterval(interval);
    }
  }, [user]);

  if (!user || !expirationInfo) return null;

  const { accessTokenExpiresIn, refreshTokenExpiresIn, isRememberMe } = expirationInfo;

  const getStatusColor = () => {
    if (accessTokenExpiresIn < 5 * 60 * 1000) return 'text-red-600'; // Less than 5 minutes
    if (accessTokenExpiresIn < 15 * 60 * 1000) return 'text-yellow-600'; // Less than 15 minutes
    return 'text-green-600';
  };

  const getStatusIcon = () => {
    if (accessTokenExpiresIn < 5 * 60 * 1000) return <AlertTriangle className="w-4 h-4" />;
    if (accessTokenExpiresIn < 15 * 60 * 1000) return <Clock className="w-4 h-4" />;
    return <CheckCircle className="w-4 h-4" />;
  };

  const getStatusText = () => {
    if (accessTokenExpiresIn < 5 * 60 * 1000) return 'Session expiring soon';
    if (accessTokenExpiresIn < 15 * 60 * 1000) return 'Session expiring soon';
    return 'Session active';
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-gray-900 flex items-center">
          <Shield className="w-4 h-4 mr-2" />
          Session Status
        </h3>
        <div className={`flex items-center text-sm font-medium ${getStatusColor()}`}>
          {getStatusIcon()}
          <span className="ml-1">{getStatusText()}</span>
        </div>
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-600">Access Token:</span>
          <span className={getStatusColor()}>
            {TokenManager.formatExpirationTime(accessTokenExpiresIn)}
          </span>
        </div>
        
        <div className="flex justify-between">
          <span className="text-gray-600">Refresh Token:</span>
          <span className="text-gray-900">
            {TokenManager.formatExpirationTime(refreshTokenExpiresIn)}
          </span>
        </div>

        {isRememberMe && (
          <div className="flex justify-between">
            <span className="text-gray-600">Remember Me:</span>
            <span className="text-green-600 font-medium">Enabled</span>
          </div>
        )}

        <div className="pt-2 border-t border-gray-100">
          <div className="flex justify-between text-xs text-gray-500">
            <span>Logged in as:</span>
            <span className="font-medium">{user.username}</span>
          </div>
          <div className="flex justify-between text-xs text-gray-500">
            <span>Role:</span>
            <span className="font-medium">{user.role}</span>
          </div>
        </div>
      </div>

      {accessTokenExpiresIn < 15 * 60 * 1000 && (
        <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
          <div className="flex items-center">
            <Clock className="w-3 h-3 mr-1" />
            <span>Your session will expire soon. The system will automatically refresh your tokens.</span>
          </div>
        </div>
      )}
    </div>
  );
}
