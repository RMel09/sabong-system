import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Plus } from 'lucide-react';

export default function Settings() {
  const queryClient = useQueryClient();
  const [arenaName, setArenaName] = useState('');
  const [arenaLocation, setArenaLocation] = useState('');

  const { data: arenas = [] } = useQuery({
    queryKey: ['arenas'],
    queryFn: () => base44.entities.Arena.list(),
  });

  const createArena = async () => {
    if (!arenaName) return;
    await base44.entities.Arena.create({ name: arenaName, location: arenaLocation, status: 'open' });
    queryClient.invalidateQueries({ queryKey: ['arenas'] });
    setArenaName('');
    setArenaLocation('');
    toast.success('Arena created');
  };

  return (
    <div>
      <h1 className="font-heading text-3xl font-bold tracking-wide mb-8">SETTINGS</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6 bg-card border-border">
          <h2 className="font-heading text-lg font-bold mb-4 tracking-wider">ARENA MANAGEMENT</h2>
          <div className="space-y-3 mb-4">
            <div>
              <Label className="text-xs text-muted-foreground">Arena Name</Label>
              <Input value={arenaName} onChange={e => setArenaName(e.target.value)} placeholder="e.g. Metro Arena" className="bg-background" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Location</Label>
              <Input value={arenaLocation} onChange={e => setArenaLocation(e.target.value)} placeholder="e.g. Manila" className="bg-background" />
            </div>
            <Button onClick={createArena} className="font-heading tracking-wider">
              <Plus className="w-4 h-4 mr-2" /> ADD ARENA
            </Button>
          </div>
          <div className="space-y-2">
            {arenas.map(arena => (
              <div key={arena.id} className="flex items-center justify-between p-3 bg-secondary rounded-lg">
                <div>
                  <p className="font-medium">{arena.name}</p>
                  <p className="text-xs text-muted-foreground">{arena.location}</p>
                </div>
                <span className={`text-xs font-heading tracking-wider ${arena.status === 'open' ? 'text-green-400' : 'text-muted-foreground'}`}>
                  {arena.status?.toUpperCase()}
                </span>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-6 bg-card border-border">
          <h2 className="font-heading text-lg font-bold mb-4 tracking-wider">DISPLAY URLS</h2>
          <p className="text-sm text-muted-foreground mb-4">Open these URLs on your devices:</p>
          <div className="space-y-3">
            <div className="p-3 bg-secondary rounded-lg">
              <p className="text-xs text-muted-foreground">TV Display (Full Screen)</p>
              <p className="font-mono text-sm text-primary mt-1">{window.location.origin}/display</p>
            </div>
            <div className="p-3 bg-secondary rounded-lg">
              <p className="text-xs text-muted-foreground">Sunmi V2 Pro Ticketing Terminal</p>
              <p className="font-mono text-sm text-primary mt-1">{window.location.origin}/terminal</p>
            </div>
            <div className="p-3 bg-secondary rounded-lg">
              <p className="text-xs text-muted-foreground">Admin Dashboard</p>
              <p className="font-mono text-sm text-primary mt-1">{window.location.origin}/</p>
            </div>
          </div>
          <div className="mt-6 p-4 bg-primary/5 border border-primary/20 rounded-lg">
            <h3 className="font-heading text-sm font-bold text-primary tracking-wider mb-2">SETUP TIPS</h3>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• Open /display on TV browsers in kiosk/fullscreen mode</li>
              <li>• Open /terminal on each Sunmi V2 Pro device</li>
              <li>• Multiple terminals can operate simultaneously</li>
              <li>• Data syncs in real-time across all devices</li>
            </ul>
          </div>
        </Card>
      </div>
    </div>
  );
}