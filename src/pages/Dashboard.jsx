import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Swords, Banknote, Trophy, Users } from 'lucide-react';
import StatsCard from '../components/dashboard/StatsCard';
import ActiveFightCard from '../components/dashboard/ActiveFightCard';
import FightStatusBadge from '../components/dashboard/FightStatusBadge';
import { format } from 'date-fns';

export default function Dashboard() {
  const { data: fights = [] } = useQuery({
    queryKey: ['fights'],
    queryFn: () => base44.entities.Fight.list('-created_date', 50),
    refetchInterval: 3000,
  });

  const { data: bets = [] } = useQuery({
    queryKey: ['bets'],
    queryFn: () => base44.entities.Bet.list('-created_date', 200),
    refetchInterval: 3000,
  });

  const activeFights = fights.filter(f => ['open', 'last_call', 'closed', 'fight'].includes(f.status));
  const todayFights = fights.filter(f => f.event_date === format(new Date(), 'yyyy-MM-dd'));
  const totalBetAmount = bets.filter(b => b.status === 'active').reduce((sum, b) => sum + (b.amount || 0), 0);
  const finishedToday = todayFights.filter(f => f.status === 'finished').length;

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-heading text-3xl font-bold tracking-wide">DASHBOARD</h1>
          <p className="text-sm text-muted-foreground font-body mt-1">{format(new Date(), 'EEEE, MMMM d, yyyy')}</p>
        </div>
        <div className="flex items-center gap-2 bg-card border border-border rounded-lg px-4 py-2">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-sm font-body text-muted-foreground">Live</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatsCard title="Today's Fights" value={todayFights.length} icon={Swords} accent="bg-primary" />
        <StatsCard title="Active Bets" value={`₱${totalBetAmount.toLocaleString()}`} icon={Banknote} accent="bg-green-500" />
        <StatsCard title="Completed" value={finishedToday} icon={Trophy} accent="bg-blue-500" />
        <StatsCard title="Total Bets" value={bets.filter(b => b.status === 'active').length} icon={Users} accent="bg-purple-500" />
      </div>

      {activeFights.length > 0 && (
        <div className="mb-8">
          <h2 className="font-heading text-xl font-bold mb-4 tracking-wide">ACTIVE FIGHTS</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeFights.map(fight => (
              <ActiveFightCard key={fight.id} fight={fight} />
            ))}
          </div>
        </div>
      )}

      <div>
        <h2 className="font-heading text-xl font-bold mb-4 tracking-wide">RECENT FIGHTS</h2>
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/50">
                <th className="text-left p-3 font-heading tracking-wider text-xs text-muted-foreground">#</th>
                <th className="text-left p-3 font-heading tracking-wider text-xs text-muted-foreground">MERON</th>
                <th className="text-left p-3 font-heading tracking-wider text-xs text-muted-foreground">WALA</th>
                <th className="text-left p-3 font-heading tracking-wider text-xs text-muted-foreground">STATUS</th>
                <th className="text-left p-3 font-heading tracking-wider text-xs text-muted-foreground">WINNER</th>
                <th className="text-right p-3 font-heading tracking-wider text-xs text-muted-foreground">TOTAL BETS</th>
              </tr>
            </thead>
            <tbody>
              {fights.slice(0, 15).map(fight => (
                <tr key={fight.id} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                  <td className="p-3 font-heading font-bold text-primary">{fight.fight_number}</td>
                  <td className="p-3 text-red-400 font-medium">{fight.meron_name}</td>
                  <td className="p-3 text-blue-400 font-medium">{fight.wala_name}</td>
                  <td className="p-3"><FightStatusBadge status={fight.status} /></td>
                  <td className="p-3">
                    {fight.winner && (
                      <span className={fight.winner === 'meron' ? 'text-red-400 font-bold' : fight.winner === 'wala' ? 'text-blue-400 font-bold' : 'text-green-400 font-bold'}>
                        {fight.winner.toUpperCase()}
                      </span>
                    )}
                  </td>
                  <td className="p-3 text-right font-heading">₱{((fight.total_meron_bets || 0) + (fight.total_wala_bets || 0)).toLocaleString()}</td>
                </tr>
              ))}
              {fights.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-muted-foreground">No fights yet. Create your first fight.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}