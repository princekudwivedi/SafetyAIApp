import { apiClient } from './client';
import { LoginCredentials, AuthResponse, User } from '@/types/auth';

class AuthApi {
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await apiClient.post('/auth/login', credentials);
    return response.data;
  }

  async getCurrentUser(): Promise<User> {
    const response = await apiClient.get('/auth/me');
    return response.data;
  }

  async refreshToken(): Promise<AuthResponse> {
    const response = await apiClient.post('/auth/refresh');
    return response.data;
  }

  async changePassword(request: { current_password: string; new_password: string }): Promise<void> {
    await apiClient.post('/auth/change-password', request);
  }

  async forgotPassword(email: string): Promise<void> {
    await apiClient.post('/auth/forgot-password', { email });
  }

  async resetPassword(token: string, new_password: string): Promise<void> {
    await apiClient.post('/auth/reset-password', { token, new_password });
  }

  async logout(): Promise<void> {
    await apiClient.post('/auth/logout');
  }
}

export const authApi = new AuthApi();
