import { apiClient } from './client';
import { User, UserRole } from '@/types/auth';

export interface UserCreate {
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role: UserRole;
  site_id?: string;
  is_active: boolean;
  password: string;
  permissions?: string[];
}

export interface UserUpdate {
  username?: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  role?: UserRole;
  site_id?: string;
  is_active?: boolean;
  permissions?: string[];
  password?: string;
}

export interface UserListResponse {
  users: User[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

export interface UserFilters {
  page?: number;
  limit?: number;
  role?: UserRole;
  is_active?: boolean;
  search?: string;
}

export const usersApi = {
  // Get users with pagination and filters
  getUsers: async (filters: UserFilters = {}): Promise<UserListResponse> => {
    const params = new URLSearchParams();
    
    if (filters.page) params.append('page', filters.page.toString());
    if (filters.limit) params.append('limit', filters.limit.toString());
    if (filters.role) params.append('role', filters.role);
    if (filters.is_active !== undefined) params.append('is_active', filters.is_active.toString());
    if (filters.search) params.append('search', filters.search);
    
    const response = await apiClient.get(`/api/v1/users/?${params.toString()}`);
    return response.data;
  },

  // Get a single user by ID
  getUser: async (userId: string): Promise<User> => {
    const response = await apiClient.get(`/api/v1/users/${userId}`);
    return response.data;
  },

  // Create a new user
  createUser: async (userData: UserCreate): Promise<User> => {
    const response = await apiClient.post('/api/v1/users/', userData);
    return response.data;
  },

  // Update a user
  updateUser: async (userId: string, userData: UserUpdate): Promise<User> => {
    const response = await apiClient.put(`/api/v1/users/${userId}`, userData);
    return response.data;
  },

  // Delete a user
  deleteUser: async (userId: string): Promise<{ message: string }> => {
    const response = await apiClient.delete(`/api/v1/users/${userId}`);
    return response.data;
  },

  // Toggle user status
  toggleUserStatus: async (userId: string): Promise<{ message: string }> => {
    const response = await apiClient.post(`/api/v1/users/${userId}/toggle-status`);
    return response.data;
  },

  // Get available roles
  getRoles: async (): Promise<Array<{ value: string; label: string; description: string }>> => {
    const response = await apiClient.get('/api/v1/users/roles/list');
    return response.data;
  },

  // Get current user profile
  getMyProfile: async (): Promise<User> => {
    const response = await apiClient.get('/api/v1/users/me/profile');
    return response.data;
  },

  // Update current user profile
  updateMyProfile: async (userData: UserUpdate): Promise<User> => {
    const response = await apiClient.put('/api/v1/users/me/profile', userData);
    return response.data;
  }
};
