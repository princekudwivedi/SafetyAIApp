import { apiClient } from './client';
import { LoginCredentials, AuthResponse, User, RefreshTokenRequest } from '@/types/auth';

class AuthApi {
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    console.log('🔐 AuthApi.login called with endpoint: /api/v1/auth/login');
    console.log('🔐 Credentials received:', credentials);
    console.log('🔐 remember_me value:', credentials.remember_me);
    console.log('🔐 remember_me type:', typeof credentials.remember_me);
    console.log('🌐 Full URL will be:', `${apiClient.defaults.baseURL}/api/v1/auth/login`);
    
    const response = await apiClient.post('/api/v1/auth/login', credentials);
    console.log('✅ Login response received:', response);
    console.log('✅ Response data:', response.data);
    console.log('✅ Access token present:', !!response.data.access_token);
    console.log('✅ Refresh token present:', !!response.data.refresh_token);
    
    return response.data;
  }

  async getCurrentUser(): Promise<User> {
    console.log('👤 AuthApi.getCurrentUser called with endpoint: /api/v1/auth/me');
    console.log('🌐 Full URL will be:', `${apiClient.defaults.baseURL}/api/v1/auth/me`);
    const response = await apiClient.get('/api/v1/auth/me');
    console.log('✅ GetCurrentUser response status:', response.status);
    return response.data;
  }

  async refreshToken(refreshToken: string): Promise<AuthResponse> {
    console.log('🔄 AuthApi.refreshToken called');
    const request: RefreshTokenRequest = { refresh_token: refreshToken };
    const response = await apiClient.post('/api/v1/auth/refresh', request);
    console.log('✅ Refresh token response status:', response.status);
    return response.data;
  }

  async changePassword(request: { current_password: string; new_password: string }): Promise<void> {
    await apiClient.post('/api/v1/auth/change-password', request);
  }

  async forgotPassword(email: string): Promise<void> {
    await apiClient.post('/api/v1/auth/forgot-password', { email });
  }

  async resetPassword(token: string, new_password: string): Promise<void> {
    await apiClient.post('/api/v1/auth/reset-password', { token, new_password });
  }

  async logout(): Promise<void> {
    await apiClient.post('/api/v1/auth/logout');
  }
}

export const authApi = new AuthApi();
