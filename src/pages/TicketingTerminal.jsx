import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { RotateCcw, QrCode, BarChart2, History, LogOut } from 'lucide-react';
import { toast } from 'sonner';
import { useOperatorSession } from '@/lib/useOperatorSession';
import OperatorLoginGate from '@/components/terminal/OperatorLoginGate';
import PinVerifyModal from '@/components/terminal/PinVerifyModal';
import { logAction } from '@/lib/auditLog';

const AMOUNTS = [20, 50, 100, 200, 500, 1000, 2000, 5000];

// --- Receipt ---
function ReceiptView({ ticket }) {
  if (!ticket) return <div className="flex items-center justify-center h-48 text-muted-foreground text-sm font-heading">NO TICKET YET</div>;
  return (
    <div className="bg-white text-black rounded-xl p-5 text-center shadow-lg border-2 border-dashed border-gray-300">
      <p className="font-heading font-bold text-lg tracking-widest">SABONG ARENA</p>
      <div className="my-2 border-t border-dashed border-gray-300" />
      <p className="font-mono text-[10px] text-gray-400">TICKET</p>
      <p className="font-heading font-bold text-xs">{ticket.ticketNumber}</p>
      <div className="my-2 border-t border-dashed border-gray-300" />
      <p className="font-heading text-2xl font-bold">FIGHT #{ticket.fightNumber}</p>
      <div className={`my-3 py-2 rounded-lg ${ticket.side === 'meron' ? 'bg-red-100' : ticket.side === 'wala' ? 'bg-blue-100' : 'bg-green-100'}`}>
        <p className={`font-heading text-xl font-bold ${ticket.side === 'meron' ? 'text-red-700' : ticket.side === 'wala' ? 'text-blue-700' : 'text-green-700'}`}>
          {ticket.side.toUpperCase()}
        </p>
        <p className="text-xs text-gray-600">{ticket.sideName}</p>
      </div>
      <p className="font-heading text-2xl font-bold">₱{ticket.amount.toLocaleString()}</p>
      <div className="my-2 border-t border-dashed border-gray-300" />
      <p className="text-[10px] text-gray-400">{ticket.time} — {new Date().toLocaleDateString()}</p>
      <p className="text-[10px] text-gray-400 mt-0.5">Odds: {ticket.odds}x — Est: ₱{ticket.estPayout}</p>
      <p className="text-[10px] text-gray-500 mt-0.5">Op: {ticket.operatorName}</p>
    </div>
  );
}

