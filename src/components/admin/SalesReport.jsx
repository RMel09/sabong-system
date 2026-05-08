import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Download } from 'lucide-react';

function exportCSV(archives) {
  const headers = ['Date','Fight#','Meron','Wala','Winner','Total Pool','House Cut','Total Payout','Bets','Meron Bets','Wala Bets','Draw Bets'];
  const rows = archives.map(a => [
    a.event_date, a.fight_number, a.meron_name, a.wala_name, a.winner,
    a.total_pool||0, a.house_cut||0, a.total_payout||0, a.bet_count||0,
    a.total_meron_bets||0, a.total_wala_bets||0, a.total_draw_bets||0
  ]);
  const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `sabong-sales-${format(new Date(),'yyyy-MM-dd')}.csv`;
  a.click(); URL.revokeObjectURL(url);
}

export default function SalesReport() {
  const { data: archives = [] } = useQuery({
    queryKey: ['archives'],
    queryFn: () => base44.entities.FightArchive.list('-event_date', 200),
  });

  const { data: bets = [] } = useQuery({
    queryKey: ['bets-all'],
    queryFn: () => base44.entities.Bet.list('-created_date', 500),
  });

  const today = format(new Date(), 'yyyy-MM-dd');
  const todayArchives = archives.filter(a => a.event_date === today);

  const totalPool = archives.reduce((s, a) => s + (a.total_pool || 0), 0);
  const totalHouse = archives.reduce((s, a) => s + (a.house_cut || 0), 0);
  const totalPayout = archives.reduce((s, a) => s + (a.total_payout || 0), 0);
  const todayPool = todayArchives.reduce((s, a) => s + (a.total_pool || 0), 0);
  const todayHouse = todayArchives.reduce((s, a) => s + (a.house_cut || 0), 0);

  // Build daily chart data from archives (last 10 event dates)
  const dailyMap = {};
  archives.forEach(a => {
    if (!a.event_date) return;
    if (!dailyMap[a.event_date]) dailyMap[a.event_date] = { date: a.event_date, pool: 0, house: 0, fights: 0 };
    dailyMap[a.event_date].pool += a.total_pool || 0;
    dailyMap[a.event_date].house += a.house_cut || 0;
    dailyMap[a.event_date].fights += 1;
  });
  const chartData = Object.values(dailyMap).sort((a, b) => a.date.localeCompare(b.date)).slice(-14);

  const statCard = (label, value, color = 'text-primary') => (
    <Card className="p-5 bg-card border-border">
      <p className="text-xs text-muted-foreground uppercase tracking-wider font-heading">{label}</p>
      <p className={`text-2xl font-heading font-bold mt-1 ${color}`}>{value}</p>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-heading text-lg font-bold tracking-wider mb-3 text-primary">TODAY</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {statCard("Today's Fights", todayArchives.length)}
          {statCard("Today's Total Pool", `₱${todayPool.toLocaleString()}`, 'text-green-400')}
          {statCard("Today's House Cut", `₱${todayHouse.toLocaleString()}`, 'text-yellow-400')}
          {statCard("Today's Net to Bettors", `₱${(todayPool - todayHouse).toLocaleString()}`, 'text-blue-400')}
        </div>
      </div>

      <div>
        <h2 className="font-heading text-lg font-bold tracking-wider mb-3 text-primary">ALL TIME</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {statCard("Total Fights", archives.length)}
          {statCard("Total Pool", `₱${totalPool.toLocaleString()}`, 'text-green-400')}
          {statCard("Total House Revenue", `₱${totalHouse.toLocaleString()}`, 'text-yellow-400')}
          {statCard("Total Paid Out", `₱${totalPayout.toLocaleString()}`, 'text-blue-400')}
        </div>
      </div>

      <Card className="p-6 bg-card border-border">
        <h2 className="font-heading text-lg font-bold tracking-wider mb-4 text-primary">DAILY REVENUE (LAST 14 DAYS)</h2>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
            <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={v => `₱${(v/1000).toFixed(0)}k`} />
            <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8 }} formatter={v => `₱${v.toLocaleString()}`} />
            <Legend />
            <Bar dataKey="pool" name="Total Pool" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            <Bar dataKey="house" name="House Cut" fill="hsl(var(--chart-4))" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* Per Fight breakdown */}
      <Card className="p-6 bg-card border-border">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-heading text-lg font-bold tracking-wider text-primary">FIGHT BREAKDOWN (ALL)</h2>
          <Button size="sm" variant="outline" onClick={() => exportCSV(archives)} className="font-heading text-xs tracking-wider">
            <Download className="w-3.5 h-3.5 mr-1.5" />CSV EXPORT
          </Button>
        </div>
        <div className="overflow-auto max-h-96">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-card">
              <tr className="border-b border-border">
                {['DATE','#','MERON','WALA','WINNER','POOL','HOUSE','PAYOUT','BETS'].map(h => (
                  <th key={h} className="text-left p-2 font-heading text-xs text-muted-foreground tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {archives.map(a => (
                <tr key={a.id} className="border-b border-border/40 hover:bg-secondary/20">
                  <td className="p-2 text-xs text-muted-foreground">{a.event_date}</td>
                  <td className="p-2 font-heading font-bold text-primary">{a.fight_number}</td>
                  <td className="p-2 text-red-400 text-xs">{a.meron_name}</td>
                  <td className="p-2 text-blue-400 text-xs">{a.wala_name}</td>
                  <td className="p-2">
                    <span className={`font-heading font-bold text-xs ${a.winner === 'meron' ? 'text-red-400' : a.winner === 'wala' ? 'text-blue-400' : 'text-green-400'}`}>
                      {a.winner?.toUpperCase()}
                    </span>
                  </td>
                  <td className="p-2 font-heading text-xs">₱{(a.total_pool || 0).toLocaleString()}</td>
                  <td className="p-2 text-yellow-400 text-xs">₱{(a.house_cut || 0).toLocaleString()}</td>
                  <td className="p-2 text-green-400 text-xs">₱{(a.total_payout || 0).toLocaleString()}</td>
                  <td className="p-2 text-xs">{a.bet_count || 0}</td>
                </tr>
              ))}
              {archives.length === 0 && (
                <tr><td colSpan={9} className="p-8 text-center text-muted-foreground">No archived fights yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}