'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { DashboardOverview } from '@/components/dashboard/dashboard-overview';
import { LiveMonitoring } from '@/components/monitoring/live-monitoring';
import { AlertsPage } from '@/components/alerts/alerts-page';
import { ReportsPage } from '@/components/reports/reports-page';
import { SitesPage } from '@/components/sites/sites-page';
import { CamerasPage } from '@/components/cameras/cameras-page';
import UsersPage from '@/components/users/users-page';
import { SettingsPage } from '@/components/settings/settings-page';

export function DashboardContent() {
  const pathname = usePathname();

  const renderContent = () => {
    switch (pathname) {
      case '/dashboard':
        return <DashboardOverview />;
      case '/dashboard/monitoring':
        return <LiveMonitoring />;
      case '/dashboard/alerts':
        return <AlertsPage />;
      case '/dashboard/reports':
        return <ReportsPage />;
      case '/dashboard/sites':
        return <SitesPage />;
      case '/dashboard/cameras':
        return <CamerasPage />;
      case '/dashboard/users':
        return <UsersPage />;
      case '/dashboard/settings':
        return <SettingsPage />;
      default:
        return <DashboardOverview />;
    }
  };

  return (
    <div className="w-full">
      {renderContent()}
    </div>
  );
}
