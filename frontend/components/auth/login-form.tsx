'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/hooks/use-auth';
import { LoginCredentials } from '@/types/auth';
import { Eye, EyeOff, Lock, Shield, User } from 'lucide-react';
import toast from 'react-hot-toast';

const loginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export function LoginForm() {
  const { login } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    try {
      setIsLoading(true);
      await login(data);
      toast.success('Login successful!');
    } catch (error: any) {
      console.error('Login error:', error);
      
      if (error.response?.data?.detail) {
        setError('root', {
          type: 'manual',
          message: error.response.data.detail,
        });
      } else {
        setError('root', {
          type: 'manual',
          message: 'Login failed. Please try again.',
        });
      }
      
      toast.error('Login failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="card">
      <div className="card-header text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary-100">
          <Shield className="h-6 w-6 text-primary-600" />
        </div>
        <h2 className="card-title">Sign in to your account</h2>
        <p className="card-description">
          Enter your credentials to access the safety monitoring system
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="card-content space-y-6">
        {/* Demo credentials info */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">Demo Credentials</h3>
              <div className="mt-2 text-sm text-blue-700">
                <p>Use any of these accounts to sign in:</p>
                <ul className="mt-1 space-y-1">
                  <li><strong>admin</strong> / admin123 (Administrator)</li>
                  <li><strong>supervisor</strong> / super123 (Supervisor)</li>
                  <li><strong>safety</strong> / safety123 (Safety Officer)</li>
                  <li><strong>operator</strong> / operator123 (Operator)</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {errors.root && (
          <div className="alert-error">
            <p className="text-sm">{errors.root.message}</p>
          </div>
        )}

        <div className="form-group">
          <label htmlFor="username" className="form-label">
            Username
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <User className="h-5 w-5 text-gray-400" />
            </div>
            <input
              {...register('username')}
              id="username"
              type="text"
              className="form-input pl-10"
              placeholder="Enter your username"
              disabled={isLoading}
            />
          </div>
          {errors.username && (
            <p className="form-error">{errors.username.message}</p>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="password" className="form-label">
            Password
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Lock className="h-5 w-5 text-gray-400" />
            </div>
            <input
              {...register('password')}
              id="password"
              type={showPassword ? 'text' : 'password'}
              className="form-input pl-10 pr-10"
              placeholder="Enter your password"
              disabled={isLoading}
            />
            <button
              type="button"
              className="absolute inset-y-0 right-0 pr-3 flex items-center"
              onClick={() => setShowPassword(!showPassword)}
              disabled={isLoading}
            >
              {showPassword ? (
                <EyeOff className="h-5 w-5 text-gray-400" />
              ) : (
                <Eye className="h-5 w-5 text-gray-400" />
              )}
            </button>
          </div>
          {errors.password && (
            <p className="form-error">{errors.password.message}</p>
          )}
        </div>

        <div className="flex items-center justify-center">
          <div className="flex items-center">
            <input
              id="remember-me"
              name="remember-me"
              type="checkbox"
              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
            />
            <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-900">
              Remember me
            </label>
          </div>
        </div>

        <div>
          <button
            type="submit"
            disabled={isLoading}
            className="btn-primary w-full btn-lg"
          >
            {isLoading ? (
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Signing in...</span>
              </div>
            ) : (
              'Sign in'
            )}
          </button>
        </div>

        <div className="text-center">
          <p className="text-sm text-gray-600">
            Demo application - Use the provided credentials to sign in
          </p>
        </div>
      </form>
    </div>
  );
}
