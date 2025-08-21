'use client';

import React from 'react';
import { LucideIcon, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MetricCardProps {
  title: string;
  value: number | string;
  icon: LucideIcon;
  color?: 'red' | 'orange' | 'blue' | 'green' | 'purple';
  trend?: 'up' | 'down' | 'stable';
  trendValue?: number;
  trendLabel?: string;
  className?: string;
}

const colorClasses = {
  red: 'text-red-600 bg-red-100',
  orange: 'text-orange-600 bg-orange-100',
  blue: 'text-blue-600 bg-blue-100',
  green: 'text-green-600 bg-green-100',
  purple: 'text-purple-600 bg-purple-100',
};

const trendIcons = {
  up: TrendingUp,
  down: TrendingDown,
  stable: Minus,
};

const trendColors = {
  up: 'text-green-600',
  down: 'text-red-600',
  stable: 'text-gray-500',
};

export function MetricCard({
  title,
  value,
  icon: Icon,
  color = 'blue',
  trend,
  trendValue,
  trendLabel,
  className,
}: MetricCardProps) {
  return (
    <div className={cn('bg-white rounded-lg shadow p-6', className)}>
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 truncate">{title}</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">{value}</p>
          
          {trend && trendValue !== undefined && (
            <div className="mt-2 flex items-center">
              {React.createElement(trendIcons[trend], {
                className: cn('h-4 w-4 mr-1', trendColors[trend]),
              })}
              <span className={cn('text-sm font-medium', trendColors[trend])}>
                {trend === 'up' ? '+' : ''}{trendValue}%
              </span>
              {trendLabel && (
                <span className="text-sm text-gray-500 ml-1">{trendLabel}</span>
              )}
            </div>
          )}
        </div>
        
        <div className={cn('flex h-12 w-12 items-center justify-center rounded-lg', colorClasses[color])}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
}