// --- Claim Tab ---
function ClaimPane({ fights, operator, configs }) {
  const [scanValue, setScanValue] = useState('');
  const [result, setResult] = useState(null);
  const [showPinVerify, setShowPinVerify] = useState(false);
  const queryClient = useQueryClient();

  const getCfg = (key, def) => configs.find(c => c.key === key)?.value ?? def;
  const highStakesThreshold = Number(getCfg('high_stakes_threshold', '5000'));

  const lookupTicket = async (ticketNum) => {
    if (!ticketNum) return;
    const results = await base44.entities.Bet.filter({ ticket_number: ticketNum.trim() });
    if (!results?.length) { setResult({ error: 'Ticket not found' }); return; }
    const bet = results[0];
    const fight = fights.find(f => f.id === bet.fight_id);
    setResult({ bet, fight });
  };

  const doClaim = async () => {
    const bet = result?.bet;
    if (!bet) return;
    const now = new Date().toISOString();
    await base44.entities.Bet.update(bet.id, {
      status: 'paid', claimed: true,
      claimed_at: now,
      claimed_by: operator?.username || operator?.name || 'unknown',
    });
    // Add credits back to operator
    if (operator?.id) {
      const newBal = (operator.credit_balance || 0) + (bet.payout || 0);
      await base44.entities.Operator.update(operator.id, {
        credit_balance: newBal,
        total_payouts: (operator.total_payouts || 0) + (bet.payout || 0),
      });
    }
    await logAction({ action: 'PAYOUT_CLAIMED', description: `Ticket ${bet.ticket_number} claimed — ₱${bet.payout}`, operator, fightNumber: bet.fight_number, ticketNumber: bet.ticket_number, amount: bet.payout, severity: bet.payout >= highStakesThreshold ? 'warning' : 'info' });
    queryClient.invalidateQueries({ queryKey: ['bets'] });
    queryClient.invalidateQueries({ queryKey: ['operators'] });
    toast.success(`Payout ₱${bet.payout?.toLocaleString()} claimed!`);
    setResult(null); setScanValue('');
  };

  const handleClaim = () => {
    const payout = result?.bet?.payout || 0;
    if (payout >= highStakesThreshold) {
      setShowPinVerify(true);
    } else {
      doClaim();
    }
  };

  return (
    <div className="space-y-4">
      {showPinVerify && (
        <PinVerifyModal
          operator={operator}
          payout={result?.bet?.payout}
          onConfirm={() => { setShowPinVerify(false); doClaim(); }}
          onCancel={() => setShowPinVerify(false)}
        />
      )}
      <div className="flex gap-2">
        <Input
          value={scanValue}
          onChange={e => setScanValue(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && lookupTicket(scanValue)}
          placeholder="Scan or enter ticket number..."
          className="bg-background font-mono text-lg h-14"
          autoFocus
        />
        <Button onClick={() => lookupTicket(scanValue)} className="h-14 font-heading tracking-wider px-6">LOOKUP</Button>
      </div>

      {result?.error && <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 font-heading">{result.error}</div>}

      {result?.bet && (
        <Card className="p-5 bg-card border-border">
          <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
            <div><p className="text-muted-foreground text-xs">TICKET</p><p className="font-mono font-bold text-xs">{result.bet.ticket_number}</p></div>
            <div><p className="text-muted-foreground text-xs">FIGHT</p><p className="font-heading font-bold">#{result.bet.fight_number}</p></div>
            <div><p className="text-muted-foreground text-xs">SIDE</p>
              <p className={`font-heading font-bold ${result.bet.side === 'meron' ? 'text-red-400' : result.bet.side === 'wala' ? 'text-blue-400' : 'text-green-400'}`}>{result.bet.side?.toUpperCase()}</p>
            </div>
            <div><p className="text-muted-foreground text-xs">BET</p><p className="font-heading font-bold">₱{(result.bet.amount || 0).toLocaleString()}</p></div>
            <div>
              <p className="text-muted-foreground text-xs">STATUS</p>
              <p className={`font-heading font-bold ${result.bet.status === 'won' ? 'text-green-400' : result.bet.status === 'lost' ? 'text-red-400' : result.bet.status === 'paid' ? 'text-muted-foreground' : 'text-yellow-400'}`}>
                {result.bet.status?.toUpperCase()}
              </p>
            </div>
            <div><p className="text-muted-foreground text-xs">PAYOUT</p><p className="font-heading font-bold text-primary">₱{(result.bet.payout || 0).toLocaleString()}</p></div>
            {result.bet.claimed_by && <div className="col-span-2"><p className="text-muted-foreground text-xs">CLAIMED BY</p><p className="font-heading text-xs">{result.bet.claimed_by} — {result.bet.claimed_at ? new Date(result.bet.claimed_at).toLocaleString() : ''}</p></div>}
          </div>

          {result.bet.claimed ? (
            <div className="p-3 bg-muted text-muted-foreground rounded-lg text-center font-heading tracking-wider text-sm">ALREADY CLAIMED</div>
          ) : result.bet.status === 'won' ? (
            <Button onClick={handleClaim} className="w-full h-14 text-lg font-heading tracking-wider bg-green-600 hover:bg-green-700 text-white">
              CLAIM ₱{(result.bet.payout || 0).toLocaleString()}
              {(result.bet.payout || 0) >= Number(getCfg('high_stakes_threshold', '5000')) && <span className="ml-2 text-xs">⚠ HIGH STAKES</span>}
            </Button>
          ) : result.bet.status === 'lost' ? (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-center font-heading tracking-wider text-sm text-red-400">LOST — NO PAYOUT</div>
          ) : (
            <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg text-center font-heading tracking-wider text-sm text-yellow-400">FIGHT NOT YET FINISHED</div>
          )}
        </Card>
      )}
    </div>
  );
}

// --- Stats Tab ---
function StatsPane({ fights, bets, selectedFightId }) {
  const fight = fights.find(f => f.id === selectedFightId);
  const fightBets = bets.filter(b => b.fight_id === selectedFightId);
  if (!fight) return <div className="text-muted-foreground text-sm text-center py-8 font-heading">SELECT A FIGHT FIRST</div>;

  const meronBets = fightBets.filter(b => b.side === 'meron');
  const walaBets = fightBets.filter(b => b.side === 'wala');
  const drawBets = fightBets.filter(b => b.side === 'draw');
  const totalAmount = fightBets.reduce((s, b) => s + (b.amount || 0), 0);
  const totalPayout = fightBets.reduce((s, b) => s + (b.payout || 0), 0);

  const row = (label, count, total, color) => (
    <div className={`p-4 rounded-lg border ${color}`}>
      <p className="font-heading text-sm tracking-wider text-muted-foreground">{label}</p>
      <div className="flex justify-between mt-2">
        <div><p className="text-xs text-muted-foreground">Bets</p><p className="font-heading font-bold text-lg">{count}</p></div>
        <div className="text-right"><p className="text-xs text-muted-foreground">Total</p><p className="font-heading font-bold text-lg">₱{total.toLocaleString()}</p></div>
      </div>
    </div>
  );

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2 text-xs text-center">
        <div className="bg-secondary/30 rounded-lg p-3"><p className="text-muted-foreground">Total Bets</p><p className="font-heading font-bold text-lg">{fightBets.length}</p></div>
        <div className="bg-secondary/30 rounded-lg p-3"><p className="text-muted-foreground">Total Pool</p><p className="font-heading font-bold text-lg">₱{totalAmount.toLocaleString()}</p></div>
        <div className="bg-secondary/30 rounded-lg p-3"><p className="text-muted-foreground">Winner</p><p className={`font-heading font-bold text-lg ${fight.winner === 'meron' ? 'text-red-400' : fight.winner === 'wala' ? 'text-blue-400' : 'text-green-400'}`}>{fight.winner?.toUpperCase() || '—'}</p></div>
        <div className="bg-secondary/30 rounded-lg p-3"><p className="text-muted-foreground">Total Payout</p><p className="font-heading font-bold text-lg">₱{totalPayout.toLocaleString()}</p></div>
      </div>
      {row('MERON', meronBets.length, meronBets.reduce((s,b)=>s+(b.amount||0),0), 'border-red-500/30 bg-red-500/5')}
      {row('WALA', walaBets.length, walaBets.reduce((s,b)=>s+(b.amount||0),0), 'border-blue-500/30 bg-blue-500/5')}
      {row('DRAW', drawBets.length, drawBets.reduce((s,b)=>s+(b.amount||0),0), 'border-green-500/30 bg-green-500/5')}
      <div>
        <p className="text-xs text-muted-foreground font-heading tracking-wider mb-2">RECENT TICKETS</p>
        <div className="space-y-1 max-h-40 overflow-auto">
          {fightBets.slice(-10).reverse().map(b => (
            <div key={b.id} className="flex items-center justify-between p-2 bg-secondary/20 rounded text-xs">
              <span className="font-mono text-muted-foreground truncate w-28">{b.ticket_number}</span>
              <span className={`font-heading font-bold ${b.side === 'meron' ? 'text-red-400' : b.side === 'wala' ? 'text-blue-400' : 'text-green-400'}`}>{b.side?.toUpperCase()}</span>
              <span className="font-heading">₱{(b.amount||0).toLocaleString()}</span>
              <span className={`font-heading ${b.status === 'won' ? 'text-green-400' : b.status === 'lost' ? 'text-red-400' : 'text-yellow-400'}`}>{b.status?.toUpperCase()}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// --- Main Terminal ---
export default function TicketingTerminal() {
  const { operator, login, logout } = useOperatorSession();
  const [selectedFight, setSelectedFight] = useState(null);
  const [selectedSide, setSelectedSide] = useState(null);
  const [amount, setAmount] = useState(0);
  const [lastTicket, setLastTicket] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState('bet');
  const lastBetTime = useRef({});
  const queryClient = useQueryClient();

  const { data: fights = [] } = useQuery({
    queryKey: ['fights'],
    queryFn: () => base44.entities.Fight.list('-created_date', 50),
    refetchInterval: 2000,
  });

  const { data: bets = [] } = useQuery({
    queryKey: ['bets'],
    queryFn: () => base44.entities.Bet.list('-created_date', 500),
    refetchInterval: 3000,
  });

  const { data: configs = [] } = useQuery({
    queryKey: ['system-config'],
    queryFn: () => base44.entities.SystemConfig.list(),
    refetchInterval: 5000,
  });

  // Refresh operator data
  const { data: operatorData } = useQuery({
    queryKey: ['operator', operator?.id],
    queryFn: () => operator?.id ? base44.entities.Operator.filter({ id: operator.id }).then(r => r[0]) : null,
    enabled: !!operator?.id,
    refetchInterval: 5000,
  });
  const currentOperator = operatorData || operator;

  const getCfg = (key, def) => configs.find(c => c.key === key)?.value ?? def;
  const bettingEnabled = getCfg('betting_enabled', 'true') === 'true';
  const commissionRate = Number(getCfg('commission_rate', '10'));
  const oddsD = Number(getCfg('odds_draw', '8'));

  const openFights = fights.filter(f => ['open', 'last_call'].includes(f.status));
  const activeFight = selectedFight ? fights.find(f => f.id === selectedFight) : null;

  // Auto odds from live fight pool
  const fightMeron = activeFight?.total_meron_bets || 0;
  const fightWala = activeFight?.total_wala_bets || 0;
  const liveMultiplier = (1 - commissionRate / 100);
  const oddsM = fightMeron > 0 && fightWala > 0
    ? Math.round(((fightWala * liveMultiplier) / fightMeron + 1) * 100) / 100
    : 1;
  const oddsW = fightMeron > 0 && fightWala > 0
    ? Math.round(((fightMeron * liveMultiplier) / fightWala + 1) * 100) / 100
    : 1;

  useEffect(() => {
    if (activeFight && !['open', 'last_call'].includes(activeFight.status)) {
      setSelectedFight(null); setSelectedSide(null); setAmount(0);
    }
  }, [activeFight]);

  const isOpen = activeFight && ['open', 'last_call'].includes(activeFight.status) && bettingEnabled;
  const getOdds = (side) => side === 'meron' ? oddsM : side === 'wala' ? oddsW : oddsD;

  const generateTicketNumber = () => {
    const ts = Date.now().toString(36).toUpperCase();
    const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `TKT-${ts}-${rand}`;
  };

  const placeBet = async () => {
    if (!selectedFight || !selectedSide || amount <= 0 || !isOpen || processing) return;

    // Duplicate bet detection — same fight+side within 3 seconds
    const key = `${selectedFight}-${selectedSide}`;
    const now = Date.now();
    if (lastBetTime.current[key] && now - lastBetTime.current[key] < 3000) {
      toast.error('Duplicate bet detected! Wait 3 seconds before placing the same bet.');
      await logAction({ action: 'DUPLICATE_BET_BLOCKED', description: `Same bet blocked for fight #${activeFight.fight_number} side ${selectedSide}`, operator: currentOperator, fightNumber: activeFight.fight_number, amount, severity: 'warning' });
      return;
    }
    lastBetTime.current[key] = now;

    // Credit check
    if (currentOperator?.credit_balance !== undefined && currentOperator.credit_balance < amount) {
      toast.error(`Insufficient credits! Balance: ₱${(currentOperator.credit_balance || 0).toLocaleString()}`);
      return;
    }

    setProcessing(true);
    const ticketNumber = generateTicketNumber();
    const odds = getOdds(selectedSide);
    const estPayout = (amount * odds).toLocaleString();

    await base44.entities.Bet.create({
      fight_id: selectedFight,
      fight_number: activeFight.fight_number,
      side: selectedSide,
      amount,
      ticket_number: ticketNumber,
      status: 'active',
      terminal_id: currentOperator?.terminal_id || 'terminal-1',
      operator_id: currentOperator?.id || '',
      payout: 0,
    });

    const betField = selectedSide === 'meron' ? 'total_meron_bets' : selectedSide === 'wala' ? 'total_wala_bets' : 'total_draw_bets';
    await base44.entities.Fight.update(selectedFight, { [betField]: (activeFight[betField] || 0) + amount });

    // Deduct credits from operator
    if (currentOperator?.id) {
      await base44.entities.Operator.update(currentOperator.id, {
        credit_balance: Math.max(0, (currentOperator.credit_balance || 0) - amount),
        total_volume: (currentOperator.total_volume || 0) + amount,
        total_bets_placed: (currentOperator.total_bets_placed || 0) + 1,
      });
    }

    await logAction({ action: 'BET_PLACED', description: `${selectedSide.toUpperCase()} ₱${amount} on Fight #${activeFight.fight_number}`, operator: currentOperator, fightNumber: activeFight.fight_number, ticketNumber, amount, severity: 'info' });

    const sideName = selectedSide === 'meron' ? activeFight.meron_name : selectedSide === 'wala' ? activeFight.wala_name : 'DRAW';
    setLastTicket({ ticketNumber, fightNumber: activeFight.fight_number, side: selectedSide, sideName, amount, odds, estPayout, time: new Date().toLocaleTimeString(), operatorName: currentOperator?.name || '' });

    queryClient.invalidateQueries({ queryKey: ['fights'] });
    queryClient.invalidateQueries({ queryKey: ['bets'] });
    queryClient.invalidateQueries({ queryKey: ['operator', operator?.id] });
    setSelectedSide(null);
    setAmount(0);
    setProcessing(false);
    toast.success('Bet placed!');
  };

  if (!operator) return <OperatorLoginGate onLogin={login} />;

  return (
    <div className="min-h-screen bg-background font-body flex flex-col">
      {/* Header */}
      <div className="bg-card border-b border-border px-4 py-2 flex items-center justify-between">
        <div>
          <h1 className="font-heading text-base font-bold text-primary tracking-wider">SABONG TERMINAL</h1>
          <p className="text-[10px] text-muted-foreground font-heading">{currentOperator?.name} — {currentOperator?.terminal_id}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-right">
            <p className="text-[10px] text-muted-foreground font-heading">CREDITS</p>
            <p className={`font-heading font-bold text-sm ${(currentOperator?.credit_balance || 0) < 500 ? 'text-red-400' : 'text-green-400'}`}>
              ₱{(currentOperator?.credit_balance || 0).toLocaleString()}
            </p>
          </div>
          {activeFight && (
            <span className={`text-[10px] font-heading px-2 py-1 rounded ${activeFight.status === 'last_call' ? 'bg-yellow-500/20 text-yellow-400 animate-pulse' : 'bg-green-500/20 text-green-400'}`}>
              {activeFight.status === 'last_call' ? '⚠ LAST CALL' : '● OPEN'}
            </span>
          )}
          <Button variant="ghost" size="sm" onClick={() => { setSelectedFight(null); setSelectedSide(null); setAmount(0); }}>
            <RotateCcw className="w-3.5 h-3.5" />
          </Button>
          <Button variant="ghost" size="sm" onClick={logout} title="Logout">
            <LogOut className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {!bettingEnabled && <div className="bg-red-900/40 border-b border-red-500/30 px-4 py-1.5 text-center text-xs font-heading text-red-400 tracking-wider">⛔ BETTING DISABLED BY ADMIN</div>}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <TabsList className="bg-card border-b border-border rounded-none w-full justify-start px-4 h-10 gap-1">
          <TabsTrigger value="bet" className="font-heading text-xs tracking-wider">BET</TabsTrigger>
          <TabsTrigger value="claim" className="font-heading text-xs tracking-wider"><QrCode className="w-3 h-3 mr-1" />CLAIM</TabsTrigger>
          <TabsTrigger value="stats" className="font-heading text-xs tracking-wider"><BarChart2 className="w-3 h-3 mr-1" />STATS</TabsTrigger>
          <TabsTrigger value="history" className="font-heading text-xs tracking-wider"><History className="w-3 h-3 mr-1" />HISTORY</TabsTrigger>
        </TabsList>

        <TabsContent value="bet" className="flex-1 overflow-auto p-3 m-0">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Fight select */}
            <div className="space-y-2">
              <p className="text-xs font-heading tracking-wider text-muted-foreground">OPEN FIGHTS</p>
              {openFights.map(f => (
                <Card key={f.id} onClick={() => { setSelectedFight(f.id); setSelectedSide(null); setAmount(0); }}
                  className={`p-3 cursor-pointer transition-all ${selectedFight === f.id ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40'}`}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-heading font-bold text-primary">#{f.fight_number}</span>
                    <span className={`text-[10px] font-heading px-1.5 py-0.5 rounded ${f.status === 'last_call' ? 'bg-yellow-500/20 text-yellow-400 animate-pulse' : 'bg-green-500/20 text-green-400'}`}>
                      {f.status === 'last_call' ? 'LAST CALL' : 'OPEN'}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-1 text-xs">
                    <span className="text-red-400 truncate">{f.meron_name}</span>
                    <span className="text-blue-400 truncate text-right">{f.wala_name}</span>
                  </div>
                </Card>
              ))}
              {openFights.length === 0 && <p className="text-xs text-muted-foreground text-center py-8">No open fights</p>}
            </div>

            {/* Betting panel */}
            <div className="space-y-3">
              {activeFight && isOpen ? (
                <>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { side: 'meron', label: 'MERON', name: activeFight.meron_name, color: selectedSide === 'meron' ? 'bg-red-600 text-white ring-2 ring-red-400' : 'bg-red-600/15 text-red-400 border border-red-500/30' },
                      { side: 'wala', label: 'WALA', name: activeFight.wala_name, color: selectedSide === 'wala' ? 'bg-blue-600 text-white ring-2 ring-blue-400' : 'bg-blue-600/15 text-blue-400 border border-blue-500/30' },
                      { side: 'draw', label: 'DRAW', name: `x${oddsD}`, color: selectedSide === 'draw' ? 'bg-green-600 text-white ring-2 ring-green-400' : 'bg-green-600/15 text-green-400 border border-green-500/30' },
                    ].map(({ side, label, name, color }) => (
                      <button key={side} onClick={() => setSelectedSide(side)}
                        className={`h-16 rounded-lg font-heading tracking-wider transition-all text-center ${color}`}>
                        <div className="text-lg font-bold">{label}</div>
                        <div className="text-[10px] opacity-80 truncate px-1">{name}</div>
                      </button>
                    ))}
                  </div>

                  <div>
                    <p className="text-xs font-heading tracking-wider text-muted-foreground mb-2">TAP TO ADD AMOUNT</p>
                    <div className="grid grid-cols-4 gap-1.5">
                      {AMOUNTS.map(a => (
                        <button key={a} onClick={() => setAmount(prev => prev + a)}
                          className="h-12 bg-secondary hover:bg-secondary/60 rounded-lg font-heading text-sm font-bold transition-all active:scale-95">
                          +₱{a >= 1000 ? `${a/1000}k` : a}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <div className="flex-1 h-12 bg-secondary border border-border rounded-lg flex items-center px-4 font-heading text-xl font-bold">
                      ₱{amount.toLocaleString()}
                    </div>
                    <button onClick={() => setAmount(0)} className="h-12 px-4 bg-secondary border border-border rounded-lg font-heading text-xs text-muted-foreground">CLR</button>
                  </div>

                  {selectedSide && amount > 0 && (
                    <div className="p-2 bg-primary/5 border border-primary/20 rounded-lg text-xs text-center font-heading">
                      ODDS {getOdds(selectedSide)}x — Est. Win: <span className="text-primary font-bold">₱{(amount * getOdds(selectedSide)).toLocaleString()}</span>
                    </div>
                  )}

                  <button
                    onClick={placeBet}
                    disabled={!selectedSide || amount <= 0 || processing}
                    className={`w-full h-16 rounded-xl text-xl font-heading tracking-wider font-bold transition-all disabled:opacity-30 text-white ${
                      selectedSide === 'meron' ? 'bg-red-600 hover:bg-red-700' :
                      selectedSide === 'wala' ? 'bg-blue-600 hover:bg-blue-700' :
                      selectedSide === 'draw' ? 'bg-green-600 hover:bg-green-700' : 'bg-secondary'
                    }`}
                  >
                    {processing ? 'PROCESSING...' : selectedSide && amount > 0 ? `PLACE ${selectedSide.toUpperCase()} ₱${amount.toLocaleString()}` : 'SELECT SIDE + AMOUNT'}
                  </button>
                </>
              ) : activeFight ? (
                <div className="text-center py-12">
                  <p className="font-heading text-red-400 text-lg tracking-wider">⛔ BETTING CLOSED</p>
                  <p className="text-sm text-muted-foreground mt-1">Fight #{activeFight.fight_number} is {activeFight.status}</p>
                </div>
              ) : (
                <div className="flex items-center justify-center h-32 text-muted-foreground font-heading text-sm">SELECT A FIGHT</div>
              )}
            </div>

            {/* Receipt */}
            <div>
              <p className="text-xs font-heading tracking-wider text-muted-foreground mb-2">LAST TICKET</p>
              <ReceiptView ticket={lastTicket} />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="claim" className="p-4 m-0">
          <p className="text-xs font-heading tracking-wider text-muted-foreground mb-3">SCAN QR OR ENTER TICKET NUMBER</p>
          <ClaimPane fights={fights} operator={currentOperator} configs={configs} />
        </TabsContent>

        <TabsContent value="stats" className="p-4 m-0 overflow-auto">
          <p className="text-xs font-heading tracking-wider text-muted-foreground mb-3">FIGHT STATISTICS</p>
          <StatsPane fights={fights} bets={bets} selectedFightId={selectedFight} />
        </TabsContent>

        <TabsContent value="history" className="p-4 m-0 overflow-auto">
          <p className="text-xs font-heading tracking-wider text-muted-foreground mb-3">MY BETTING HISTORY</p>
          <div className="space-y-2">
            {bets.filter(b => b.operator_id === operator?.id || b.terminal_id === currentOperator?.terminal_id).slice(0, 50).map(b => (
              <div key={b.id} className="flex items-center justify-between p-3 bg-card border border-border rounded-lg text-sm">
                <div>
                  <p className="font-mono text-[10px] text-muted-foreground">{b.ticket_number}</p>
                  <p className="font-heading text-xs">Fight #{b.fight_number}</p>
                </div>
                <span className={`font-heading font-bold text-sm ${b.side === 'meron' ? 'text-red-400' : b.side === 'wala' ? 'text-blue-400' : 'text-green-400'}`}>
                  {b.side?.toUpperCase()}
                </span>
                <span className="font-heading font-bold">₱{(b.amount || 0).toLocaleString()}</span>
                <div className="text-right">
                  <p className={`font-heading text-xs ${b.status === 'won' ? 'text-green-400' : b.status === 'lost' ? 'text-red-400' : b.status === 'paid' ? 'text-muted-foreground' : 'text-yellow-400'}`}>{b.status?.toUpperCase()}</p>
                  {b.payout > 0 && <p className="text-xs text-primary">₱{b.payout.toLocaleString()}</p>}
                </div>
              </div>
            ))}
            {bets.filter(b => b.operator_id === operator?.id).length === 0 && (
              <p className="text-center text-muted-foreground py-8 text-sm">No bets yet</p>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}