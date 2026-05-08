import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ShieldAlert } from 'lucide-react';

export default function PinVerifyModal({ operator, onConfirm, onCancel, payout }) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);

  const verify = () => {
    if (pin === operator?.pin) {
      onConfirm();
    } else {
      setError(true);
      setPin('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
      <div className="bg-card border-2 border-yellow-500/40 rounded-2xl p-8 w-full max-w-sm text-center">
        <div className="w-14 h-14 rounded-full bg-yellow-500/10 flex items-center justify-center mx-auto mb-4">
          <ShieldAlert className="w-7 h-7 text-yellow-400" />
        </div>
        <h2 className="font-heading text-xl font-bold tracking-wider text-yellow-400 mb-1">HIGH-STAKES PAYOUT</h2>
        <p className="text-sm text-muted-foreground mb-1">Amount: <span className="text-primary font-bold font-heading">₱{(payout || 0).toLocaleString()}</span></p>
        <p className="text-xs text-muted-foreground mb-5">Enter your PIN to confirm this payout</p>
        <Input
          type="password"
          value={pin}
          onChange={e => { setPin(e.target.value); setError(false); }}
          onKeyDown={e => e.key === 'Enter' && verify()}
          placeholder="Enter PIN"
          className={`bg-background text-center font-heading text-2xl tracking-widest h-12 mb-3 ${error ? 'border-red-500' : ''}`}
          maxLength={6}
          autoFocus
        />
        {error && <p className="text-red-400 text-xs font-heading mb-2">Incorrect PIN</p>}
        <div className="grid grid-cols-2 gap-3 mt-2">
          <Button variant="outline" onClick={onCancel} className="font-heading tracking-wider">CANCEL</Button>
          <Button onClick={verify} className="font-heading tracking-wider bg-yellow-500 text-black hover:bg-yellow-400">CONFIRM</Button>
        </div>
      </div>
    </div>
  );
}