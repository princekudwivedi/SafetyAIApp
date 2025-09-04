'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Search, Filter, Edit, Trash2, UserPlus, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'react-hot-toast';
import { useAuth } from '@/hooks/use-auth';
import { User, UserRole } from '@/types/auth';
import { usersApi, UserCreate, UserFilters } from '@/lib/api/users';
import { sitesApi, Site } from '@/lib/api/sites';

const userFormSchema = z.object({
  username: z.string().min(2, 'Username must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  role: z.nativeEnum(UserRole),
  site_id: z.string().optional(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
}).transform((data) => ({
  ...data,
  site_id: data.site_id === 'none' ? undefined : data.site_id
}));

const editUserFormSchema = z.object({
  username: z.string().min(2, 'Username must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  role: z.nativeEnum(UserRole),
  site_id: z.string().optional(),
  is_active: z.boolean()
}).transform((data) => ({
  ...data,
  site_id: data.site_id === 'none' ? undefined : data.site_id
}));

type UserFormData = z.infer<typeof userFormSchema>;
type EditUserFormData = z.infer<typeof editUserFormSchema>;

export function UsersPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<UserFilters>({ page: 1, limit: 10 });
  const [totalPages, setTotalPages] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [sites, setSites] = useState<Site[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  const form = useForm<UserFormData>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      username: '',
      email: '',
      first_name: '',
      last_name: '',
      role: UserRole.OPERATOR,
      site_id: 'none',
      password: '',
      confirmPassword: '',
    },
  });

  const editForm = useForm<EditUserFormData>({
    resolver: zodResolver(editUserFormSchema),
    defaultValues: {
      username: '',
      email: '',
      first_name: '',
      last_name: '',
      role: UserRole.OPERATOR,
      site_id: 'none',
      is_active: true,
    },
  });

  const canManageUsers = currentUser?.role === UserRole.ADMINISTRATOR || currentUser?.role === UserRole.SUPERVISOR;

  useEffect(() => {
    loadUsers();
    loadSites();
  }, [filters]);

  // Refresh users list every 30 seconds to show updated last_login
  useEffect(() => {
    const interval = setInterval(() => {
      loadUsers();
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const response = await usersApi.getUsers(filters);
      setUsers(response.users);
      setTotalPages(response.total_pages);
      setTotalUsers(response.total);
    } catch (error: any) {
      console.error('Error loading users:', error);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const loadSites = async () => {
    try {
      const sitesData = await sitesApi.getSites();
      setSites(sitesData);
    } catch (error: any) {
      console.error('Error loading sites:', error);
      toast.error('Failed to load sites');
    }
  };

  const handleCreateUser = async (data: UserFormData) => {
    try {
      const userData: UserCreate = {
        username: data.username,
        email: data.email,
        first_name: data.first_name,
        last_name: data.last_name,
        role: data.role,
        site_id: data.site_id === 'none' ? undefined : data.site_id,
        is_active: true,
        password: data.password,
      };

      await usersApi.createUser(userData);
      toast.success('User created successfully');
      setIsCreateDialogOpen(false);
      form.reset();
      loadUsers();
    } catch (error: any) {
      console.error('Error creating user:', error);
      toast.error(error.response?.data?.detail || 'Failed to create user');
    }
  };

  const handleEditUser = async (data: EditUserFormData) => {
    if (!selectedUser) return;

    try {
      const userData = {
        username: data.username,
        email: data.email,
        first_name: data.first_name,
        last_name: data.last_name,
        role: data.role,
        site_id: data.site_id === 'none' ? undefined : data.site_id,
        is_active: data.is_active,
      };

      await usersApi.updateUser(selectedUser.id || selectedUser._id || '', userData);
      toast.success('User updated successfully');
      setIsEditDialogOpen(false);
      setSelectedUser(null);
      editForm.reset();
      loadUsers();
    } catch (error: any) {
      console.error('Error updating user:', error);
      toast.error(error.response?.data?.detail || 'Failed to update user');
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;

    try {
      await usersApi.deleteUser(selectedUser.id || selectedUser._id || '');
      toast.success('User deleted successfully');
      setIsDeleteDialogOpen(false);
      setSelectedUser(null);
      loadUsers();
    } catch (error: any) {
      console.error('Error deleting user:', error);
      toast.error(error.response?.data?.detail || 'Failed to delete user');
    }
  };

  const handleToggleStatus = async (userId: string) => {
    try {
      await usersApi.toggleUserStatus(userId);
      toast.success('User status updated');
      loadUsers();
    } catch (error: any) {
      console.error('Error toggling user status:', error);
      toast.error('Failed to update user status');
    }
  };

  const getRoleBadgeColor = (role: UserRole) => {
    switch (role) {
      case UserRole.ADMINISTRATOR:
        return 'bg-red-100 text-red-800';
      case UserRole.SUPERVISOR:
        return 'bg-blue-100 text-blue-800';
      case UserRole.SAFETY_OFFICER:
        return 'bg-green-100 text-green-800';
      case UserRole.OPERATOR:
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (!canManageUsers) {
    return (
      <div className="flex items-center justify-center h-64">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-gray-900">Access Denied</h3>
              <p className="text-gray-600 mt-2">
                You don't have permission to access user management.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
            <p className="mt-2 text-gray-600">
              Manage user accounts, roles, and permissions across the system
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => {
                loadUsers();
                loadSites();
              }}
              className="flex items-center space-x-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <RefreshCw className="h-4 w-4" />
              <span>Refresh</span>
            </button>
            <button
              onClick={() => setIsCreateDialogOpen(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              <UserPlus className="h-4 w-4" />
              <span>Add User</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-lg shadow mb-6">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Filters</h2>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center space-x-2 text-sm text-gray-600 hover:text-gray-900"
            >
              <Filter className="h-4 w-4" />
              <span>{showFilters ? 'Hide' : 'Show'} Filters</span>
            </button>
          </div>
        </div>

        {showFilters && (
          <div className="p-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Search */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search users..."
                    value={filters.search || ''}
                    onChange={(e) => setFilters({ ...filters, search: e.target.value, page: 1 })}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Role Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
                <select
                  value={filters.role || 'all'}
                  onChange={(e) => setFilters({ ...filters, role: e.target.value === 'all' ? undefined : e.target.value as UserRole, page: 1 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="all">All Roles</option>
                  <option value={UserRole.ADMINISTRATOR}>Administrator</option>
                  <option value={UserRole.SUPERVISOR}>Supervisor</option>
                  <option value={UserRole.SAFETY_OFFICER}>Safety Officer</option>
                  <option value={UserRole.OPERATOR}>Operator</option>
                </select>
              </div>

              {/* Status Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                <select
                  value={filters.is_active?.toString() || 'all'}
                  onChange={(e) => setFilters({ ...filters, is_active: e.target.value === 'all' ? undefined : e.target.value === 'true', page: 1 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="all">All Status</option>
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            Users ({totalUsers})
          </h2>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Site
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Last Login
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Created
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {users.map((user) => (
                    <tr key={user.id || user._id || user.username} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {user.first_name} {user.last_name}
                          </div>
                          <div className="text-sm text-gray-500">{user.username}</div>
                          <div className="text-sm text-gray-400">{user.email}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={cn(
                          'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border',
                          getRoleBadgeColor(user.role)
                        )}>
                          {user.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={cn(
                          'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border',
                          user.is_active 
                            ? 'bg-green-100 text-green-800 border-green-200'
                            : 'bg-red-100 text-red-800 border-red-200'
                        )}>
                          {user.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{user.site_id || 'N/A'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {user.last_login 
                            ? new Date(user.last_login).toLocaleString()
                            : 'Never'
                          }
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {new Date(user.created_at).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => {
                              setSelectedUser(user);
                              editForm.reset({
                                username: user.username,
                                email: user.email,
                                first_name: user.first_name,
                                last_name: user.last_name,
                                role: user.role,
                                site_id: user.site_id || 'none',
                                is_active: user.is_active,
                              });
                              setIsEditDialogOpen(true);
                            }}
                            className="text-primary-600 hover:text-primary-900"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedUser(user);
                              setIsDeleteDialogOpen(true);
                            }}
                            disabled={(user.id || user._id) === (currentUser?.id || currentUser?._id)}
                            className={cn(
                              "text-red-600 hover:text-red-900",
                              (user.id || user._id) === (currentUser?.id || currentUser?._id) && "text-gray-400 cursor-not-allowed"
                            )}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-6 py-4 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-700">
                    Showing {((filters.page || 1) - 1) * (filters.limit || 10) + 1} to{' '}
                    {Math.min((filters.page || 1) * (filters.limit || 10), totalUsers)} of {totalUsers} results
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setFilters({ ...filters, page: (filters.page || 1) - 1 })}
                      disabled={(filters.page || 1) <= 1}
                    >
                      Previous
                    </Button>
                    <span className="text-sm">
                      Page {filters.page || 1} of {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setFilters({ ...filters, page: (filters.page || 1) + 1 })}
                      disabled={(filters.page || 1) >= totalPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Create User Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-[650px] max-h-[85vh] overflow-y-auto bg-white">
          <DialogHeader className="pb-8">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center shadow-lg">
                <UserPlus className="h-6 w-6 text-white" />
              </div>
              <div>
                <DialogTitle className="text-2xl font-bold text-gray-900">
                  Create New User
                </DialogTitle>
                <p className="text-gray-500 mt-2 leading-relaxed">
                  Add a new user to the system with appropriate role and permissions for construction site safety management
                </p>
              </div>
            </div>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleCreateUser)} className="space-y-8">
              {/* Username */}
              <div className="space-y-3">
                <Label htmlFor="username" className="text-sm font-semibold text-gray-800 flex items-center">
                  Username <span className="text-red-500 ml-1">*</span>
                </Label>
                <Input
                  id="username"
                  placeholder="e.g., john.doe, safety_officer_01"
                  className="h-12 text-base border-gray-300 focus:border-blue-500 focus:ring-blue-200"
                  {...form.register('username')}
                />
                {form.formState.errors.username && (
                  <p className="text-sm text-red-600 flex items-center mt-2">
                    <span className="w-1.5 h-1.5 bg-red-500 rounded-full mr-2"></span>
                    {form.formState.errors.username.message}
                  </p>
                )}
              </div>

              {/* Email */}
              <div className="space-y-3">
                <Label htmlFor="email" className="text-sm font-semibold text-gray-800 flex items-center">
                  Email Address <span className="text-red-500 ml-1">*</span>
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="e.g., john.doe@company.com"
                  className="h-12 text-base border-gray-300 focus:border-blue-500 focus:ring-blue-200"
                  {...form.register('email')}
                />
                {form.formState.errors.email && (
                  <p className="text-sm text-red-600 flex items-center mt-2">
                    <span className="w-1.5 h-1.5 bg-red-500 rounded-full mr-2"></span>
                    {form.formState.errors.email.message}
                  </p>
                )}
              </div>

              {/* First Name */}
              <div className="space-y-3">
                <Label htmlFor="first_name" className="text-sm font-semibold text-gray-800 flex items-center">
                  First Name <span className="text-red-500 ml-1">*</span>
                </Label>
                <Input
                  id="first_name"
                  placeholder="e.g., John"
                  className="h-12 text-base border-gray-300 focus:border-blue-500 focus:ring-blue-200"
                  {...form.register('first_name')}
                />
                {form.formState.errors.first_name && (
                  <p className="text-sm text-red-600 flex items-center mt-2">
                    <span className="w-1.5 h-1.5 bg-red-500 rounded-full mr-2"></span>
                    {form.formState.errors.first_name.message}
                  </p>
                )}
              </div>

              {/* Last Name */}
              <div className="space-y-3">
                <Label htmlFor="last_name" className="text-sm font-semibold text-gray-800 flex items-center">
                  Last Name <span className="text-red-500 ml-1">*</span>
                </Label>
                <Input
                  id="last_name"
                  placeholder="e.g., Doe"
                  className="h-12 text-base border-gray-300 focus:border-blue-500 focus:ring-blue-200"
                  {...form.register('last_name')}
                />
                {form.formState.errors.last_name && (
                  <p className="text-sm text-red-600 flex items-center mt-2">
                    <span className="w-1.5 h-1.5 bg-red-500 rounded-full mr-2"></span>
                    {form.formState.errors.last_name.message}
                  </p>
                )}
              </div>

              {/* Role */}
              <div className="space-y-3">
                <Label htmlFor="role" className="text-sm font-semibold text-gray-800 flex items-center">
                  Role <span className="text-red-500 ml-1">*</span>
                </Label>
                <Select onValueChange={(value) => form.setValue('role', value as UserRole)} defaultValue={form.getValues('role')}>
                  <SelectTrigger className="h-12 text-base border-gray-300 focus:border-blue-500 focus:ring-blue-200">
                    <SelectValue placeholder="Choose user role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={UserRole.ADMINISTRATOR}>Administrator</SelectItem>
                    <SelectItem value={UserRole.SUPERVISOR}>Supervisor</SelectItem>
                    <SelectItem value={UserRole.SAFETY_OFFICER}>Safety Officer</SelectItem>
                    <SelectItem value={UserRole.OPERATOR}>Operator</SelectItem>
                  </SelectContent>
                </Select>
                {form.formState.errors.role && (
                  <p className="text-sm text-red-600 flex items-center mt-2">
                    <span className="w-1.5 h-1.5 bg-red-500 rounded-full mr-2"></span>
                    {form.formState.errors.role.message}
                  </p>
                )}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4">
                  <div className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                    <div>
                      <p className="text-sm font-medium text-blue-900 mb-1">Role Permissions</p>
                      <p className="text-sm text-blue-700">
                        Each role has specific permissions for accessing and managing construction site safety features.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Assigned Site */}
              <div className="space-y-3">
                <Label htmlFor="site_id" className="text-sm font-semibold text-gray-800">
                  Assigned Site
                </Label>
                <Select onValueChange={(value) => form.setValue('site_id', value)} defaultValue={form.getValues('site_id') || 'none'}>
                  <SelectTrigger className="h-12 text-base border-gray-300 focus:border-blue-500 focus:ring-blue-200">
                    <SelectValue placeholder="Choose assigned site" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No site assigned</SelectItem>
                    {sites.map((site) => (
                      <SelectItem key={site.site_id} value={site.site_id}>
                        {site.site_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-sm text-gray-500 flex items-center">
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mr-2"></span>
                  Optional: Assign user to a specific construction site for focused access
                </p>
              </div>

              {/* Password */}
              <div className="space-y-3">
                <Label htmlFor="password" className="text-sm font-semibold text-gray-800 flex items-center">
                  Password <span className="text-red-500 ml-1">*</span>
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter secure password"
                  className="h-12 text-base border-gray-300 focus:border-blue-500 focus:ring-blue-200"
                  {...form.register('password')}
                />
                {form.formState.errors.password && (
                  <p className="text-sm text-red-600 flex items-center mt-2">
                    <span className="w-1.5 h-1.5 bg-red-500 rounded-full mr-2"></span>
                    {form.formState.errors.password.message}
                  </p>
                )}
              </div>

              {/* Confirm Password */}
              <div className="space-y-3">
                <Label htmlFor="confirmPassword" className="text-sm font-semibold text-gray-800 flex items-center">
                  Confirm Password <span className="text-red-500 ml-1">*</span>
                </Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Confirm your password"
                  className="h-12 text-base border-gray-300 focus:border-blue-500 focus:ring-blue-200"
                  {...form.register('confirmPassword')}
                />
                {form.formState.errors.confirmPassword && (
                  <p className="text-sm text-red-600 flex items-center mt-2">
                    <span className="w-1.5 h-1.5 bg-red-500 rounded-full mr-2"></span>
                    {form.formState.errors.confirmPassword.message}
                  </p>
                )}
              </div>

              {/* Form Actions */}
              <div className="flex justify-end space-x-4 pt-8 border-t border-gray-200">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreateDialogOpen(false)}
                  className="px-8 py-3 h-12 text-base font-medium border-gray-300 hover:bg-gray-50"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="px-8 py-3 h-12 text-base font-medium bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 shadow-lg hover:shadow-xl transition-all duration-200"
                >
                  Create User
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[650px] max-h-[85vh] overflow-y-auto bg-white">
          <DialogHeader className="pb-8">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                <Edit className="h-6 w-6 text-white" />
              </div>
              <div>
                <DialogTitle className="text-2xl font-bold text-gray-900">Edit User</DialogTitle>
                <p className="text-gray-600 mt-1">Update user information and permissions</p>
              </div>
            </div>
          </DialogHeader>
          
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(handleEditUser)} className="space-y-8">
              {/* Username */}
              <div className="space-y-3">
                <Label htmlFor="edit-username" className="text-sm font-semibold text-gray-800 flex items-center">
                  Username <span className="text-red-500 ml-1">*</span>
                </Label>
                <Input
                  id="edit-username"
                  placeholder="Enter unique username"
                  className="h-12 text-base border-gray-300 focus:border-blue-500 focus:ring-blue-200"
                  {...editForm.register('username')}
                />
                {editForm.formState.errors.username && (
                  <p className="text-sm text-red-600 flex items-center mt-2">
                    <span className="w-1.5 h-1.5 bg-red-500 rounded-full mr-2"></span>
                    {editForm.formState.errors.username.message}
                  </p>
                )}
              </div>

              {/* Email */}
              <div className="space-y-3">
                <Label htmlFor="edit-email" className="text-sm font-semibold text-gray-800 flex items-center">
                  Email Address <span className="text-red-500 ml-1">*</span>
                </Label>
                <Input
                  id="edit-email"
                  type="email"
                  placeholder="Enter email address"
                  className="h-12 text-base border-gray-300 focus:border-blue-500 focus:ring-blue-200"
                  {...editForm.register('email')}
                />
                {editForm.formState.errors.email && (
                  <p className="text-sm text-red-600 flex items-center mt-2">
                    <span className="w-1.5 h-1.5 bg-red-500 rounded-full mr-2"></span>
                    {editForm.formState.errors.email.message}
                  </p>
                )}
              </div>

              {/* First Name */}
              <div className="space-y-3">
                <Label htmlFor="edit-first-name" className="text-sm font-semibold text-gray-800 flex items-center">
                  First Name <span className="text-red-500 ml-1">*</span>
                </Label>
                <Input
                  id="edit-first-name"
                  placeholder="Enter first name"
                  className="h-12 text-base border-gray-300 focus:border-blue-500 focus:ring-blue-200"
                  {...editForm.register('first_name')}
                />
                {editForm.formState.errors.first_name && (
                  <p className="text-sm text-red-600 flex items-center mt-2">
                    <span className="w-1.5 h-1.5 bg-red-500 rounded-full mr-2"></span>
                    {editForm.formState.errors.first_name.message}
                  </p>
                )}
              </div>

              {/* Last Name */}
              <div className="space-y-3">
                <Label htmlFor="edit-last-name" className="text-sm font-semibold text-gray-800 flex items-center">
                  Last Name <span className="text-red-500 ml-1">*</span>
                </Label>
                <Input
                  id="edit-last-name"
                  placeholder="Enter last name"
                  className="h-12 text-base border-gray-300 focus:border-blue-500 focus:ring-blue-200"
                  {...editForm.register('last_name')}
                />
                {editForm.formState.errors.last_name && (
                  <p className="text-sm text-red-600 flex items-center mt-2">
                    <span className="w-1.5 h-1.5 bg-red-500 rounded-full mr-2"></span>
                    {editForm.formState.errors.last_name.message}
                  </p>
                )}
              </div>

              {/* Role */}
              <div className="space-y-3">
                <Label htmlFor="edit-role" className="text-sm font-semibold text-gray-800 flex items-center">
                  User Role <span className="text-red-500 ml-1">*</span>
                </Label>
                <Select onValueChange={(value) => editForm.setValue('role', value as UserRole)} defaultValue={editForm.getValues('role')}>
                  <SelectTrigger className="h-12 text-base border-gray-300 focus:border-blue-500 focus:ring-blue-200">
                    <SelectValue placeholder="Choose user role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={UserRole.ADMINISTRATOR}>Administrator</SelectItem>
                    <SelectItem value={UserRole.SUPERVISOR}>Supervisor</SelectItem>
                    <SelectItem value={UserRole.SAFETY_OFFICER}>Safety Officer</SelectItem>
                    <SelectItem value={UserRole.OPERATOR}>Operator</SelectItem>
                  </SelectContent>
                </Select>
                {editForm.formState.errors.role && (
                  <p className="text-sm text-red-600 flex items-center mt-2">
                    <span className="w-1.5 h-1.5 bg-red-500 rounded-full mr-2"></span>
                    {editForm.formState.errors.role.message}
                  </p>
                )}
              </div>

              {/* Assigned Site */}
              <div className="space-y-3">
                <Label htmlFor="edit-site" className="text-sm font-semibold text-gray-800 flex items-center">
                  Assigned Site
                </Label>
                <Select onValueChange={(value) => editForm.setValue('site_id', value)} defaultValue={editForm.getValues('site_id') || 'none'}>
                  <SelectTrigger className="h-12 text-base border-gray-300 focus:border-blue-500 focus:ring-blue-200">
                    <SelectValue placeholder="Choose assigned site" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No site assigned</SelectItem>
                    {sites.map((site) => (
                      <SelectItem key={site.site_id} value={site.site_id}>
                        {site.site_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-sm text-gray-500 flex items-center">
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mr-2"></span>
                  Optional: Assign user to a specific construction site for focused access
                </p>
              </div>

              {/* Status */}
              <div className="space-y-3">
                <Label htmlFor="edit-status" className="text-sm font-semibold text-gray-800 flex items-center">
                  Account Status <span className="text-red-500 ml-1">*</span>
                </Label>
                <Select onValueChange={(value) => editForm.setValue('is_active', value === 'true')} defaultValue={editForm.getValues('is_active')?.toString()}>
                  <SelectTrigger className="h-12 text-base border-gray-300 focus:border-blue-500 focus:ring-blue-200">
                    <SelectValue placeholder="Choose account status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">Active</SelectItem>
                    <SelectItem value="false">Inactive</SelectItem>
                  </SelectContent>
                </Select>
                {editForm.formState.errors.is_active && (
                  <p className="text-sm text-red-600 flex items-center mt-2">
                    <span className="w-1.5 h-1.5 bg-red-500 rounded-full mr-2"></span>
                    {editForm.formState.errors.is_active.message}
                  </p>
                )}
              </div>

              {/* Form Actions */}
              <div className="flex justify-end space-x-4 pt-8 border-t border-gray-200">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsEditDialogOpen(false)}
                  className="px-8 py-3 h-12 text-base font-medium border-gray-300 hover:bg-gray-50"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="px-8 py-3 h-12 text-base font-medium bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-lg hover:shadow-xl transition-all duration-200"
                >
                  Update User
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[500px] bg-white">
          <DialogHeader className="pb-6">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-red-600 rounded-xl flex items-center justify-center shadow-lg">
                <Trash2 className="h-6 w-6 text-white" />
              </div>
              <div>
                <DialogTitle className="text-2xl font-bold text-gray-900">Delete User</DialogTitle>
                <p className="text-gray-600 mt-1">Remove user from the system</p>
              </div>
            </div>
          </DialogHeader>
          
          <div className="py-6">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <div className="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center">
                    <span className="text-red-600 text-sm font-semibold">!</span>
                  </div>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">Warning</h3>
                  <p className="text-sm text-red-700 mt-1">
                    This action cannot be undone. The user will be permanently removed from the system.
                  </p>
                </div>
              </div>
            </div>
            
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-gray-900 mb-2">User Details:</h4>
              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex justify-between">
                  <span className="font-medium">Name:</span>
                  <span>{selectedUser?.first_name} {selectedUser?.last_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Username:</span>
                  <span>{selectedUser?.username}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Email:</span>
                  <span>{selectedUser?.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Role:</span>
                  <span>{selectedUser?.role}</span>
                </div>
              </div>
            </div>
            
            <p className="text-gray-700 mt-6 text-center font-medium">
              Are you sure you want to delete this user?
            </p>
          </div>
          
          <DialogFooter className="pt-6 border-t border-gray-200">
            <Button 
              variant="outline" 
              onClick={() => setIsDeleteDialogOpen(false)}
              className="px-6 py-2.5 text-base font-medium border-gray-300 hover:bg-gray-50"
            >
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDeleteUser}
              className="px-6 py-2.5 text-base font-medium bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 shadow-lg hover:shadow-xl transition-all duration-200"
            >
              Confirm Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
