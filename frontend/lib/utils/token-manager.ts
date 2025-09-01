import { AuthResponse } from '@/types/auth';

export interface TokenInfo {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  refreshExpiresAt: number;
}

export interface SessionData {
  user: any;
  expiresAt: number;
  refreshExpiresAt: number;
  createdAt: number;
  updatedAt: number;
  rememberMe: boolean;
}

export class TokenManager {
  private static readonly ACCESS_TOKEN_KEY = 'auth_token';
  private static readonly REFRESH_TOKEN_KEY = 'refresh_token';
  private static readonly SESSION_KEY = 'auth_session';

  /**
   * Store authentication tokens and session data
   */
  static storeTokens(response: AuthResponse, user: any, rememberMe: boolean = false): void {
    const expiresAt = Date.now() + (response.expires_in * 1000);
    const refreshExpiresAt = Date.now() + (response.refresh_expires_in * 1000);

    localStorage.setItem(this.ACCESS_TOKEN_KEY, response.access_token);
    localStorage.setItem(this.REFRESH_TOKEN_KEY, response.refresh_token);
    
    const sessionData: SessionData = {
      user,
      expiresAt,
      refreshExpiresAt,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      rememberMe
    };
    
    localStorage.setItem(this.SESSION_KEY, JSON.stringify(sessionData));
  }

  /**
   * Get the current access token
   */
  static getAccessToken(): string | null {
    return localStorage.getItem(this.ACCESS_TOKEN_KEY);
  }

  /**
   * Get the current refresh token
   */
  static getRefreshToken(): string | null {
    return localStorage.getItem(this.REFRESH_TOKEN_KEY);
  }

  /**
   * Get the current session data
   */
  static getSessionData(): SessionData | null {
    const sessionStr = localStorage.getItem(this.SESSION_KEY);
    if (!sessionStr) return null;
    
    try {
      return JSON.parse(sessionStr);
    } catch {
      return null;
    }
  }

  /**
   * Check if the current session is valid
   */
  static isSessionValid(): boolean {
    const session = this.getSessionData();
    if (!session) return false;
    
    const now = Date.now();
    return session.expiresAt > now;
  }

  /**
   * Check if the refresh token is still valid
   */
  static isRefreshTokenValid(): boolean {
    const session = this.getSessionData();
    if (!session) return false;
    
    const now = Date.now();
    return session.refreshExpiresAt > now;
  }

  /**
   * Check if tokens need to be refreshed soon (within 5 minutes)
   */
  static shouldRefreshTokens(): boolean {
    const session = this.getSessionData();
    if (!session) return false;
    
    const now = Date.now();
    const fiveMinutes = 5 * 60 * 1000;
    return (session.expiresAt - now) < fiveMinutes;
  }

  /**
   * Update tokens after refresh
   */
  static updateTokens(response: AuthResponse): void {
    const session = this.getSessionData();
    if (!session) return;
    
    const expiresAt = Date.now() + (response.expires_in * 1000);
    const refreshExpiresAt = Date.now() + (response.refresh_expires_in * 1000);
    
    localStorage.setItem(this.ACCESS_TOKEN_KEY, response.access_token);
    localStorage.setItem(this.REFRESH_TOKEN_KEY, response.refresh_token);
    
    session.expiresAt = expiresAt;
    session.refreshExpiresAt = refreshExpiresAt;
    session.updatedAt = Date.now();
    
    localStorage.setItem(this.SESSION_KEY, JSON.stringify(session));
  }

  /**
   * Clear all authentication data
   */
  static clearTokens(): void {
    localStorage.removeItem(this.ACCESS_TOKEN_KEY);
    localStorage.removeItem(this.REFRESH_TOKEN_KEY);
    localStorage.removeItem(this.SESSION_KEY);
  }

  /**
   * Get token expiration information
   */
  static getTokenExpirationInfo(): {
    accessTokenExpiresIn: number;
    refreshTokenExpiresIn: number;
    isRememberMe: boolean;
  } | null {
    const session = this.getSessionData();
    if (!session) return null;
    
    const now = Date.now();
    return {
      accessTokenExpiresIn: Math.max(0, session.expiresAt - now),
      refreshTokenExpiresIn: Math.max(0, session.refreshExpiresAt - now),
      isRememberMe: session.rememberMe
    };
  }

  /**
   * Format expiration time for display
   */
  static formatExpirationTime(milliseconds: number): string {
    if (milliseconds <= 0) return 'Expired';
    
    const minutes = Math.floor(milliseconds / (1000 * 60));
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days} day${days !== 1 ? 's' : ''}`;
    if (hours > 0) return `${hours} hour${hours !== 1 ? 's' : ''}`;
    if (minutes > 0) return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
    return 'Less than a minute';
  }
}
