export interface User {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  site_id?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Additional properties for user management
  firstName?: string;
  lastName?: string;
  isActive?: boolean;
  createdAt?: Date;
  lastLogin?: Date | null;
  siteId?: string;
}

export enum UserRole {
  ADMINISTRATOR = 'Administrator',
  SUPERVISOR = 'Supervisor',
  SAFETY_OFFICER = 'SafetyOfficer',
  OPERATOR = 'Operator',
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
}

export interface UserCreate {
  username: string;
  email: string;
  password: string;
  role: UserRole;
  site_id?: string;
  is_active?: boolean;
}

export interface UserUpdate {
  username?: string;
  email?: string;
  role?: UserRole;
  site_id?: string;
  is_active?: boolean;
}

export interface ChangePasswordRequest {
  current_password: string;
  new_password: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  new_password: string;
}
