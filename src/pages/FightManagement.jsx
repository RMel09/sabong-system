import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Plus, Play, AlertTriangle, Lock, Swords, Trophy, XCircle, Timer } from 'lucide-react';
import FightStatusBadge from '../components/dashboard/FightStatusBadge';
import CreateFightDialog from '../components/fights/CreateFightDialog';
import { format } from 'date-fns';
import { toast } from 'sonner';
import {
  AlertDialog, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useSystemConfig } from '@/lib/useSystemConfig';

const statusFlow = {
  upcoming: { next: 'open', label: 'OPEN BETTING', icon: Play, color: 'bg-green-600 hover:bg-green-700' },
  open: { next: 'last_call', label: 'LAST CALL', icon: AlertTriangle, color: 'bg-yellow-600 hover:bg-yellow-700' },
  last_call: { next: 'closed', label: 'CLOSE BETS', icon: Lock, color: 'bg-orange-600 hover:bg-orange-700' },
  closed: { next: 'fight', label: 'START FIGHT', icon: Swords, color: 'bg-red-600 hover:bg-red-700' },
};

export default function FightManagement() {
  const [createOpen, setCreateOpen] = useState(false);
  const [declareWinner, setDeclareWinner] = useState(null);
  const [declaring, setDeclaring] = useState(false);
  const queryClient = useQueryClient();
  const { getConfig } = useSystemConfig();

  const { data: fights = [] } = useQuery({
    queryKey: ['fights'],
    queryFn: () => base44.entities.Fight.list('-created_date', 100),
    refetchInterval: 3000,
  });

  const todayFights = fights.filter(f => f.event_date === format(new Date(), 'yyyy-MM-dd'));
  const nextFightNumber = todayFights.length > 0 ? Math.max(...todayFights.map(f => f.fight_number)) + 1 : 1;

  const advanceStatus = async (fight) => {
    const flow = statusFlow[fight.status];
    if (!flow) return;
    await base44.entities.Fight.update(fight.id, { status: flow.next });
    queryClient.invalidateQueries({ queryKey: ['fights'] });
  };

  const handleDeclareWinner = async (winner) => {
    if (!declareWinner || declaring) return;
    setDeclaring(true);

    const commissionRate = Number(getConfig('commission_rate', '10'));
    const bayongIncrement = Number(getConfig('bayong_increment', '100'));
    const bayongConsec = Number(getConfig('bayong_consecutive_wins', '10'));

    const totalMeron = declareWinner.total_meron_bets || 0;
    const totalWala = declareWinner.total_wala_bets || 0;
    const totalDraw = declareWinner.total_draw_bets || 0;
    const totalPool = totalMeron + totalWala + totalDraw;
    const houseCut = winner !== 'cancelled' ? totalPool * (commissionRate / 100) : 0;
    const payoutPool = totalPool - houseCut;

    // Streak tracking
    const prevMeronStreak = declareWinner.meron_streak || 0;
    const prevWalaStreak = declareWinner.wala_streak || 0;
    const newMeronStreak = winner === 'meron' ? prevMeronStreak + 1 : 0;
    const newWalaStreak = winner === 'wala' ? prevWalaStreak + 1 : 0;

    // Bayong jackpot logic
    const currentBayong = (declareWinner.bayong_jackpot || 0) + bayongIncrement;
    const bayongTriggered = (newMeronStreak >= bayongConsec || newWalaStreak >= bayongConsec) && winner !== 'draw' && winner !== 'cancelled';

    // Settle bets
    const bets = await base44.entities.Bet.filter({ fight_id: declareWinner.id });
    let totalPayout = 0;
    const updatedBets = [];

    // Auto-calculate dynamic odds from bet pools
    const losingPool = winner === 'meron' ? totalWala : winner === 'wala' ? totalMeron : 0;
    const winningPool = winner === 'meron' ? totalMeron : winner === 'wala' ? totalWala : 0;
    const dynamicOdds = winningPool > 0 ? ((losingPool * (1 - commissionRate / 100)) / winningPool) + 1 : 1;
    const drawOddsFixed = Number(getConfig('odds_draw', '8'));

    for (const bet of bets) {
      let payout = 0;
      let newStatus = 'lost';

      if (winner === 'cancelled') {
        newStatus = 'cancelled';
        payout = bet.amount;
      } else if (winner === 'draw' && bet.side === 'draw') {
        payout = Math.round(bet.amount * drawOddsFixed);
        newStatus = 'won';
      } else if (winner === 'draw' && bet.side !== 'draw') {
        newStatus = 'draw';
        payout = bet.amount; // refund
      } else if (bet.side === winner) {
        // Pool-based: proportional share of payout pool
        payout = winningPool > 0 ? Math.round((bet.amount / winningPool) * payoutPool) : bet.amount;
        // Bayong bonus
        if (bayongTriggered && payout > 0) {
          const winnerBets = bets.filter(b => b.side === winner);
          const totalWinnerAmount = winnerBets.reduce((s, b) => s + (b.amount || 0), 0);
          payout += totalWinnerAmount > 0 ? Math.round((bet.amount / totalWinnerAmount) * currentBayong) : 0;
        }
        newStatus = 'won';
      }

      totalPayout += payout;
      updatedBets.push({ id: bet.id, status: newStatus, payout });
    }

    for (const b of updatedBets) {
      await base44.entities.Bet.update(b.id, { status: b.status, payout: b.payout });
    }

    // Update fight record
    await base44.entities.Fight.update(declareWinner.id, {
      status: 'finished',
      winner,
      meron_streak: newMeronStreak,
      wala_streak: newWalaStreak,
      bayong_jackpot: bayongTriggered ? bayongIncrement : currentBayong,
      bayong_triggered: bayongTriggered,
      archived: true,
    });

    // Create archive record
    const betsSnapshot = JSON.stringify(updatedBets.map((b, i) => ({ ...bets[i], ...b })));
    await base44.entities.FightArchive.create({
      fight_id: declareWinner.id,
      fight_number: declareWinner.fight_number,
      event_date: declareWinner.event_date,
      meron_name: declareWinner.meron_name,
      wala_name: declareWinner.wala_name,
      meron_weight: declareWinner.meron_weight,
      wala_weight: declareWinner.wala_weight,
      winner,
      total_meron_bets: totalMeron,
      total_wala_bets: totalWala,
      total_draw_bets: totalDraw,
      total_pool: totalPool,
      total_payout: totalPayout,
      house_cut: houseCut,
      commission_rate: commissionRate,
      bayong_jackpot: currentBayong,
      bayong_triggered: bayongTriggered,
      meron_streak: newMeronStreak,
      wala_streak: newWalaStreak,
      bet_count: bets.length,
      odds_meron: declareWinner.odds_meron || 1,
      odds_wala: declareWinner.odds_wala || 1,
      odds_draw: declareWinner.odds_draw || 8,
      tickets_snapshot: betsSnapshot,
    });

    if (bayongTriggered) toast.success(`🎉 BAYONG JACKPOT TRIGGERED! ₱${currentBayong.toLocaleString()} distributed!`);

    queryClient.invalidateQueries({ queryKey: ['fights'] });
    queryClient.invalidateQueries({ queryKey: ['bets'] });
    queryClient.invalidateQueries({ queryKey: ['bets-all'] });
    queryClient.invalidateQueries({ queryKey: ['archives'] });
    setDeclaring(false);
    setDeclareWinner(null);
    toast.success(`Fight #${declareWinner.fight_number} settled. Winner: ${winner.toUpperCase()}`);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-heading text-3xl font-bold tracking-wide">FIGHT MANAGEMENT</h1>
          <p className="text-sm text-muted-foreground font-body mt-1">{format(new Date(), 'MMMM d, yyyy')} — {todayFights.length} fights</p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="font-heading tracking-wider">
          <Plus className="w-4 h-4 mr-2" /> NEW FIGHT
        </Button>
      </div>

      <div className="space-y-4">
        {todayFights.map(fight => {
          const flow = statusFlow[fight.status];
          const isFighting = fight.status === 'fight';

          return (
            <Card key={fight.id} className="p-5 bg-card border-border">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                    <span className="font-heading text-xl font-bold text-primary">{fight.fight_number}</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-3">
                      <span className="text-red-400 font-heading font-bold">{fight.meron_name}</span>
                      <span className="text-muted-foreground text-xs">VS</span>
                      <span className="text-blue-400 font-heading font-bold">{fight.wala_name}</span>
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                      <span className="text-red-400/70">M: ₱{(fight.total_meron_bets || 0).toLocaleString()}</span>
                      <span className="text-blue-400/70">W: ₱{(fight.total_wala_bets || 0).toLocaleString()}</span>
                      <span className="text-green-400/70">D: ₱{(fight.total_draw_bets || 0).toLocaleString()}</span>
                      {(fight.meron_streak > 0 || fight.wala_streak > 0) && (
                        <span className="text-yellow-400">
                          🔴×{fight.meron_streak} 🔵×{fight.wala_streak}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 flex-wrap">
                  <FightStatusBadge status={fight.status} />
                  {fight.winner && (
                    <span className={`font-heading font-bold text-sm ${fight.winner === 'meron' ? 'text-red-400' : fight.winner === 'wala' ? 'text-blue-400' : 'text-green-400'}`}>
                      ✓ {fight.winner.toUpperCase()}
                    </span>
                  )}
                  {fight.bayong_triggered && <span className="text-yellow-400 text-xs font-heading">🎰 BAYONG!</span>}
                  {flow && (
                    <Button size="sm" className={`font-heading tracking-wider text-xs text-white ${flow.color}`} onClick={() => advanceStatus(fight)}>
                      <flow.icon className="w-3.5 h-3.5 mr-1.5" /> {flow.label}
                    </Button>
                  )}
                  {isFighting && (
                    <Button size="sm" className="font-heading tracking-wider text-xs bg-primary text-primary-foreground" onClick={() => setDeclareWinner(fight)}>
                      <Trophy className="w-3.5 h-3.5 mr-1.5" /> DECLARE WINNER
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
        {todayFights.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <Swords className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p className="font-heading text-lg">NO FIGHTS TODAY</p>
          </div>
        )}
      </div>

      <CreateFightDialog open={createOpen} onOpenChange={setCreateOpen} nextFightNumber={nextFightNumber} />

      <AlertDialog open={!!declareWinner} onOpenChange={() => !declaring && setDeclareWinner(null)}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-heading text-xl tracking-wide">DECLARE WINNER — FIGHT #{declareWinner?.fight_number}</AlertDialogTitle>
            <AlertDialogDescription>
              Select the winner. House cuts {getConfig('commission_rate', '10')}%.
              {(declareWinner?.meron_streak > 0 || declareWinner?.wala_streak > 0) && (
                <span className="block mt-1 text-yellow-400">
                  Current streaks: 🔴 Meron ×{declareWinner?.meron_streak || 0} | 🔵 Wala ×{declareWinner?.wala_streak || 0} | Bayong: ₱{((declareWinner?.bayong_jackpot || 0) + Number(getConfig('bayong_increment', '100'))).toLocaleString()}
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="grid grid-cols-3 gap-3 my-4">
            <Button disabled={declaring} className="h-16 bg-red-600 hover:bg-red-700 font-heading text-lg tracking-wider text-white" onClick={() => handleDeclareWinner('meron')}>MERON</Button>
            <Button disabled={declaring} className="h-16 bg-blue-600 hover:bg-blue-700 font-heading text-lg tracking-wider text-white" onClick={() => handleDeclareWinner('wala')}>WALA</Button>
            <Button disabled={declaring} className="h-16 bg-green-600 hover:bg-green-700 font-heading text-lg tracking-wider text-white" onClick={() => handleDeclareWinner('draw')}>DRAW</Button>
          </div>
          <Button disabled={declaring} variant="outline" className="w-full font-heading tracking-wider text-destructive" onClick={() => handleDeclareWinner('cancelled')}>
            <XCircle className="w-4 h-4 mr-2" /> CANCEL FIGHT (REFUND ALL)
          </Button>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={declaring} className="font-heading tracking-wider">GO BACK</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}