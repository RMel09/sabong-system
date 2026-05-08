import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { format } from 'date-fns';
import { Shield, AlertTriangle, Info } from 'lucide-react';

const severityIcon = {
  info: <Info className="w-3.5 h-3.5 text-blue-400" />,
  warning: <AlertTriangle className="w-3.5 h-3.5 text-yellow-400" />,
  critical: <Shield className="w-3.5 h-3.5 text-red-400" />,
};
const severityBg = {
  info: 'bg-blue-500/5 border-blue-500/20',
  warning: 'bg-yellow-500/5 border-yellow-500/20',
  critical: 'bg-red-500/10 border-red-500/30',
};

export default function AuditLogViewer() {
  const [search, setSearch] = useState('');

  const { data: logs = [] } = useQuery({
    queryKey: ['audit-logs'],
    queryFn: () => base44.entities.AuditLog.list('-created_date', 200),
    refetchInterval: 5000,
  });

  const filtered = logs.filter(l =>
    !search || l.action?.includes(search.toUpperCase()) || l.description?.toLowerCase().includes(search.toLowerCase()) || l.operator_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <Card className="p-6 bg-card border-border">
        <h2 className="font-heading text-lg font-bold tracking-wider mb-4 text-primary">AUDIT LOG</h2>
        <Input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by action, operator, or description..."
          className="bg-background mb-4"
        />
        <div className="space-y-2 max-h-[600px] overflow-auto">
          {filtered.map(log => (
            <div key={log.id} className={`flex items-start gap-3 p-3 rounded-lg border text-sm ${severityBg[log.severity] || severityBg.info}`}>
              <div className="mt-0.5">{severityIcon[log.severity] || severityIcon.info}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-heading font-bold text-xs tracking-wider">{log.action}</span>
                  {log.operator_name && <span className="text-xs text-muted-foreground">by {log.operator_name}</span>}
                  {log.terminal_id && <span className="text-xs text-muted-foreground">({log.terminal_id})</span>}
                  {log.fight_number && <span className="text-xs text-yellow-400">Fight #{log.fight_number}</span>}
                  {log.amount > 0 && <span className="text-xs text-green-400">₱{log.amount?.toLocaleString()}</span>}
                </div>
                {log.description && <p className="text-xs text-muted-foreground mt-0.5">{log.description}</p>}
              </div>
              <span className="text-[10px] text-muted-foreground whitespace-nowrap shrink-0">
                {log.created_date ? format(new Date(log.created_date), 'MM/dd HH:mm:ss') : ''}
              </span>
            </div>
          ))}
          {filtered.length === 0 && <p className="text-center text-muted-foreground py-8 text-sm">No audit logs</p>}
        </div>
      </Card>
    </div>
  );
}