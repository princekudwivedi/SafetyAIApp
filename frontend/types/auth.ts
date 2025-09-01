export interface User {
  id?: string;
  _id?: string;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role: UserRole;
  site_id?: string;
  is_active: boolean;
  permissions: string[];
  created_at: string | Date;
  updated_at: string | Date | null;
  last_login?: string;
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
  remember_me?: boolean;
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  refresh_expires_in: number;
}

export interface RefreshTokenRequest {
  refresh_token: string;
}

export interface UserCreate {
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  password: string;
  role: UserRole;
  site_id?: string;
  is_active?: boolean;
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
