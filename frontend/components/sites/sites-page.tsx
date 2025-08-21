'use client';

import React, { useState, useEffect } from 'react';
import { useWebSocket } from '@/contexts/websocket-context';
import { Building, Plus, Edit, Trash2, MapPin, Phone, Users, Camera, AlertTriangle, Search, Filter } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Site {
  id: string;
  name: string;
  location: string;
  contactPerson: string;
  contactPhone: string;
  contactEmail: string;
  status: 'active' | 'inactive' | 'maintenance';
  cameraCount: number;
  workerCount: number;
  activeAlerts: number;
  createdAt: string;
  lastUpdated: string;
}

const mockSites: Site[] = [
  {
    id: 'SITE_001',
    name: 'Downtown Construction Project',
    location: '123 Main Street, Downtown',
    contactPerson: 'John Smith',
    contactPhone: '+1 (555) 123-4567',
    contactEmail: 'john.smith@construction.com',
    status: 'active',
    cameraCount: 3,
    workerCount: 25,
    activeAlerts: 2,
    createdAt: '2024-01-15',
    lastUpdated: '2024-01-20',
  },
  {
    id: 'SITE_002',
    name: 'Industrial Warehouse Complex',
    location: '456 Industrial Blvd, Westside',
    contactPerson: 'Sarah Johnson',
    contactPhone: '+1 (555) 234-5678',
    contactEmail: 'sarah.johnson@warehouse.com',
    status: 'active',
    cameraCount: 2,
    workerCount: 18,
    activeAlerts: 1,
    createdAt: '2024-01-10',
    lastUpdated: '2024-01-19',
  },
  {
    id: 'SITE_003',
    name: 'Residential Development Phase 1',
    location: '789 Oak Avenue, North District',
    contactPerson: 'Mike Davis',
    contactPhone: '+1 (555) 345-6789',
    contactEmail: 'mike.davis@residential.com',
    status: 'maintenance',
    cameraCount: 1,
    workerCount: 12,
    activeAlerts: 0,
    createdAt: '2024-01-05',
    lastUpdated: '2024-01-18',
  },
  {
    id: 'SITE_004',
    name: 'Highway Bridge Project',
    location: 'Highway 101, Exit 45',
    contactPerson: 'Lisa Wilson',
    contactPhone: '+1 (555) 456-7890',
    contactEmail: 'lisa.wilson@bridge.com',
    status: 'active',
    cameraCount: 4,
    workerCount: 32,
    activeAlerts: 3,
    createdAt: '2024-01-12',
    lastUpdated: '2024-01-21',
  },
];

const statusColors = {
  active: 'bg-green-100 text-green-800 border-green-200',
  inactive: 'bg-gray-100 text-gray-800 border-gray-200',
  maintenance: 'bg-yellow-100 text-yellow-800 border-yellow-200',
};

const statusIcons = {
  active: '●',
  inactive: '○',
  maintenance: '⚠',
};

