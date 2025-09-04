'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useAlerts } from '@/hooks/use-alerts';
import { useNotifications } from '@/hooks/use-notifications';
import { useSearch } from '@/hooks/use-search';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  Menu,
  Bell,
  Search,
  ChevronDown,
  User,
  Settings,
  LogOut,
  Edit,
  Shield,
  Camera,
  AlertTriangle,
  CheckCircle,
  X,
  Plus,
  Building,
  Clock,
  Loader2
} from 'lucide-react';

interface HeaderProps {
  setSidebarOpen: (open: boolean) => void;
}

export function Header({ setSidebarOpen }: HeaderProps) {
  const { user, logout } = useAuth();
  const { alerts, isLoading } = useAlerts();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const { 
    searchQuery, 
    searchResults, 
    isSearching, 
    searchError, 
    setSearchQuery, 
    clearSearch 
  } = useSearch();
  const router = useRouter();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  
  const userMenuRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSearchResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    setShowUserMenu(false);
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (query.trim()) {
      setShowSearchResults(true);
    } else {
      setShowSearchResults(false);
    }
  };

  const handleSearchResultClick = (result: any) => {
    setShowSearchResults(false);
    clearSearch();
    
    switch (result.type) {
      case 'alert':
        // Navigate to alerts page with the specific alert ID
        router.push(`/dashboard/alerts?alert=${result.id}`);
        break;
      case 'camera':
        // Navigate to live monitoring page with the specific camera pre-selected
        router.push(`/dashboard/monitoring?camera=${result.id}`);
        break;
      case 'site':
        // Navigate to sites page with the specific site ID
        router.push(`/dashboard/sites?site=${result.id}`);
        break;
    }
  };

  const getSearchResultIcon = (type: string) => {
    switch (type) {
      case 'alert':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'camera':
        return <Camera className="h-4 w-4 text-blue-500" />;
      case 'site':
        return <Building className="h-4 w-4 text-green-500" />;
      default:
        return <Search className="h-4 w-4 text-gray-500" />;
    }
  };

  const getSearchResultColor = (type: string) => {
    switch (type) {
      case 'alert':
        return 'bg-red-50 border-red-200';
      case 'camera':
        return 'bg-blue-50 border-blue-200';
      case 'site':
        return 'bg-green-50 border-green-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  const handleProfileClick = () => {
    setShowUserMenu(false);
    router.push('/dashboard/profile');
  };

  const handleSettingsClick = () => {
    setShowUserMenu(false);
    router.push('/dashboard/settings');
  };



  const getAlertIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
      case 'high':
        return <AlertTriangle className="h-4 w-4 text-orange-600" />;
      case 'medium':
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case 'low':
        return <AlertTriangle className="h-4 w-4 text-blue-600" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-gray-600" />;
    }
  };

  const getAlertColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-100 text-red-600';
      case 'high':
        return 'bg-orange-100 text-orange-600';
      case 'medium':
        return 'bg-yellow-100 text-yellow-600';
      case 'low':
        return 'bg-blue-100 text-blue-600';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  const formatTimestamp = (timestamp: Date) => {
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - timestamp.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes} minutes ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)} hours ago`;
    return timestamp.toLocaleDateString();
  };

  const handleAlertClick = (alert: any) => {
    // Navigate to alerts page with the specific alert
    router.push(`/dashboard/alerts?alert=${alert._id}`);
    setShowNotifications(false);
  };

  const handleNotificationClick = (notification: any) => {
    // Mark notification as read
    markAsRead(notification.id);
    
    // If it's an alert notification, navigate to the alerts page
    if (notification.type === 'alert' && notification.data?.alertId) {
      router.push(`/dashboard/alerts?alert=${notification.data.alertId}`);
    } else {
      // For other notification types, just navigate to alerts page
      router.push('/dashboard/alerts');
    }
    
    setShowNotifications(false);
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
        <div className="relative flex flex-1" ref={searchRef}>
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            className="block h-full w-full border-0 py-0 pl-10 pr-0 text-gray-900 placeholder:text-gray-400 focus:ring-0 sm:text-sm"
            placeholder="Search alerts, cameras, sites..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            onFocus={() => searchQuery.trim() && setShowSearchResults(true)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                clearSearch();
                setShowSearchResults(false);
              }
            }}
          />
          {searchQuery && (
            <button
              onClick={clearSearch}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          
          {/* Search Results Dropdown */}
          {showSearchResults && searchQuery.trim() && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-20 max-h-96 overflow-y-auto">
              <div className="p-3">
                {isSearching ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-5 w-5 animate-spin text-primary-600 mr-2" />
                    <span className="text-sm text-gray-500">Searching...</span>
                  </div>
                ) : searchError ? (
                  <div className="text-center py-4">
                    <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-red-400" />
                    <p className="text-sm text-red-600">{searchError}</p>
                  </div>
                ) : searchResults.length === 0 ? (
                  <div className="text-center py-4">
                    <Search className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                    <p className="text-sm text-gray-500">No results found for "{searchQuery}"</p>
                    <p className="text-xs text-gray-400 mt-1">Try different keywords</p>
                  </div>
                ) : (
                  <>
                    <div className="text-sm text-gray-500 mb-3 font-medium">
                      Search Results ({searchResults.length})
                    </div>
                    <div className="space-y-2">
                      {searchResults.map((result) => (
                        <button
                          key={`${result.type}-${result.id}`}
                          onClick={() => handleSearchResultClick(result)}
                          className={cn(
                            'w-full text-left p-3 rounded-lg border transition-colors hover:shadow-sm',
                            getSearchResultColor(result.type)
                          )}
                        >
                          <div className="flex items-start space-x-3">
                            <div className="flex-shrink-0 mt-1">
                              {getSearchResultIcon(result.type)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center space-x-2 mb-1">
                                <span className="text-sm font-medium text-gray-900 truncate">
                                  {result.title}
                                </span>
                                <span className={cn(
                                  'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium',
                                  result.type === 'alert' ? 'bg-red-100 text-red-800' :
                                  result.type === 'camera' ? 'bg-blue-100 text-blue-800' :
                                  'bg-green-100 text-green-800'
                                )}>
                                  {result.type}
                                </span>
                              </div>
                              <p className="text-sm text-gray-600 mb-1 truncate">
                                {result.subtitle}
                              </p>
                              {result.description && (
                                <p className="text-xs text-gray-500 truncate">
                                  {result.description}
                                </p>
                              )}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                    
                    {/* View All Results Button */}
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <button
                        onClick={() => {
                          setShowSearchResults(false);
                          router.push(`/dashboard/search?q=${encodeURIComponent(searchQuery)}`);
                        }}
                        className="w-full text-center text-sm text-primary-600 hover:text-primary-500 font-medium"
                      >
                        View all results for "{searchQuery}"
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-x-4 lg:gap-x-6">
        {/* Notifications */}
        <div className="relative" ref={notificationsRef}>
          <button
            type="button"
            className="relative p-2 text-gray-400 hover:text-gray-500"
            onClick={() => setShowNotifications(!showNotifications)}
          >
                         <span className="sr-only">View alerts</span>
            <Bell className="h-6 w-6" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center font-medium">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {/* Notifications dropdown */}
          {showNotifications && (
            <div className="absolute right-0 z-10 mt-2 w-96 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
              <div className="py-1">
                                 <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
                   <h3 className="text-sm font-medium text-gray-900">Recent Alerts</h3>
                   <div className="flex items-center space-x-2">
                     <button
                       onClick={() => setShowNotifications(false)}
                       className="text-gray-400 hover:text-gray-600"
                     >
                       <X className="h-4 w-4" />
                     </button>
                   </div>
                 </div>
                
                                 <div className="max-h-80 overflow-y-auto">
                   {!notifications || notifications.length === 0 ? (
                     <div className="px-4 py-8 text-center text-gray-500">
                       <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                       <p>No notifications</p>
                     </div>
                   ) : (
                     notifications.slice(0, 5).map((notification) => (
                       <div
                         key={notification.id}
                         className={cn(
                           "px-4 py-3 hover:bg-gray-50 cursor-pointer border-l-4",
                           notification.isRead ? "border-gray-300 bg-gray-50" : "border-primary-500 bg-blue-50"
                         )}
                         onClick={() => handleNotificationClick(notification)}
                       >
                         <div className="flex items-start">
                           <div className="flex-shrink-0 mt-1">
                             <div className={cn("h-8 w-8 rounded-full flex items-center justify-center", 
                               notification.type === 'alert' ? getAlertColor(notification.data?.severity || 'medium') : 'bg-gray-100 text-gray-600'
                             )}>
                               {notification.type === 'alert' ? getAlertIcon(notification.data?.severity || 'medium') : <Bell className="h-4 w-4" />}
                             </div>
                           </div>
                           <div className="ml-3 flex-1 min-w-0">
                             <p className="text-sm font-medium text-gray-900">
                               {notification.title}
                             </p>
                             <p className="text-sm text-gray-500 mt-1">
                               {notification.message}
                             </p>
                             <p className="text-xs text-gray-400 mt-2">
                               {notification.data?.camera ? `Camera ${notification.data.camera} • ` : ''}{formatTimestamp(notification.timestamp)}
                             </p>
                           </div>
                         </div>
                       </div>
                     ))
                   )}
                 </div>
                
                                 <div className="border-t border-gray-200 px-4 py-2">
                   <button 
                     onClick={() => {
                       markAllAsRead(); // Mark all notifications as read
                       setShowNotifications(false);
                       router.push('/dashboard/alerts');
                     }}
                     className="text-sm text-primary-600 hover:text-primary-500 w-full text-center"
                   >
                     View all alerts
                   </button>
                 </div>
              </div>
            </div>
          )}
        </div>

        {/* Separator */}
        <div className="hidden lg:block lg:h-6 lg:w-px lg:bg-gray-200" />

        {/* User menu */}
        <div className="relative" ref={userMenuRef}>
          <button
            type="button"
            className="flex items-center gap-x-3 text-sm font-medium leading-6 text-gray-900 hover:text-primary-600 transition-colors"
            onClick={() => setShowUserMenu(!showUserMenu)}
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-100">
              <span className="text-sm font-medium text-primary-700">
                {user?.username?.charAt(0).toUpperCase() || 'U'}
              </span>
            </div>
            <span className="hidden lg:block">{user?.username || 'User'}</span>
            <ChevronDown className={cn("h-4 w-4 transition-transform", showUserMenu && "rotate-180")} />
          </button>

          {/* User dropdown */}
          {showUserMenu && (
            <div className="absolute right-0 z-10 mt-2 w-56 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
              <div className="py-1">
                {/* User Info */}
                <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
                  <p className="text-sm font-medium text-gray-900">{user?.username || 'User'}</p>
                  <p className="text-xs text-gray-500">{user?.email || 'user@example.com'}</p>
                  <div className="mt-2">
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary-100 text-primary-800">
                      {user?.role || 'User'}
                    </span>
                  </div>
                </div>
                
                {/* Menu Items */}
                {/* <button 
                  onClick={handleProfileClick}
                  className="flex w-full items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                >
                  <User className="mr-3 h-4 w-4" />
                  Profile
                </button> */}
                
                <button 
                  onClick={handleSettingsClick}
                  className="flex w-full items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                >
                  <Settings className="mr-3 h-4 w-4" />
                  Settings
                </button>
                
                <div className="border-t border-gray-200 my-1"></div>
                
                <button
                  onClick={handleLogout}
                  className="flex w-full items-center px-4 py-2 text-sm text-red-700 hover:bg-red-50 transition-colors"
                >
                  <LogOut className="mr-3 h-4 w-4" />
                  Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
