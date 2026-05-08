import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';

export default function TVDisplay() {
  const { data: fights = [] } = useQuery({
    queryKey: ['fights-display'],
    queryFn: () => base44.entities.Fight.list('-created_date', 100),
    refetchInterval: 2000,
  });

  const { data: configs = [] } = useQuery({
    queryKey: ['system-config'],
    queryFn: () => base44.entities.SystemConfig.list(),
    refetchInterval: 5000,
  });
  const getCfg = (key, def) => (configs.find(c => c.key === key)?.value ?? def);

  const today = format(new Date(), 'yyyy-MM-dd');
  const todayFights = fights.filter(f => f.event_date === today);
  const activeFight = fights.find(f => ['open', 'last_call', 'closed', 'fight'].includes(f.status));
  const finishedFights = todayFights.filter(f => f.status === 'finished').sort((a, b) => a.fight_number - b.fight_number);

  const commissionRate = Number(getCfg('commission_rate', '10'));
  const oddsD = Number(getCfg('odds_draw', '8'));
  const totalMeron = activeFight?.total_meron_bets || 0;
  const totalWala = activeFight?.total_wala_bets || 0;
  const totalDraw = activeFight?.total_draw_bets || 0;
  const liveMultiplier = 1 - commissionRate / 100;
  const oddsM = totalMeron > 0 && totalWala > 0
    ? Math.round(((totalWala * liveMultiplier) / totalMeron + 1) * 100) / 100
    : 1;
  const oddsW = totalMeron > 0 && totalWala > 0
    ? Math.round(((totalMeron * liveMultiplier) / totalWala + 1) * 100) / 100
    : 1;

  const bayongJackpot = activeFight?.bayong_jackpot || 100;

  const meronWins = finishedFights.filter(f => f.winner === 'meron').length;
  const walaWins = finishedFights.filter(f => f.winner === 'wala').length;
  const drawCount = finishedFights.filter(f => f.winner === 'draw').length;
  const cancelledCount = finishedFights.filter(f => f.winner === 'cancelled').length;
  const liamadoCount = finishedFights.filter(f => {
    if (f.winner === 'meron') return (f.total_meron_bets || 0) >= (f.total_wala_bets || 0);
    if (f.winner === 'wala') return (f.total_wala_bets || 0) >= (f.total_meron_bets || 0);
    return false;
  }).length;
  const dehadoCount = finishedFights.filter(f => {
    if (f.winner === 'meron') return (f.total_meron_bets || 0) < (f.total_wala_bets || 0);
    if (f.winner === 'wala') return (f.total_wala_bets || 0) < (f.total_meron_bets || 0);
    return false;
  }).length;

  const beadRoad = [];
  let col = [];
  let prevSide = null;
  finishedFights.forEach(f => {
    const side = f.winner || 'cancelled';
    if (prevSide !== null && side !== prevSide) {
      beadRoad.push([...col]);
      col = [];
    }
    let letter = 'C';
    let circleColor = '#9ca3af';
    if (side === 'meron') {
      circleColor = '#dc2626';
      letter = (f.total_meron_bets || 0) >= (f.total_wala_bets || 0) ? 'L' : 'D';
    } else if (side === 'wala') {
      circleColor = '#2563eb';
      letter = (f.total_wala_bets || 0) >= (f.total_meron_bets || 0) ? 'L' : 'D';
    } else if (side === 'draw') {
      circleColor = '#ca8a04';
      letter = 'D';
    }
    col.push({ fight: f, letter, circleColor });
    prevSide = side;
  });
  if (col.length > 0) beadRoad.push(col);

  const gridFights = finishedFights.slice(-15);

  const statusLabel =
    activeFight?.status === 'open' ? 'OPEN' :
    activeFight?.status === 'last_call' ? 'LAST CALL' :
    activeFight?.status === 'closed' ? 'CLOSED' :
    activeFight?.status === 'fight' ? 'FIGHT!' : 'WAITING';

  const lockLabel =
    activeFight?.status === 'open' ? 'BOTH SIDE UNLOCKED' :
    activeFight?.status === 'last_call' ? 'LAST CALL - PLACE YOUR BETS' :
    activeFight?.status === 'closed' ? 'BOTH SIDE LOCKED' :
    activeFight?.status === 'fight' ? 'FIGHT IN PROGRESS' :
    'WAITING FOR NEXT FIGHT';

  const statusPulse = activeFight?.status === 'last_call' || activeFight?.status === 'fight';
  const statusBarBg =
    activeFight?.status === 'closed' || activeFight?.status === 'fight' ? '#dc2626' :
    activeFight?.status === 'last_call' ? '#ca8a04' : '#16a34a';

  return (
    <div
      className="h-screen w-screen bg-black flex flex-col overflow-hidden select-none"
      style={{ fontFamily: "'Arial Black', Arial, sans-serif" }}
    >
      <div className="flex" style={{ flex: '0 0 55%' }}>
        <div
          className="flex-1 flex flex-col items-center justify-center"
          style={{ background: 'linear-gradient(180deg, #cc0000 0%, #880000 100%)' }}
        >
          <p className="text-white text-5xl font-bold tracking-widest">MERON</p>
          <p
            className="text-8xl font-bold mt-2"
            style={{ color: '#FFD700', textShadow: '2px 3px 6px rgba(0,0,0,0.6)' }}
          >
            {totalMeron.toLocaleString()}
          </p>
          <p className="text-white text-4xl mt-3">x{oddsM}</p>
          <p className="text-white text-2xl font-bold mt-2">BAYONG: {bayongJackpot}</p>
        </div>

        <div
          className="flex flex-col items-center justify-center"
          style={{ width: '240px', background: '#111' }}
        >
          <p className="text-white text-3xl font-bold">FIGHT</p>
          <p className="text-6xl font-bold" style={{ color: '#FFD700' }}>
            {activeFight?.fight_number ?? '\u2014'}
          </p>
          <div className="mt-5 text-center">
            <p className="text-xl font-bold" style={{ color: '#22c55e' }}>BAYONG</p>
            <div className="mt-1 px-5 py-1" style={{ border: '3px solid #22c55e' }}>
              <p className="text-3xl font-bold" style={{ color: '#FFD700' }}>
                {bayongJackpot.toLocaleString()}
              </p>
            </div>
          </div>
          <div className="mt-5 text-center">
            <p className="text-xl font-bold" style={{ color: '#FFD700' }}>DRAW X{oddsD}</p>
            <p className="text-4xl font-bold mt-1" style={{ color: '#FFD700' }}>
              {totalDraw.toLocaleString()}
            </p>
          </div>
        </div>

        <div
          className="flex-1 flex flex-col items-center justify-center"
          style={{ background: 'linear-gradient(180deg, #0044cc 0%, #001a66 100%)' }}
        >
          <p className="text-white text-5xl font-bold tracking-widest">WALA</p>
          <p
            className="text-8xl font-bold mt-2"
            style={{ color: '#FFD700', textShadow: '2px 3px 6px rgba(0,0,0,0.6)' }}
          >
            {totalWala.toLocaleString()}
          </p>
          <p className="text-white text-4xl mt-3">x{oddsW}</p>
          <p className="text-white text-2xl font-bold mt-2">BAYONG: {bayongJackpot}</p>
        </div>
      </div>

      <div className="flex" style={{ flex: '0 0 7%' }}>
        <div
          className={`flex items-center px-8 ${statusPulse ? 'animate-pulse' : ''}`}
          style={{ background: statusBarBg, minWidth: '42%' }}
        >
          <p className="text-white text-3xl font-bold tracking-wider">
            FIGHT STATUS: {statusLabel}
          </p>
        </div>
        <div className="flex-1 flex items-center px-8 bg-black border-t-2 border-b-2 border-gray-700">
          <p className="text-white text-2xl font-bold tracking-wider">{lockLabel}</p>
        </div>
      </div>

      <div className="flex" style={{ flex: '1 1 38%', background: '#f5f5f5' }}>
        <div className="flex flex-col justify-center px-3 py-2" style={{ width: '210px' }}>
          <div className="grid grid-cols-2 gap-1">
            <div className="text-white text-center py-3" style={{ background: '#dc2626' }}>
              <p className="text-4xl font-bold">{meronWins}</p>
            </div>
            <div className="text-white text-center py-3" style={{ background: '#2563eb' }}>
              <p className="text-4xl font-bold">{walaWins}</p>
            </div>
            <p className="text-center text-xs font-bold text-black">MERON</p>
            <p className="text-center text-xs font-bold text-black">WALA</p>

            <div className="text-black text-center py-3" style={{ background: '#facc15' }}>
              <p className="text-4xl font-bold">{drawCount}</p>
            </div>
            <div className="text-black text-center py-3 border border-gray-400" style={{ background: '#fff' }}>
              <p className="text-4xl font-bold">{cancelledCount}</p>
            </div>
            <p className="text-center text-xs font-bold text-black">DRAW</p>
            <p className="text-center text-xs font-bold text-black">CANCELLED</p>

            <div className="text-white text-center py-3" style={{ background: '#ea580c' }}>
              <p className="text-4xl font-bold">{liamadoCount}</p>
            </div>
            <div className="text-white text-center py-3" style={{ background: '#d946ef' }}>
              <p className="text-4xl font-bold">{dehadoCount}</p>
            </div>
            <p className="text-center text-xs font-bold text-black">LIAMADO</p>
            <p className="text-center text-xs font-bold text-black">DEHADO</p>
          </div>
        </div>

        <div className="flex-1 py-3 px-3 overflow-hidden">
          <div className="flex gap-1 h-full items-start overflow-x-auto">
            {beadRoad.map((column, ci) => (
              <div key={ci} className="flex flex-col gap-1">
                {column.map((item, ri) => (
                  <div
                    key={ri}
                    className="rounded-full flex items-center justify-center text-white font-bold"
                    style={{ width: '34px', height: '34px', fontSize: '15px', background: item.circleColor }}
                  >
                    {item.letter}
                  </div>
                ))}
              </div>
            ))}
            {finishedFights.length === 0 && (
              <p className="text-gray-400 text-sm self-center">No results yet</p>
            )}
          </div>
        </div>

        <div className="flex flex-col justify-center px-3 py-2" style={{ width: '190px' }}>
          {gridFights.length > 0 ? (
            <div
              className="grid gap-px"
              style={{
                gridTemplateRows: 'repeat(5, 1fr)',
                gridAutoFlow: 'column',
                gridTemplateColumns: `repeat(${Math.ceil(gridFights.length / 5)}, 1fr)`,
              }}
            >
              {gridFights.map(f => {
                let bg = '#2563eb';
                let textColor = '#fff';
                if (f.winner === 'meron') bg = '#dc2626';
                else if (f.winner === 'draw') { bg = '#facc15'; textColor = '#000'; }
                else if (f.winner === 'cancelled') { bg = '#e5e7eb'; textColor = '#000'; }
                return (
                  <div
                    key={f.id}
                    className="text-center py-1 font-bold text-base"
                    style={{ background: bg, color: textColor }}
                  >
                    {f.fight_number}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-gray-400 text-sm text-center">No fights yet</p>
          )}
        </div>
      </div>
    </div>
  );
}
