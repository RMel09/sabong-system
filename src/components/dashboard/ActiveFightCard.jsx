import React from 'react';
import { Card } from '@/components/ui/card';
import FightStatusBadge from './FightStatusBadge';

export default function ActiveFightCard({ fight }) {
  const totalBets = (fight.total_meron_bets || 0) + (fight.total_wala_bets || 0);
  const meronPct = totalBets > 0 ? ((fight.total_meron_bets || 0) / totalBets) * 100 : 50;
  const walaPct = totalBets > 0 ? ((fight.total_wala_bets || 0) / totalBets) * 100 : 50;

  return (
    <Card className="p-5 bg-card border-border overflow-hidden">
      <div className="flex items-center justify-between mb-4">
        <span className="font-heading text-lg font-bold text-primary">FIGHT #{fight.fight_number}</span>
        <FightStatusBadge status={fight.status} />
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-center">
          <p className="text-[10px] uppercase tracking-wider text-red-400 font-body">Meron</p>
          <p className="font-heading font-bold text-red-400 text-sm mt-1 truncate">{fight.meron_name}</p>
          <p className="text-lg font-heading font-bold text-red-300 mt-1">₱{(fight.total_meron_bets || 0).toLocaleString()}</p>
        </div>
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 text-center">
          <p className="text-[10px] uppercase tracking-wider text-blue-400 font-body">Wala</p>
          <p className="font-heading font-bold text-blue-400 text-sm mt-1 truncate">{fight.wala_name}</p>
          <p className="text-lg font-heading font-bold text-blue-300 mt-1">₱{(fight.total_wala_bets || 0).toLocaleString()}</p>
        </div>
      </div>

      <div className="h-2 bg-muted rounded-full overflow-hidden flex">
        <div className="bg-red-500 transition-all duration-500" style={{ width: `${meronPct}%` }} />
        <div className="bg-blue-500 transition-all duration-500" style={{ width: `${walaPct}%` }} />
      </div>
      <div className="flex justify-between mt-1">
        <span className="text-[10px] text-muted-foreground">{meronPct.toFixed(0)}%</span>
        <span className="text-[10px] text-muted-foreground">₱{totalBets.toLocaleString()} total</span>
        <span className="text-[10px] text-muted-foreground">{walaPct.toFixed(0)}%</span>
      </div>
    </Card>
  );
}