import React from 'react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export default function StatsCard({ title, value, icon: Icon, accent }) {
  return (
    <Card className="p-5 bg-card border-border relative overflow-hidden">
      <div className={cn("absolute top-0 right-0 w-20 h-20 rounded-full -translate-y-6 translate-x-6 opacity-10", accent)} />
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-muted-foreground font-body uppercase tracking-wider">{title}</p>
          <p className="text-2xl font-heading font-bold mt-1">{value}</p>
        </div>
        {Icon && (
          <div className={cn("p-2.5 rounded-lg", accent, "bg-opacity-20")}>
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>
    </Card>
  );
}