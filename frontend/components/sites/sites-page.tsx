'use client';

import React, { useState, useEffect } from 'react';
import { useWebSocket } from '@/contexts/websocket-context';
import { useSites } from '@/hooks/use-sites';
import { SiteForm } from './site-form';
import { Building, Plus, Edit, Trash2, MapPin, Phone, Users, Camera, AlertTriangle, Search, Filter, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Site, SiteCreate, SiteUpdate } from '@/lib/api/sites';

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
  const { 
    sites, 
    loading, 
    error, 
    stats, 
    refreshSites, 
    createSite, 
    updateSite, 
    deleteSite 
  } = useSites();
  
  const [filteredSites, setFilteredSites] = useState<Site[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingSite, setEditingSite] = useState<Site | null>(null);
  const [formLoading, setFormLoading] = useState(false);

  useEffect(() => {
    // Subscribe to site updates
    const unsubscribeSiteUpdate = subscribe('site_update', (data) => {
      if (data.type === 'site_update') {
        refreshSites();
      }
    });

    return () => {
      unsubscribeSiteUpdate();
    };
  }, [subscribe, refreshSites]);

  useEffect(() => {
    // Apply filters
    let filtered = sites;

    if (searchTerm) {
      filtered = filtered.filter(site =>
        site.site_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        site.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
        site.contact_person.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(site => site.status === statusFilter);
    }

    setFilteredSites(filtered);
  }, [sites, searchTerm, statusFilter]);

  const handleDeleteSite = async (siteId: string) => {
    if (window.confirm('Are you sure you want to delete this site? This action cannot be undone.')) {
      try {
        await deleteSite(siteId);
      } catch (error) {
        console.error('Error deleting site:', error);
      }
    }
  };

  const handleEditSite = (site: Site) => {
    setEditingSite(site);
    setShowForm(true);
  };

  const handleFormSubmit = async (data: SiteCreate | SiteUpdate) => {
    setFormLoading(true);
    try {
      if (editingSite) {
        await updateSite(editingSite.site_id, data as SiteUpdate);
      } else {
        await createSite(data as SiteCreate);
      }
      setShowForm(false);
      setEditingSite(null);
    } catch (error) {
      console.error('Error submitting form:', error);
    } finally {
      setFormLoading(false);
    }
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingSite(null);
  };

  const getStatusCount = (status: string) => {
    return sites.filter(site => site.status === status).length;
  };

  if (loading) {
    return (
      <div className="py-8 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary-600" />
          <p className="text-gray-600">Loading sites...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex">
            <AlertTriangle className="h-5 w-5 text-red-400 mt-0.5" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error loading sites</h3>
              <p className="mt-1 text-sm text-red-700">{error}</p>
              <button
                onClick={refreshSites}
                className="mt-2 text-sm text-red-800 hover:text-red-900 underline"
              >
                Try again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

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
            onClick={() => setShowForm(true)}
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
              <p className="text-2xl font-bold text-blue-600">{stats?.total_sites || sites.length}</p>
              <p className="text-xs text-gray-500">{stats?.active_sites || getStatusCount('active')} active</p>
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
              <p className="text-2xl font-bold text-green-600">{stats?.total_workers || 0}</p>
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
              <p className="text-2xl font-bold text-yellow-600">{stats?.total_cameras || 0}</p>
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
              <p className="text-2xl font-bold text-red-600">{stats?.total_alerts || 0}</p>
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
                <tr key={site.site_id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{site.site_name}</div>
                      <div className="text-sm text-gray-500 flex items-center">
                        <MapPin className="h-3 w-3 mr-1" />
                        {site.location}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{site.contact_person}</div>
                      <div className="text-sm text-gray-500 flex items-center">
                        <Phone className="h-3 w-3 mr-1" />
                        {site.contact_phone || 'N/A'}
                      </div>
                      <div className="text-sm text-gray-500">{site.contact_email || 'N/A'}</div>
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
                    {site.camera_count}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {site.worker_count}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={cn(
                      'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium',
                      site.active_alerts > 0 ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                    )}>
                      {site.active_alerts}
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
                        onClick={() => handleDeleteSite(site.site_id)}
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

      {/* Site Form Modal */}
      <SiteForm
        site={editingSite}
        isOpen={showForm}
        onClose={handleCloseForm}
        onSubmit={handleFormSubmit}
        loading={formLoading}
      />
    </div>
  );
}
