import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Plus, CreditCard, ChevronDown, ChevronUp } from 'lucide-react';

export default function OperatorManager() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ name: '', username: '', pin: '', terminal_id: '', commission_rate: 5 });
  const [loadCredits, setLoadCredits] = useState({});
  const [expanded, setExpanded] = useState(null);

  const { data: operators = [] } = useQuery({
    queryKey: ['operators'],
    queryFn: () => base44.entities.Operator.list(),
  });

  const { data: bets = [] } = useQuery({
    queryKey: ['bets'],
    queryFn: () => base44.entities.Bet.list('-created_date', 1000),
  });

  const createOperator = async () => {
    if (!form.name || !form.terminal_id || !form.username || !form.pin) {
      toast.error('Fill in all fields including username and PIN');
      return;
    }
    await base44.entities.Operator.create({ ...form, total_volume: 0, total_commission: 0, pending_payout: 0, total_bets_placed: 0, total_payouts: 0, loaded_total: 0, credit_balance: 0, status: 'active' });
    queryClient.invalidateQueries({ queryKey: ['operators'] });
    setForm({ name: '', username: '', pin: '', terminal_id: '', commission_rate: 5 });
    toast.success('Operator created');
  };

  const updateField = async (op, field, value) => {
    await base44.entities.Operator.update(op.id, { [field]: value });
    queryClient.invalidateQueries({ queryKey: ['operators'] });
    toast.success('Updated');
  };

  const loadOperatorCredits = async (op) => {
    const amt = Number(loadCredits[op.id] || 0);
    if (!amt || amt <= 0) return;
    await base44.entities.Operator.update(op.id, {
      credit_balance: (op.credit_balance || 0) + amt,
      loaded_total: (op.loaded_total || 0) + amt,
    });
    queryClient.invalidateQueries({ queryKey: ['operators'] });
    setLoadCredits(p => ({ ...p, [op.id]: '' }));
    toast.success(`₱${amt.toLocaleString()} credits loaded`);
  };

  const markPaid = async (op) => {
    await base44.entities.Operator.update(op.id, { pending_payout: 0 });
    queryClient.invalidateQueries({ queryKey: ['operators'] });
    toast.success('Payout marked as paid');
  };

  const toggleStatus = async (op) => {
    const newStatus = op.status === 'active' ? 'inactive' : 'active';
    await base44.entities.Operator.update(op.id, { status: newStatus });
    queryClient.invalidateQueries({ queryKey: ['operators'] });
    toast.success(`Operator ${newStatus}`);
  };

  return (
    <div className="space-y-6">
      <Card className="p-6 bg-card border-border">
        <h2 className="font-heading text-lg font-bold tracking-wider mb-4 text-primary">ADD OPERATOR</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
          <div><Label className="text-xs text-muted-foreground">Operator Name</Label><Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="bg-background" /></div>
          <div><Label className="text-xs text-muted-foreground">Username</Label><Input value={form.username} onChange={e => setForm({...form, username: e.target.value})} className="bg-background" /></div>
          <div><Label className="text-xs text-muted-foreground">PIN (4-6 digits)</Label><Input type="password" value={form.pin} onChange={e => setForm({...form, pin: e.target.value})} maxLength={6} className="bg-background" /></div>
          <div><Label className="text-xs text-muted-foreground">Terminal ID</Label><Input value={form.terminal_id} onChange={e => setForm({...form, terminal_id: e.target.value})} placeholder="e.g. terminal-2" className="bg-background" /></div>
          <div><Label className="text-xs text-muted-foreground">Commission Rate %</Label><Input type="number" value={form.commission_rate} onChange={e => setForm({...form, commission_rate: Number(e.target.value)})} className="bg-background" /></div>
        </div>
        <Button onClick={createOperator} className="font-heading tracking-wider"><Plus className="w-4 h-4 mr-2" />ADD OPERATOR</Button>
      </Card>

      <Card className="p-6 bg-card border-border">
        <h2 className="font-heading text-lg font-bold tracking-wider mb-4 text-primary">OPERATORS</h2>
        <div className="space-y-3">
          {operators.map(op => {
            const opBets = bets.filter(b => b.operator_id === op.id).slice(-20);
            const netProfit = ((op.total_volume || 0) * (op.commission_rate || 0) / 100).toFixed(0);
            const isExpanded = expanded === op.id;
            return (
              <div key={op.id} className={`rounded-lg border ${op.status === 'inactive' ? 'border-border opacity-60' : 'border-border'}`}>
                <div className="p-4 bg-secondary/20">
                  <div className="flex items-start justify-between flex-wrap gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-heading font-bold">{op.name}</p>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-heading ${op.status === 'active' ? 'bg-green-500/20 text-green-400' : 'bg-muted text-muted-foreground'}`}>{op.status?.toUpperCase()}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">@{op.username} · {op.terminal_id}</p>
                    </div>
                    <div className="flex flex-wrap gap-3 text-sm items-center">
                      <div className="text-center"><p className="text-[10px] text-muted-foreground">CREDITS</p><p className={`font-heading font-bold ${(op.credit_balance||0) < 500 ? 'text-red-400' : 'text-green-400'}`}>₱{(op.credit_balance||0).toLocaleString()}</p></div>
                      <div className="text-center"><p className="text-[10px] text-muted-foreground">LOADED</p><p className="font-heading font-bold text-blue-400">₱{(op.loaded_total||0).toLocaleString()}</p></div>
                      <div className="text-center"><p className="text-[10px] text-muted-foreground">VOLUME</p><p className="font-heading font-bold text-yellow-400">₱{(op.total_volume||0).toLocaleString()}</p></div>
                      <div className="text-center"><p className="text-[10px] text-muted-foreground">NET PROFIT</p><p className="font-heading font-bold text-primary">₱{Number(netProfit).toLocaleString()}</p></div>
                      <div className="text-center"><p className="text-[10px] text-muted-foreground">PENDING</p><p className="font-heading font-bold">₱{(op.pending_payout||0).toLocaleString()}</p></div>
                    </div>
                  </div>

                  {/* Load credits */}
                  <div className="flex items-center gap-2 mt-3 flex-wrap">
                    <Input
                      type="number"
                      placeholder="Load ₱ credits"
                      value={loadCredits[op.id] || ''}
                      onChange={e => setLoadCredits(p => ({...p, [op.id]: e.target.value}))}
                      className="w-36 h-8 bg-background text-sm"
                    />
                    <Button size="sm" onClick={() => loadOperatorCredits(op)} className="font-heading text-xs tracking-wider h-8">
                      <CreditCard className="w-3 h-3 mr-1" />LOAD
                    </Button>
                    <div className="flex items-center gap-1.5 ml-1">
                      <input type="number" defaultValue={op.commission_rate} onBlur={e => updateField(op, 'commission_rate', Number(e.target.value))} className="w-14 h-8 bg-background border border-border rounded px-2 text-center text-xs font-heading" />
                      <span className="text-xs text-muted-foreground">%</span>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => markPaid(op)} className="font-heading text-xs tracking-wider h-8">MARK PAID</Button>
                    <Button size="sm" variant="ghost" onClick={() => toggleStatus(op)} className="font-heading text-xs tracking-wider h-8 text-muted-foreground">
                      {op.status === 'active' ? 'DISABLE' : 'ENABLE'}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setExpanded(isExpanded ? null : op.id)} className="font-heading text-xs h-8 ml-auto">
                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />} PAYOUTS
                    </Button>
                  </div>
                </div>

                {/* Payout history */}
                {isExpanded && (
                  <div className="p-4 border-t border-border">
                    <p className="text-xs font-heading tracking-wider text-muted-foreground mb-2">LAST 20 TRANSACTIONS (This Operator)</p>
                    {opBets.length === 0 ? (
                      <p className="text-xs text-muted-foreground">No bets yet</p>
                    ) : (
                      <div className="space-y-1 max-h-48 overflow-auto">
                        {opBets.reverse().map(b => (
                          <div key={b.id} className="flex justify-between text-xs p-2 bg-secondary/20 rounded">
                            <span className="font-mono text-muted-foreground truncate w-32">{b.ticket_number}</span>
                            <span className="font-heading">Fight #{b.fight_number}</span>
                            <span className={`font-heading font-bold ${b.side === 'meron' ? 'text-red-400' : b.side === 'wala' ? 'text-blue-400' : 'text-green-400'}`}>{b.side?.toUpperCase()}</span>
                            <span>₱{(b.amount||0).toLocaleString()}</span>
                            <span className={`font-heading ${b.status === 'won' ? 'text-green-400' : b.status === 'lost' ? 'text-red-400' : b.status === 'paid' ? 'text-muted-foreground' : 'text-yellow-400'}`}>{b.status?.toUpperCase()}</span>
                            {b.payout > 0 && <span className="text-primary">₱{b.payout.toLocaleString()}</span>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
          {operators.length === 0 && <p className="text-muted-foreground text-sm text-center py-4">No operators yet</p>}
        </div>
      </Card>
    </div>
  );
}