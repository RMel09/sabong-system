import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, ChevronDown, ChevronUp } from 'lucide-react';

export default function ArchivePanel() {
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState(null);

  const { data: archives = [] } = useQuery({
    queryKey: ['archives'],
    queryFn: () => base44.entities.FightArchive.list('-event_date', 500),
  });

  const filtered = archives.filter(a =>
    String(a.fight_number).includes(search) ||
    (a.meron_name || '').toLowerCase().includes(search.toLowerCase()) ||
    (a.wala_name || '').toLowerCase().includes(search.toLowerCase()) ||
    (a.event_date || '').includes(search) ||
    (a.winner || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <Card className="p-4 bg-card border-border">
        <div className="flex items-center gap-3">
          <Search className="w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by fight #, name, date, winner..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="bg-background"
          />
        </div>
      </Card>

      <div className="space-y-2">
        {filtered.map(a => {
          const isOpen = expanded === a.id;
          let tickets = [];
          try { tickets = JSON.parse(a.tickets_snapshot || '[]'); } catch {}

          return (
            <Card key={a.id} className="bg-card border-border overflow-hidden">
              <div
                className="p-4 flex items-center justify-between cursor-pointer hover:bg-secondary/20"
                onClick={() => setExpanded(isOpen ? null : a.id)}
              >
                <div className="flex items-center gap-4 flex-wrap">
                  <span className="font-heading text-lg font-bold text-primary w-10">#{a.fight_number}</span>
                  <span className="text-xs text-muted-foreground">{a.event_date}</span>
                  <span className="text-red-400 text-sm">{a.meron_name}</span>
                  <span className="text-muted-foreground text-xs">VS</span>
                  <span className="text-blue-400 text-sm">{a.wala_name}</span>
                  <Badge className={`text-xs font-heading ${a.winner === 'meron' ? 'bg-red-500/20 text-red-400' : a.winner === 'wala' ? 'bg-blue-500/20 text-blue-400' : 'bg-green-500/20 text-green-400'}`}>
                    {a.winner?.toUpperCase()}
                  </Badge>
                  {a.bayong_triggered && <Badge className="bg-yellow-500/20 text-yellow-400 text-xs">BAYONG!</Badge>}
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Pool</p>
                    <p className="font-heading font-bold text-sm">₱{(a.total_pool || 0).toLocaleString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">House</p>
                    <p className="font-heading font-bold text-sm text-yellow-400">₱{(a.house_cut || 0).toLocaleString()}</p>
                  </div>
                  {isOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                </div>
              </div>

              {isOpen && (
                <div className="border-t border-border p-4 bg-secondary/10">
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4 text-center">
                    {[
                      ['Meron Bets', `₱${(a.total_meron_bets || 0).toLocaleString()}`, 'text-red-400'],
                      ['Wala Bets', `₱${(a.total_wala_bets || 0).toLocaleString()}`, 'text-blue-400'],
                      ['Draw Bets', `₱${(a.total_draw_bets || 0).toLocaleString()}`, 'text-green-400'],
                      ['Total Payout', `₱${(a.total_payout || 0).toLocaleString()}`, 'text-primary'],
                      ['# of Bets', a.bet_count || 0, 'text-foreground'],
                    ].map(([label, val, color]) => (
                      <div key={label} className="bg-card rounded-lg p-3">
                        <p className="text-[10px] text-muted-foreground tracking-wider uppercase">{label}</p>
                        <p className={`font-heading font-bold ${color}`}>{val}</p>
                      </div>
                    ))}
                  </div>

                  {tickets.length > 0 && (
                    <div className="overflow-auto max-h-64">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-border">
                            {['TICKET','SIDE','BET','STATUS','PAYOUT'].map(h => (
                              <th key={h} className="text-left p-2 font-heading text-muted-foreground tracking-wider">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {tickets.map((t, i) => (
                            <tr key={i} className="border-b border-border/30">
                              <td className="p-2 font-mono">{t.ticket_number}</td>
                              <td className={`p-2 font-heading font-bold ${t.side === 'meron' ? 'text-red-400' : t.side === 'wala' ? 'text-blue-400' : 'text-green-400'}`}>{t.side?.toUpperCase()}</td>
                              <td className="p-2">₱{(t.amount || 0).toLocaleString()}</td>
                              <td className="p-2">
                                <span className={`font-heading ${t.status === 'won' ? 'text-green-400' : t.status === 'lost' ? 'text-red-400' : 'text-muted-foreground'}`}>
                                  {t.status?.toUpperCase()}
                                </span>
                              </td>
                              <td className="p-2 font-heading">₱{(t.payout || 0).toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </Card>
          );
        })}
        {filtered.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">No archived fights found</div>
        )}
      </div>
    </div>
  );
}