'use client';

import React, { useState } from 'react';
import { apiClient, isErrorHandlerReady } from '../lib/api/client';

/**
 * Test component to verify error handler functionality
 */
export function TestErrorHandler() {
  const [status, setStatus] = useState<string>('Ready');
  const [errorHandlerReady, setErrorHandlerReady] = useState<boolean>(false);

  const checkErrorHandler = () => {
    const isReady = isErrorHandlerReady();
    setErrorHandlerReady(isReady);
    setStatus(`Error handler ready: ${isReady}`);
  };

  const test401Error = async () => {
    setStatus('Testing 401 error...');
    try {
      // This should trigger a 401 if the token is expired/invalid
      const response = await apiClient.get('/api/v1/stats/dashboard');
      setStatus(`Unexpected success: ${response.status}`);
    } catch (error: any) {
      setStatus(`Error caught: ${error.status} - ${error.message}`);
    }
  };

  const testValidEndpoint = async () => {
    setStatus('Testing valid endpoint...');
    try {
      const response = await apiClient.get('/api/v1/auth/login');
      setStatus(`Valid endpoint response: ${response.status}`);
    } catch (error: any) {
      setStatus(`Valid endpoint error: ${error.status} - ${error.message}`);
    }
  };

  return (
    <div className="p-4 border rounded-lg bg-gray-50">
      <h3 className="text-lg font-semibold mb-4">Error Handler Test</h3>
      
      <div className="space-y-4">
        <div>
          <p className="text-sm text-gray-600">Status: {status}</p>
          <p className="text-sm text-gray-600">
            Error Handler Ready: {errorHandlerReady ? '✅ Yes' : '❌ No'}
          </p>
        </div>
        
        <div className="space-x-2">
          <button
            onClick={checkErrorHandler}
            className="px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Check Error Handler
          </button>
          
          <button
            onClick={test401Error}
            className="px-3 py-2 bg-red-500 text-white rounded hover:bg-red-600"
          >
            Test 401 Error
          </button>
          
          <button
            onClick={testValidEndpoint}
            className="px-3 py-2 bg-green-500 text-white rounded hover:bg-green-600"
          >
            Test Valid Endpoint
          </button>
        </div>
        
        <div className="text-xs text-gray-500">
          <p>This component helps debug the centralized error handler.</p>
          <p>Check the browser console for detailed logs.</p>
        </div>
      </div>
    </div>
  );
}