export function SitesPage() {
  const { subscribe, isConnected } = useWebSocket();
  const [sites, setSites] = useState<Site[]>(mockSites);
  const [filteredSites, setFilteredSites] = useState<Site[]>(mockSites);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingSite, setEditingSite] = useState<Site | null>(null);

  useEffect(() => {
    // Subscribe to site updates
    const unsubscribeSiteUpdate = subscribe('site_update', (data) => {
      if (data.type === 'site_update') {
        setSites(prev => prev.map(site => 
          site.id === data.payload.id 
            ? { ...site, ...data.payload }
            : site
        ));
      }
    });

    return () => {
      unsubscribeSiteUpdate();
    };
  }, [subscribe]);

  useEffect(() => {
    // Apply filters
    let filtered = sites;

    if (searchTerm) {
      filtered = filtered.filter(site =>
        site.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        site.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
        site.contactPerson.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(site => site.status === statusFilter);
    }

    setFilteredSites(filtered);
  }, [sites, searchTerm, statusFilter]);

  const handleDeleteSite = (siteId: string) => {
    if (window.confirm('Are you sure you want to delete this site? This action cannot be undone.')) {
      setSites(prev => prev.filter(site => site.id !== siteId));
    }
  };

  const handleEditSite = (site: Site) => {
    setEditingSite(site);
    setShowAddModal(true);
  };

  const getStatusCount = (status: string) => {
    return sites.filter(site => site.status === status).length;
  };

  const getTotalWorkers = () => {
    return sites.reduce((total, site) => total + site.workerCount, 0);
  };

  const getTotalCameras = () => {
    return sites.reduce((total, site) => total + site.cameraCount, 0);
  };

  const getTotalAlerts = () => {
    return sites.reduce((total, site) => total + site.activeAlerts, 0);
  };

  return (
    <div className="py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Construction Sites</h1>
            <p className="mt-2 text-gray-600">
              Manage and monitor construction sites across all locations
            </p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>Add Site</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Building className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Total Sites</p>
              <p className="text-2xl font-bold text-blue-600">{sites.length}</p>
              <p className="text-xs text-gray-500">{getStatusCount('active')} active</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <Users className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Total Workers</p>
              <p className="text-2xl font-bold text-green-600">{getTotalWorkers()}</p>
              <p className="text-xs text-gray-500">Across all sites</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Camera className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Total Cameras</p>
              <p className="text-2xl font-bold text-yellow-600">{getTotalCameras()}</p>
              <p className="text-xs text-gray-500">Monitoring active</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Active Alerts</p>
              <p className="text-2xl font-bold text-red-600">{getTotalAlerts()}</p>
              <p className="text-xs text-gray-500">Requiring attention</p>
            </div>
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Search */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search sites..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Status Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="all">All Statuses</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="maintenance">Maintenance</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Sites List */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            Sites ({filteredSites.length})
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Site
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contact
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cameras
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Workers
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Alerts
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredSites.map((site) => (
                <tr key={site.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{site.name}</div>
                      <div className="text-sm text-gray-500 flex items-center">
                        <MapPin className="h-3 w-3 mr-1" />
                        {site.location}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{site.contactPerson}</div>
                      <div className="text-sm text-gray-500 flex items-center">
                        <Phone className="h-3 w-3 mr-1" />
                        {site.contactPhone}
                      </div>
                      <div className="text-sm text-gray-500">{site.contactEmail}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={cn(
                      'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border',
                      statusColors[site.status]
                    )}>
                      <span className="mr-1">{statusIcons[site.status]}</span>
                      {site.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {site.cameraCount}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {site.workerCount}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={cn(
                      'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium',
                      site.activeAlerts > 0 ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                    )}>
                      {site.activeAlerts}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleEditSite(site)}
                        className="text-primary-600 hover:text-primary-900"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteSite(site.id)}
                        className="text-red-600 hover:text-red-900"
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

        {filteredSites.length === 0 && (
          <div className="p-8 text-center">
            <Building className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No sites found</h3>
            <p className="text-gray-600">Try adjusting your filters or search terms</p>
          </div>
        )}
      </div>

      {/* Connection Status */}
      <div className="mt-6">
        <div className={cn(
          'inline-flex items-center px-3 py-1 rounded-full text-sm font-medium',
          isConnected 
            ? 'bg-green-100 text-green-800' 
            : 'bg-red-100 text-red-800'
        )}>
          <div className={cn(
            'w-2 h-2 rounded-full mr-2',
            isConnected ? 'bg-green-400' : 'bg-red-400'
          )} />
          {isConnected ? 'WebSocket Connected' : 'WebSocket Disconnected'}
        </div>
      </div>

      {/* Add/Edit Modal Placeholder */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {editingSite ? 'Edit Site' : 'Add New Site'}
            </h3>
            <p className="text-gray-600 mb-4">
              {editingSite 
                ? 'Update site information below.' 
                : 'Fill in the details to create a new construction site.'
              }
            </p>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowAddModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  // In a real app, this would save the site
                  setShowAddModal(false);
                  setEditingSite(null);
                }}
                className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
              >
                {editingSite ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
