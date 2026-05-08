import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';

export default function CreateFightDialog({ open, onOpenChange, nextFightNumber }) {
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    meron_name: '',
    wala_name: '',
    meron_weight: '',
    wala_weight: '',
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    await base44.entities.Fight.create({
      ...form,
      fight_number: nextFightNumber,
      status: 'upcoming',
      event_date: format(new Date(), 'yyyy-MM-dd'),
      total_meron_bets: 0,
      total_wala_bets: 0,
    });
    queryClient.invalidateQueries({ queryKey: ['fights'] });
    setSaving(false);
    setForm({ meron_name: '', wala_name: '', meron_weight: '', wala_weight: '' });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl tracking-wide">CREATE FIGHT #{nextFightNumber}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-4 p-4 bg-red-500/5 border border-red-500/20 rounded-lg">
              <h3 className="font-heading text-red-400 font-bold tracking-wider text-sm">MERON (RED)</h3>
              <div>
                <Label className="text-xs text-muted-foreground">Name / Owner</Label>
                <Input value={form.meron_name} onChange={e => setForm({...form, meron_name: e.target.value})} required className="bg-background" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Weight</Label>
                <Input value={form.meron_weight} onChange={e => setForm({...form, meron_weight: e.target.value})} className="bg-background" />
              </div>
            </div>
            <div className="space-y-4 p-4 bg-blue-500/5 border border-blue-500/20 rounded-lg">
              <h3 className="font-heading text-blue-400 font-bold tracking-wider text-sm">WALA (BLUE)</h3>
              <div>
                <Label className="text-xs text-muted-foreground">Name / Owner</Label>
                <Input value={form.wala_name} onChange={e => setForm({...form, wala_name: e.target.value})} required className="bg-background" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Weight</Label>
                <Input value={form.wala_weight} onChange={e => setForm({...form, wala_weight: e.target.value})} className="bg-background" />
              </div>
            </div>
          </div>
          <Button type="submit" disabled={saving} className="w-full font-heading tracking-wider">
            {saving ? 'CREATING...' : 'CREATE FIGHT'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}