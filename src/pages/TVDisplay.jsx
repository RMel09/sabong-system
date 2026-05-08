import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';

function useClockTick() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return now;
}

// Color scheme: meron=red, wala=blue, draw=yellow, cancelled=white, liamado=orange, dehado=purple
const RESULT_COLORS = {
  meron:     { bg: '#dc2626', border: '#ef4444', text: 'M', label: 'MERON' },
  wala:      { bg: '#2563eb', border: '#3b82f6', text: 'W', label: 'WALA' },
  draw:      { bg: '#ca8a04', border: '#eab308', text: 'D', label: 'DRAW' },
  cancelled: { bg: '#e5e7eb', border: '#9ca3af', text: 'C', label: 'CANCELLED', dark: true },
  liamado:   { bg: '#ea580c', border: '#f97316', text: 'L', label: 'LIAMADO' },
  dehado:    { bg: '#7c3aed', border: '#8b5cf6', text: 'H', label: 'DEHADO' },
};

const getLegendBoxes = () => Object.entries(RESULT_COLORS).map(([key, c]) => (
  <div
    key={key}
    className="flex items-center gap-2 px-3 py-2 rounded-lg border-2"
    style={{ background: c.bg + '33', borderColor: c.border }}
  >
    <div className="w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs text-white" style={{ background: c.bg }}>
      {c.text}
    </div>
    <span className="font-heading text-xs tracking-wider" style={{ color: c.dark ? '#9ca3af' : c.border }}>{c.label}</span>
  </div>
));

function getResultColor(winner) {
  return RESULT_COLORS[winner] || RESULT_COLORS['cancelled'];
}

