import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Save, Power } from 'lucide-react';

export default function SystemConfigPanel() {
  const queryClient = useQueryClient();
  const { data: configs = [] } = useQuery({
    queryKey: ['system-config'],
    queryFn: () => base44.entities.SystemConfig.list(),
  });

  const [vals, setVals] = useState({});

  useEffect(() => {
    if (configs.length > 0) {
      const map = {};
      configs.forEach(c => { map[c.key] = c.value; });
      setVals(map);
    }
  }, [configs]);

  const saveConfig = async (key, val) => {
    const cfg = configs.find(c => c.key === key);
    if (cfg) {
      await base44.entities.SystemConfig.update(cfg.id, { value: String(val) });
    } else {
      await base44.entities.SystemConfig.create({ key, value: String(val), label: key });
    }
    queryClient.invalidateQueries({ queryKey: ['system-config'] });
    toast.success(`${key} saved`);
  };

  const cfgRow = (key, label, type = 'text', hint = '') => (
    <div key={key} className="flex items-center justify-between p-4 bg-secondary/30 rounded-lg">
      <div className="flex-1 mr-4">
        <p className="font-heading text-sm font-bold tracking-wider">{label}</p>
        {hint && <p className="text-xs text-muted-foreground mt-0.5">{hint}</p>}
      </div>
      <div className="flex items-center gap-2">
        <Input
          type={type}
          value={vals[key] ?? ''}
          onChange={e => setVals(v => ({...v, [key]: e.target.value}))}
          className="w-40 bg-background text-center"
        />
        <Button size="sm" onClick={() => saveConfig(key, vals[key])} className="font-heading tracking-wider text-xs">
          <Save className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Security */}
      <Card className="p-6 bg-card border-border">
        <h2 className="font-heading text-lg font-bold tracking-wider mb-4 text-primary">SECURITY</h2>
        <div className="space-y-3">
          {cfgRow('admin_password', 'Admin Password', 'password')}
        </div>
      </Card>

      {/* Betting Control */}
      <Card className="p-6 bg-card border-border">
        <h2 className="font-heading text-lg font-bold tracking-wider mb-4 text-primary">BETTING CONTROL</h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-4 bg-secondary/30 rounded-lg">
            <div>
              <p className="font-heading text-sm font-bold tracking-wider">GLOBAL BETTING ENABLED</p>
              <p className="text-xs text-muted-foreground">Turn off to block ALL bets across all terminals</p>
            </div>
            <div className="flex items-center gap-3">
              <span className={`text-xs font-heading ${vals['betting_enabled'] === 'true' ? 'text-green-400' : 'text-red-400'}`}>
                {vals['betting_enabled'] === 'true' ? 'ON' : 'OFF'}
              </span>
              <Switch
                checked={vals['betting_enabled'] === 'true'}
                onCheckedChange={v => { setVals(x => ({...x, betting_enabled: v ? 'true' : 'false'})); saveConfig('betting_enabled', v ? 'true' : 'false'); }}
              />
            </div>
          </div>
          {cfgRow('bet_timer_seconds', 'Bet Timer (seconds)', 'number', '0 = disabled, sets auto-close countdown per fight')}
        </div>
      </Card>

      {/* Odds */}
      <Card className="p-6 bg-card border-border">
        <h2 className="font-heading text-lg font-bold tracking-wider mb-4 text-primary">ODDS (HOUSE ALWAYS WINS)</h2>
        <div className="space-y-3">
          {cfgRow('commission_rate', 'House Commission %', 'number', 'Deducted from winnings pool. Inhouse always wins this.')}
          {cfgRow('odds_meron', 'Default Meron Multiplier', 'number', 'e.g. 1 = pool-based, 1.8 = fixed x1.8')}
          {cfgRow('odds_wala', 'Default Wala Multiplier', 'number')}
          {cfgRow('odds_draw', 'Default Draw Multiplier', 'number', 'e.g. 8 = pay 8x stake on draw win')}
        </div>
      </Card>

      {/* Security / Payout */}
      <Card className="p-6 bg-card border-border">
        <h2 className="font-heading text-lg font-bold tracking-wider mb-4 text-primary">PAYOUT SECURITY</h2>
        <div className="space-y-3">
          {cfgRow('high_stakes_threshold', 'High-Stakes PIN Threshold (₱)', 'number', 'Payouts above this amount require operator PIN re-entry')}
        </div>
      </Card>

      {/* Bayong */}
      <Card className="p-6 bg-card border-border">
        <h2 className="font-heading text-lg font-bold tracking-wider mb-4 text-primary">BAYONG JACKPOT</h2>
        <div className="space-y-3">
          {cfgRow('bayong_price', 'Bayong Ticket Price (₱)', 'number')}
          {cfgRow('bayong_consecutive_wins', 'Consecutive Wins to Trigger Jackpot', 'number', 'e.g. 10 = 10 same-side wins in a row')}
          {cfgRow('bayong_increment', 'Bayong ₱ Added Per Fight', 'number', 'e.g. 100 = jackpot grows ₱100 each fight')}
        </div>
      </Card>
    </div>
  );
}