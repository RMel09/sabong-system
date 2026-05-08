import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Trophy, XCircle, Swords } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { useSystemConfig } from '@/lib/useSystemConfig';

export default function Declarator() {
  const [declaring, setDeclaring] = useState(null);
  const [processing, setProcessing] = useState(false);
  const queryClient = useQueryClient();
  const { getConfig } = useSystemConfig();

  const { data: fights = [] } = useQuery({
    queryKey: ['fights'],
    queryFn: () => base44.entities.Fight.list('-created_date', 100),
    refetchInterval: 2000,
  });

  const readyFights = fights.filter(f => f.status === 'fight');

  const declare = async (fight, winner) => {
    if (processing) return;
    setProcessing(true);
    const commissionRate = Number(getConfig('commission_rate', '10'));
    const bayongIncrement = Number(getConfig('bayong_increment', '100'));
    const bayongConsec = Number(getConfig('bayong_consecutive_wins', '10'));

    const totalMeron = fight.total_meron_bets || 0;
    const totalWala = fight.total_wala_bets || 0;
    const totalDraw = fight.total_draw_bets || 0;
    const totalPool = totalMeron + totalWala + totalDraw;
    const houseCut = winner !== 'cancelled' ? totalPool * (commissionRate / 100) : 0;
    const payoutPool = totalPool - houseCut;

    const newMeronStreak = winner === 'meron' ? (fight.meron_streak || 0) + 1 : 0;
    const newWalaStreak = winner === 'wala' ? (fight.wala_streak || 0) + 1 : 0;
    const currentBayong = (fight.bayong_jackpot || 0) + bayongIncrement;
    const bayongTriggered = (newMeronStreak >= bayongConsec || newWalaStreak >= bayongConsec) && !['draw', 'cancelled'].includes(winner);

    const bets = await base44.entities.Bet.filter({ fight_id: fight.id });
    let totalPayout = 0;
    const updatedBets = [];

    for (const bet of bets) {
      let payout = 0, newStatus = 'lost';
      if (winner === 'cancelled') { newStatus = 'cancelled'; payout = bet.amount; }
      else if (winner === 'draw' && bet.side === 'draw') {
        payout = Math.round(bet.amount * Number(getConfig('odds_draw', '8')));
        newStatus = 'won';
      } else if (winner === 'draw') { newStatus = 'draw'; payout = bet.amount; }
      else if (bet.side === winner) {
        const winTotal = winner === 'meron' ? totalMeron : totalWala;
        payout = winTotal > 0 ? Math.round((bet.amount / winTotal) * payoutPool) : bet.amount;
        if (bayongTriggered) {
          const winBets = bets.filter(b => b.side === winner);
          const winAmt = winBets.reduce((s, b) => s + (b.amount || 0), 0);
          payout += winAmt > 0 ? Math.round((bet.amount / winAmt) * currentBayong) : 0;
        }
        newStatus = 'won';
      }
      totalPayout += payout;
      updatedBets.push({ id: bet.id, status: newStatus, payout });
    }

    for (const b of updatedBets) await base44.entities.Bet.update(b.id, { status: b.status, payout: b.payout });

    await base44.entities.Fight.update(fight.id, {
      status: 'finished', winner,
      meron_streak: newMeronStreak, wala_streak: newWalaStreak,
      bayong_jackpot: bayongTriggered ? bayongIncrement : currentBayong,
      bayong_triggered: bayongTriggered, archived: true,
    });

    await base44.entities.FightArchive.create({
      fight_id: fight.id, fight_number: fight.fight_number, event_date: fight.event_date,
      meron_name: fight.meron_name, wala_name: fight.wala_name,
      meron_weight: fight.meron_weight, wala_weight: fight.wala_weight,
      winner, total_meron_bets: totalMeron, total_wala_bets: totalWala, total_draw_bets: totalDraw,
      total_pool: totalPool, total_payout: totalPayout, house_cut: houseCut,
      commission_rate: commissionRate, bayong_jackpot: currentBayong, bayong_triggered: bayongTriggered,
      meron_streak: newMeronStreak, wala_streak: newWalaStreak, bet_count: bets.length,
      tickets_snapshot: JSON.stringify(updatedBets.map((b, i) => ({ ...bets[i], ...b }))),
    });

    if (bayongTriggered) toast.success(`🎰 BAYONG! ₱${currentBayong.toLocaleString()} jackpot!`);
    toast.success(`Fight #${fight.fight_number} — ${winner.toUpperCase()} wins!`);
    queryClient.invalidateQueries({ queryKey: ['fights'] });
    queryClient.invalidateQueries({ queryKey: ['bets'] });
    queryClient.invalidateQueries({ queryKey: ['archives'] });
    setDeclaring(null);
    setProcessing(false);
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mb-8">
        <h1 className="font-heading text-4xl font-bold tracking-wide text-primary">DECLARATOR</h1>
        <p className="text-muted-foreground mt-1">{format(new Date(), 'MMMM d, yyyy')} — Fights awaiting result declaration</p>
      </div>

      {readyFights.length === 0 ? (
        <div className="text-center py-24">
          <Swords className="w-16 h-16 mx-auto mb-4 opacity-20" />
          <p className="font-heading text-2xl text-muted-foreground">NO FIGHTS WAITING FOR DECLARATION</p>
          <p className="text-muted-foreground mt-2">Start a fight in Fight Management first.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {readyFights.map(fight => (
            <Card key={fight.id} className="p-8 bg-card border-2 border-primary/20">
              <div className="flex items-center justify-between mb-6">
                <span className="font-heading text-3xl font-bold text-primary">FIGHT #{fight.fight_number}</span>
                <span className="font-heading text-sm bg-red-500/20 text-red-400 border border-red-500/30 px-4 py-1 rounded-full animate-pulse">FIGHTING</span>
              </div>

              <div className="grid grid-cols-3 gap-4 mb-8">
                <div className="text-center p-6 bg-red-500/10 border border-red-500/30 rounded-xl">
                  <p className="text-red-500 tracking-widest font-heading mb-1">MERON</p>
                  <p className="text-2xl font-bold text-red-300">{fight.meron_name}</p>
                  <p className="text-3xl font-heading font-bold text-red-400 mt-3">₱{(fight.total_meron_bets || 0).toLocaleString()}</p>
                </div>
                <div className="text-center p-6 bg-green-500/10 border border-green-500/30 rounded-xl">
                  <p className="text-green-500 tracking-widest font-heading mb-1">DRAW</p>
                  <p className="text-3xl font-heading font-bold text-green-400 mt-3">₱{(fight.total_draw_bets || 0).toLocaleString()}</p>
                </div>
                <div className="text-center p-6 bg-blue-500/10 border border-blue-500/30 rounded-xl">
                  <p className="text-blue-500 tracking-widest font-heading mb-1">WALA</p>
                  <p className="text-2xl font-bold text-blue-300">{fight.wala_name}</p>
                  <p className="text-3xl font-heading font-bold text-blue-400 mt-3">₱{(fight.total_wala_bets || 0).toLocaleString()}</p>
                </div>
              </div>

              {declaring === fight.id ? (
                <div className="space-y-3">
                  <p className="text-center font-heading text-muted-foreground tracking-wider mb-4">SELECT WINNER TO CONFIRM</p>
                  <div className="grid grid-cols-3 gap-4">
                    <Button disabled={processing} className="h-20 text-2xl font-heading bg-red-600 hover:bg-red-700 text-white" onClick={() => declare(fight, 'meron')}>
                      <Trophy className="w-6 h-6 mr-2" /> MERON
                    </Button>
                    <Button disabled={processing} className="h-20 text-2xl font-heading bg-green-600 hover:bg-green-700 text-white" onClick={() => declare(fight, 'draw')}>DRAW</Button>
                    <Button disabled={processing} className="h-20 text-2xl font-heading bg-blue-600 hover:bg-blue-700 text-white" onClick={() => declare(fight, 'wala')}>
                      <Trophy className="w-6 h-6 mr-2" /> WALA
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Button disabled={processing} variant="outline" className="font-heading text-destructive tracking-wider" onClick={() => declare(fight, 'cancelled')}>
                      <XCircle className="w-4 h-4 mr-2" /> CANCEL / REFUND
                    </Button>
                    <Button variant="outline" className="font-heading tracking-wider" onClick={() => setDeclaring(null)}>GO BACK</Button>
                  </div>
                </div>
              ) : (
                <Button className="w-full h-16 text-xl font-heading tracking-wider bg-primary text-primary-foreground" onClick={() => setDeclaring(fight.id)}>
                  <Trophy className="w-6 h-6 mr-3" /> DECLARE RESULT
                </Button>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}