export default function TVDisplay() {
  const [tab, setTab] = useState('live');
  const now = useClockTick();

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

  const totalBets = activeFight ? (activeFight.total_meron_bets || 0) + (activeFight.total_wala_bets || 0) + (activeFight.total_draw_bets || 0) : 0;
  const meronPct = totalBets > 0 ? ((activeFight?.total_meron_bets || 0) / totalBets) * 100 : 33;
  const walaPct = totalBets > 0 ? ((activeFight?.total_wala_bets || 0) / totalBets) * 100 : 33;
  const drawPct = totalBets > 0 ? ((activeFight?.total_draw_bets || 0) / totalBets) * 100 : 34;

  const commissionRate = Number(getCfg('commission_rate', '10'));
  const oddsD = Number(getCfg('odds_draw', '8'));
  const totalMeron = activeFight?.total_meron_bets || 0;
  const totalWala = activeFight?.total_wala_bets || 0;
  const liveMultiplier = (1 - commissionRate / 100);
  const oddsM = totalMeron > 0 && totalWala > 0
    ? Math.round(((totalWala * liveMultiplier) / totalMeron + 1) * 100) / 100
    : 1;
  const oddsW = totalMeron > 0 && totalWala > 0
    ? Math.round(((totalMeron * liveMultiplier) / totalWala + 1) * 100) / 100
    : 1;

  // Build streak data
  const buildStreaks = (fights) => {
    const res = [];
    let streak = 0, side = null;
    fights.forEach(f => {
      if (f.winner !== side) { streak = 1; side = f.winner; }
      else streak++;
      res.push({ fight: f, streak, side });
    });
    return res;
  };
  const streakData = buildStreaks(finishedFights);

  const statusDisplay = {
    open: { text: 'BETS OPEN', color: 'text-green-400', pulse: false },
    last_call: { text: 'LAST CALL!', color: 'text-yellow-400', pulse: true },
    closed: { text: 'BETS CLOSED', color: 'text-orange-400', pulse: false },
    fight: { text: 'FIGHT!', color: 'text-red-400', pulse: true },
  };
  const sd = statusDisplay[activeFight?.status] || {};

  return (
    <div className="min-h-screen bg-[#050810] font-heading text-white overflow-hidden select-none">
      {/* Header */}
      <div className="bg-[#0a0e1a] border-b-2 border-yellow-500/30 px-8 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-3xl font-bold text-yellow-400 tracking-[0.3em]">⚔ SABONG ARENA</h1>
          <div className="flex gap-2 ml-6">
            {['live', 'history'].map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-4 py-1 rounded font-heading text-xs tracking-widest transition-all ${tab === t ? 'bg-yellow-500 text-black' : 'text-yellow-500/50 hover:text-yellow-400'}`}
              >
                {t.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-6">
          <span className="text-base text-gray-400">{format(now, 'MMMM d, yyyy')}</span>
          <div className="text-2xl font-bold text-yellow-400 tabular-nums">{format(now, 'HH:mm:ss')}</div>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {tab === 'live' ? (
          <motion.div key="live" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {activeFight ? (
              <div className="p-8">
                {/* Status */}
                <div className="text-center mb-6">
                  <motion.div
                    key={activeFight.status}
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className={`inline-block px-10 py-2 rounded-full border ${sd.pulse ? 'animate-pulse' : ''}`}
                    style={{ borderColor: 'rgba(234,179,8,0.3)', background: 'rgba(234,179,8,0.05)' }}
                  >
                    <span className={`text-4xl font-bold tracking-[0.2em] ${sd.color}`}>{sd.text}</span>
                  </motion.div>
                  <p className="text-7xl font-bold text-yellow-400 mt-3 tracking-wider">FIGHT #{activeFight.fight_number}</p>
                  <p className="text-gray-500 text-sm mt-1">Bayong Jackpot: <span className="text-yellow-400 font-bold">₱{(activeFight.bayong_jackpot || 0).toLocaleString()}</span></p>
                </div>

                {/* Main 3-side layout */}
                <div className="grid grid-cols-[1fr_120px_1fr_120px_1fr] gap-4 items-center mb-8">
                  <motion.div
                    className="rounded-2xl p-6 text-center border-2"
                    style={{ background: 'rgba(239,68,68,0.08)', borderColor: 'rgba(239,68,68,0.3)' }}
                    animate={{ borderColor: activeFight.status === 'fight' ? ['rgba(239,68,68,0.3)','rgba(239,68,68,0.9)','rgba(239,68,68,0.3)'] : 'rgba(239,68,68,0.3)' }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  >
                    <p className="text-red-500 text-xl tracking-[0.3em] mb-1">MERON</p>
                    <p className="text-3xl font-bold text-red-200 truncate">{activeFight.meron_name}</p>
                    <div className="mt-4 pt-4 border-t border-red-500/20">
                      <p className="text-red-400/60 text-xs tracking-wider">TOTAL BETS</p>
                      <p className="text-4xl font-bold text-red-400">₱{(activeFight.total_meron_bets || 0).toLocaleString()}</p>
                      <p className="text-sm text-red-400/60 mt-1">ODDS: {oddsM}x</p>
                    </div>
                  </motion.div>

                  <div className="text-center">
                    <div className="w-20 h-20 rounded-full bg-yellow-500/10 border-2 border-yellow-500/30 flex items-center justify-center mx-auto">
                      <span className="text-xl font-bold text-yellow-400">VS</span>
                    </div>
                  </div>

                  <div className="rounded-2xl p-6 text-center border-2" style={{ background: 'rgba(34,197,94,0.08)', borderColor: 'rgba(34,197,94,0.3)' }}>
                    <p className="text-green-500 text-xl tracking-[0.3em] mb-1">DRAW</p>
                    <p className="text-3xl font-bold text-green-200">―</p>
                    <div className="mt-4 pt-4 border-t border-green-500/20">
                      <p className="text-green-400/60 text-xs tracking-wider">TOTAL BETS</p>
                      <p className="text-4xl font-bold text-green-400">₱{(activeFight.total_draw_bets || 0).toLocaleString()}</p>
                      <p className="text-sm text-green-400/60 mt-1">ODDS: {oddsD}x</p>
                    </div>
                  </div>

                  <div className="text-center">
                    <div className="w-20 h-20 rounded-full bg-yellow-500/10 border-2 border-yellow-500/30 flex items-center justify-center mx-auto">
                      <span className="text-xl font-bold text-yellow-400">VS</span>
                    </div>
                  </div>

                  <motion.div
                    className="rounded-2xl p-6 text-center border-2"
                    style={{ background: 'rgba(59,130,246,0.08)', borderColor: 'rgba(59,130,246,0.3)' }}
                    animate={{ borderColor: activeFight.status === 'fight' ? ['rgba(59,130,246,0.3)','rgba(59,130,246,0.9)','rgba(59,130,246,0.3)'] : 'rgba(59,130,246,0.3)' }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  >
                    <p className="text-blue-500 text-xl tracking-[0.3em] mb-1">WALA</p>
                    <p className="text-3xl font-bold text-blue-200 truncate">{activeFight.wala_name}</p>
                    <div className="mt-4 pt-4 border-t border-blue-500/20">
                      <p className="text-blue-400/60 text-xs tracking-wider">TOTAL BETS</p>
                      <p className="text-4xl font-bold text-blue-400">₱{(activeFight.total_wala_bets || 0).toLocaleString()}</p>
                      <p className="text-sm text-blue-400/60 mt-1">ODDS: {oddsW}x</p>
                    </div>
                  </motion.div>
                </div>

                {/* Pool bar */}
                <div className="max-w-5xl mx-auto">
                  <div className="flex justify-between text-xs text-gray-400 mb-1">
                    <span>MERON {meronPct.toFixed(0)}%</span>
                    <span className="text-yellow-400 font-bold">TOTAL POOL: ₱{totalBets.toLocaleString()}</span>
                    <span>WALA {walaPct.toFixed(0)}%</span>
                  </div>
                  <div className="h-6 bg-gray-800 rounded-full overflow-hidden flex">
                    <motion.div className="bg-gradient-to-r from-red-700 to-red-500 flex items-center justify-center" animate={{ width: `${meronPct}%` }} transition={{ duration: 0.8 }}>
                      {meronPct > 8 && <span className="text-xs font-bold text-white">{meronPct.toFixed(0)}%</span>}
                    </motion.div>
                    <motion.div className="bg-gradient-to-r from-green-600 to-green-500 flex items-center justify-center" animate={{ width: `${drawPct}%` }} transition={{ duration: 0.8 }}>
                      {drawPct > 5 && <span className="text-xs font-bold text-white">D</span>}
                    </motion.div>
                    <motion.div className="bg-gradient-to-r from-blue-500 to-blue-700 flex items-center justify-center" animate={{ width: `${walaPct}%` }} transition={{ duration: 0.8 }}>
                      {walaPct > 8 && <span className="text-xs font-bold text-white">{walaPct.toFixed(0)}%</span>}
                    </motion.div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-[70vh]">
                <div className="text-center">
                  <p className="text-6xl font-bold text-yellow-400 tracking-[0.3em]">⚔ SABONG ARENA</p>
                  <p className="text-2xl text-gray-500 mt-4 tracking-wider animate-pulse">WAITING FOR NEXT FIGHT...</p>
                </div>
              </div>
            )}

            {/* Results ticker */}
            {finishedFights.length > 0 && (
              <div className="fixed bottom-0 left-0 right-0 bg-black/80 border-t border-yellow-500/20 px-8 py-2 flex items-center gap-4 overflow-x-auto">
                <span className="text-xs text-gray-500 tracking-wider whitespace-nowrap">TODAY:</span>
                {finishedFights.map(f => {
                  const rc = getResultColor(f.winner);
                  return (
                    <div key={f.id} className="flex items-center gap-1.5 whitespace-nowrap">
                      <span className="text-yellow-400 font-bold text-sm">#{f.fight_number}</span>
                      <span className="text-sm font-bold" style={{ color: rc.border }}>{f.winner?.toUpperCase()}</span>
                      {f.bayong_triggered && <span className="text-yellow-300 text-xs">🎰</span>}
                      <span className="text-gray-700">|</span>
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>
        ) : (
          /* HISTORY TAB */
          <motion.div key="history" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-6">
            <div className="flex gap-6">
              {/* LEFT — Legend + Bilog */}
              <div className="flex flex-col gap-4 min-w-[180px]">
                {/* 6 Legend Boxes */}
                <div className="flex flex-col gap-2">
                  {getLegendBoxes()}
                </div>
              </div>

              {/* RIGHT — Bilog + Square stacked */}
              <div className="flex-1 space-y-8">
                {/* BILOG — Streak circles (no label) */}
                <div className="flex flex-wrap gap-2">
                  {streakData.map(({ fight: f, streak, side }, i) => {
                    const rc = getResultColor(side);
                    const isStart = i === 0 || streakData[i - 1].side !== side;
                    return (
                      <div key={f.id} className="relative flex flex-col items-center">
                        <div
                          className={`w-14 h-14 rounded-full border-2 flex items-center justify-center font-heading font-bold text-white text-lg ${isStart ? 'ring-2 ring-yellow-400 ring-offset-2 ring-offset-black' : ''}`}
                          style={{ background: rc.bg, borderColor: rc.border, color: rc.dark ? '#111' : '#fff' }}
                        >
                          {rc.text}
                        </div>
                        <span className="text-[10px] text-gray-500 mt-1">#{f.fight_number}</span>
                        {isStart && streak > 1 && (
                          <span className="absolute -top-1 -right-1 w-5 h-5 bg-yellow-500 rounded-full text-black text-[10px] font-bold flex items-center justify-center">{streak}</span>
                        )}
                      </div>
                    );
                  })}
                  {finishedFights.length === 0 && <p className="text-gray-600 text-sm">No results yet</p>}
                </div>

                {/* SQUARE — Per fight result grid (no label) */}
                <div className="grid grid-cols-6 md:grid-cols-10 lg:grid-cols-14 gap-2">
                  {finishedFights.map(f => {
                    const rc = getResultColor(f.winner);
                    return (
                      <div
                        key={f.id}
                        className="rounded-lg p-2 text-center border-2"
                        style={{ background: rc.bg + '33', borderColor: rc.border }}
                      >
                        <p className="text-yellow-400 font-bold text-xs">#{f.fight_number}</p>
                        <p className="font-heading font-bold text-sm mt-0.5" style={{ color: rc.dark ? '#9ca3af' : rc.border }}>
                          {rc.text}
                        </p>
                        {f.bayong_triggered && <p className="text-yellow-400 text-[10px]">🎰</p>}
                      </div>
                    );
                  })}
                  {finishedFights.length === 0 && (
                    <div className="col-span-14 text-center py-12 text-gray-600">No fights finished yet today</div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}