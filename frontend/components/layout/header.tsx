'use client';

import React, { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { cn } from '@/lib/utils';
import {
  Menu,
  Bell,
  Search,
  ChevronDown,
  User,
  Settings,
  LogOut,
} from 'lucide-react';

interface HeaderProps {
  setSidebarOpen: (open: boolean) => void;
}

export function Header({ setSidebarOpen }: HeaderProps) {
  const { user, logout } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  const handleLogout = () => {
    logout();
    setShowUserMenu(false);
  };

  return (
    <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-gray-200 bg-white px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8">
      {/* Mobile menu button */}
      <button
        type="button"
        className="-m-2.5 p-2.5 text-gray-700 lg:hidden"
        onClick={() => setSidebarOpen(true)}
      >
        <span className="sr-only">Open sidebar</span>
        <Menu className="h-6 w-6" />
      </button>

      {/* Separator */}
      <div className="h-6 w-px bg-gray-200 lg:hidden" />

      {/* Search */}
      <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
        <div className="relative flex flex-1">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            className="block h-full w-full border-0 py-0 pl-10 pr-0 text-gray-900 placeholder:text-gray-400 focus:ring-0 sm:text-sm"
            placeholder="Search..."
          />
        </div>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-x-4 lg:gap-x-6">
        {/* Notifications */}
        <div className="relative">
          <button
            type="button"
            className="relative p-2 text-gray-400 hover:text-gray-500"
            onClick={() => setShowNotifications(!showNotifications)}
          >
            <span className="sr-only">View notifications</span>
            <Bell className="h-6 w-6" />
            <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-red-400"></span>
          </button>

          {/* Notifications dropdown */}
          {showNotifications && (
            <div className="absolute right-0 z-10 mt-2 w-80 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
              <div className="py-1">
                <div className="px-4 py-2 border-b border-gray-200">
                  <h3 className="text-sm font-medium text-gray-900">Notifications</h3>
                </div>
                <div className="max-h-64 overflow-y-auto">
                  <div className="px-4 py-3 hover:bg-gray-50">
                    <div className="flex items-start">
                      <div className="flex-shrink-0">
                        <div className="h-8 w-8 rounded-full bg-red-100 flex items-center justify-center">
                          <span className="text-sm font-medium text-red-600">!</span>
                        </div>
                      </div>
                      <div className="ml-3 flex-1">
                        <p className="text-sm font-medium text-gray-900">
                          Safety Violation Detected
                        </p>
                        <p className="text-sm text-gray-500">
                          Worker without hard hat detected in Zone 3
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          2 minutes ago
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="px-4 py-3 hover:bg-gray-50">
                    <div className="flex items-start">
                      <div className="flex-shrink-0">
                        <div className="h-8 w-8 rounded-full bg-yellow-100 flex items-center justify-center">
                          <span className="text-sm font-medium text-yellow-600">!</span>
                        </div>
                      </div>
                      <div className="ml-3 flex-1">
                        <p className="text-sm font-medium text-gray-900">
                          Camera Offline
                        </p>
                        <p className="text-sm text-gray-500">
                          Camera CAM_05 has gone offline
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          5 minutes ago
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="border-t border-gray-200 px-4 py-2">
                  <button className="text-sm text-primary-600 hover:text-primary-500">
                    View all notifications
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Separator */}
        <div className="hidden lg:block lg:h-6 lg:w-px lg:bg-gray-200" />

        {/* User menu */}
        <div className="relative">
          <button
            type="button"
            className="flex items-center gap-x-3 text-sm font-medium leading-6 text-gray-900 hover:text-primary-600"
            onClick={() => setShowUserMenu(!showUserMenu)}
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-100">
              <span className="text-sm font-medium text-primary-700">
                {user?.username.charAt(0).toUpperCase()}
              </span>
            </div>
            <span className="hidden lg:block">{user?.username}</span>
            <ChevronDown className="h-4 w-4" />
          </button>

          {/* User dropdown */}
          {showUserMenu && (
            <div className="absolute right-0 z-10 mt-2 w-48 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
              <div className="py-1">
                <div className="px-4 py-2 border-b border-gray-200">
                  <p className="text-sm text-gray-900">{user?.username}</p>
                  <p className="text-xs text-gray-500">{user?.role}</p>
                </div>
                <button className="flex w-full items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                  <User className="mr-3 h-4 w-4" />
                  Profile
                </button>
                <button className="flex w-full items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                  <Settings className="mr-3 h-4 w-4" />
                  Settings
                </button>
                <button
                  onClick={handleLogout}
                  className="flex w-full items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  <LogOut className="mr-3 h-4 w-4" />
                  Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Click outside to close dropdowns */}
      {(showUserMenu || showNotifications) && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => {
            setShowUserMenu(false);
            setShowNotifications(false);
          }}
        />
      )}
    </header>
  );
}
