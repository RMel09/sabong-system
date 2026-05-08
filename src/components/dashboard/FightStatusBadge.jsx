import React from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const statusStyles = {
  upcoming: 'bg-muted text-muted-foreground',
  open: 'bg-green-500/20 text-green-400 border-green-500/30',
  last_call: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30 animate-pulse',
  closed: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  fight: 'bg-red-500/20 text-red-400 border-red-500/30 animate-pulse',
  finished: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  cancelled: 'bg-muted text-muted-foreground line-through',
};

const statusLabels = {
  upcoming: 'UPCOMING',
  open: 'OPEN BETS',
  last_call: 'LAST CALL',
  closed: 'BETS CLOSED',
  fight: 'FIGHTING',
  finished: 'FINISHED',
  cancelled: 'CANCELLED',
};

export default function FightStatusBadge({ status }) {
  return (
    <Badge variant="outline" className={cn("font-heading tracking-wider text-xs", statusStyles[status])}>
      {statusLabels[status] || status?.toUpperCase()}
    </Badge>
  );
}