import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AlertTriangle, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { logAction } from '@/lib/auditLog';

export default function SystemResetPanel() {
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const queryClient = useQueryClient();

  const doReset = async () => {
    if (confirm !== 'RESET') return;
    setLoading(true);
    // Delete all fights, bets, archives
    const [fights, bets, archives] = await Promise.all([
      base44.entities.Fight.list('', 500),
      base44.entities.Bet.list('', 1000),
      base44.entities.FightArchive.list('', 500),
    ]);
    await Promise.all([
      ...fights.map(f => base44.entities.Fight.delete(f.id)),
      ...bets.map(b => base44.entities.Bet.delete(b.id)),
      ...archives.map(a => base44.entities.FightArchive.delete(a.id)),
    ]);
    await logAction({ action: 'SYSTEM_RESET', description: 'Full system reset — all fights, bets, and archives deleted', severity: 'critical' });
    queryClient.invalidateQueries();
    setConfirm('');
    setLoading(false);
    toast.success('System reset complete');
  };

  return (
    <div className="space-y-4">
      <Card className="p-6 bg-card border-red-500/20 border">
        <div className="flex items-start gap-3 mb-4">
          <AlertTriangle className="w-6 h-6 text-red-400 shrink-0 mt-0.5" />
          <div>
            <h2 className="font-heading text-lg font-bold tracking-wider text-red-400">FULL SYSTEM RESET</h2>
            <p className="text-sm text-muted-foreground mt-1">This will permanently delete ALL fights, bets, and fight archives. Operators and system config are preserved. This action cannot be undone.</p>
          </div>
        </div>
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground font-heading tracking-wider">Type <span className="text-red-400 font-bold">RESET</span> to confirm:</p>
          <Input
            value={confirm}
            onChange={e => setConfirm(e.target.value.toUpperCase())}
            placeholder="Type RESET here"
            className="bg-background border-red-500/30 font-heading tracking-widest text-center"
          />
          <Button
            onClick={doReset}
            disabled={confirm !== 'RESET' || loading}
            className="w-full font-heading tracking-widest bg-red-600 hover:bg-red-700 text-white disabled:opacity-30"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            {loading ? 'RESETTING...' : 'EXECUTE FULL RESET'}
          </Button>
        </div>
      </Card>
    </div>
  );
}