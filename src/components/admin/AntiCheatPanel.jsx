import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, ShieldCheck } from 'lucide-react';

export default function AntiCheatPanel() {
  const { data: bets = [] } = useQuery({
    queryKey: ['bets-all'],
    queryFn: () => base44.entities.Bet.list('-created_date', 1000),
    refetchInterval: 10000,
  });

  const { data: fights = [] } = useQuery({
    queryKey: ['fights'],
    queryFn: () => base44.entities.Fight.list('-created_date', 100),
  });

  // Detect: bets placed on CLOSED fights
  const betsOnClosedFights = bets.filter(b => {
    const fight = fights.find(f => f.id === b.fight_id);
    return fight && ['closed', 'fight', 'finished', 'cancelled'].includes(fight.status) && b.status === 'active';
  });

  // Detect: unusually large single bets (> ₱50,000)
  const largeBets = bets.filter(b => (b.amount || 0) > 50000);

  // Detect: same terminal placing many bets on same fight in < 60s
  const terminalFightMap = {};
  bets.forEach(b => {
    const key = `${b.terminal_id}-${b.fight_id}`;
    if (!terminalFightMap[key]) terminalFightMap[key] = [];
    terminalFightMap[key].push(b);
  });
  const rapidBets = Object.entries(terminalFightMap).filter(([, bs]) => bs.length > 10).map(([key, bs]) => ({ key, count: bs.length, bets: bs }));

  // Duplicate ticket numbers
  const ticketMap = {};
  bets.forEach(b => {
    if (!b.ticket_number) return;
    if (!ticketMap[b.ticket_number]) ticketMap[b.ticket_number] = [];
    ticketMap[b.ticket_number].push(b);
  });
  const dupTickets = Object.entries(ticketMap).filter(([, bs]) => bs.length > 1);

  const hasAlerts = betsOnClosedFights.length || largeBets.length || rapidBets.length || dupTickets.length;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        {hasAlerts ? (
          <div className="flex items-center gap-2 text-red-400">
            <AlertTriangle className="w-5 h-5" />
            <span className="font-heading tracking-wider">ANOMALIES DETECTED</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-green-400">
            <ShieldCheck className="w-5 h-5" />
            <span className="font-heading tracking-wider">ALL CLEAR — NO ANOMALIES</span>
          </div>
        )}
      </div>

      {/* Bets on closed fights */}
      <Card className="p-5 bg-card border-border">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-heading font-bold tracking-wider text-sm">BETS ON CLOSED FIGHTS</h2>
          <Badge className={betsOnClosedFights.length ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}>
            {betsOnClosedFights.length} found
          </Badge>
        </div>
        {betsOnClosedFights.length > 0 ? (
          <div className="space-y-2">
            {betsOnClosedFights.map(b => (
              <div key={b.id} className="p-3 bg-red-500/5 border border-red-500/20 rounded text-xs flex justify-between">
                <span className="font-mono">{b.ticket_number}</span>
                <span className="text-red-400">Fight #{b.fight_number} — {b.side?.toUpperCase()} — ₱{(b.amount || 0).toLocaleString()}</span>
                <span className="text-muted-foreground">Terminal: {b.terminal_id}</span>
              </div>
            ))}
          </div>
        ) : <p className="text-muted-foreground text-sm">None detected</p>}
      </Card>

      {/* Large bets */}
      <Card className="p-5 bg-card border-border">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-heading font-bold tracking-wider text-sm">LARGE BETS (₱50,000+)</h2>
          <Badge className={largeBets.length ? 'bg-yellow-500/20 text-yellow-400' : 'bg-green-500/20 text-green-400'}>
            {largeBets.length} found
          </Badge>
        </div>
        {largeBets.length > 0 ? (
          <div className="space-y-2">
            {largeBets.map(b => (
              <div key={b.id} className="p-3 bg-yellow-500/5 border border-yellow-500/20 rounded text-xs flex justify-between">
                <span className="font-mono">{b.ticket_number}</span>
                <span className="text-yellow-400 font-bold">₱{(b.amount || 0).toLocaleString()}</span>
                <span className="text-muted-foreground">Fight #{b.fight_number} — {b.side?.toUpperCase()}</span>
              </div>
            ))}
          </div>
        ) : <p className="text-muted-foreground text-sm">None detected</p>}
      </Card>

      {/* Rapid bets per terminal */}
      <Card className="p-5 bg-card border-border">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-heading font-bold tracking-wider text-sm">HIGH-FREQUENCY TERMINALS (10+ bets per fight)</h2>
          <Badge className={rapidBets.length ? 'bg-orange-500/20 text-orange-400' : 'bg-green-500/20 text-green-400'}>
            {rapidBets.length} found
          </Badge>
        </div>
        {rapidBets.length > 0 ? (
          <div className="space-y-2">
            {rapidBets.map(({ key, count }) => (
              <div key={key} className="p-3 bg-orange-500/5 border border-orange-500/20 rounded text-xs flex justify-between">
                <span>{key}</span>
                <span className="text-orange-400 font-bold">{count} bets</span>
              </div>
            ))}
          </div>
        ) : <p className="text-muted-foreground text-sm">None detected</p>}
      </Card>

      {/* Duplicate tickets */}
      <Card className="p-5 bg-card border-border">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-heading font-bold tracking-wider text-sm">DUPLICATE TICKET NUMBERS</h2>
          <Badge className={dupTickets.length ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}>
            {dupTickets.length} found
          </Badge>
        </div>
        {dupTickets.length > 0 ? (
          <div className="space-y-2">
            {dupTickets.map(([tn, bs]) => (
              <div key={tn} className="p-3 bg-red-500/5 border border-red-500/20 rounded text-xs">
                <span className="font-mono text-red-400">{tn}</span> — {bs.length} copies
              </div>
            ))}
          </div>
        ) : <p className="text-muted-foreground text-sm">None detected</p>}
      </Card>
    </div>
  );
}