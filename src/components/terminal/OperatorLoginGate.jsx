import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { User, Lock, LogIn } from 'lucide-react';
import { logAction } from '@/lib/auditLog';

export default function OperatorLoginGate({ onLogin }) {
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!username || !pin) return;
    setLoading(true);
    setError('');
    const ops = await base44.entities.Operator.filter({ username: username.trim(), status: 'active' });
    const op = ops?.[0];
    if (!op || op.pin !== pin.trim()) {
      setError('Invalid username or PIN');
      setLoading(false);
      return;
    }
    await logAction({ action: 'OPERATOR_LOGIN', description: `${op.name} logged in`, operator: op, severity: 'info' });
    onLogin(op);
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Card className="p-8 bg-card border-border w-full max-w-sm text-center">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-5">
          <User className="w-8 h-8 text-primary" />
        </div>
        <h1 className="font-heading text-2xl font-bold tracking-widest mb-1 text-primary">OPERATOR LOGIN</h1>
        <p className="text-xs text-muted-foreground mb-6 tracking-wider">SABONG TERMINAL</p>

        <div className="space-y-3">
          <Input
            value={username}
            onChange={e => { setUsername(e.target.value); setError(''); }}
            placeholder="Username"
            className="bg-background text-center font-heading text-lg h-12"
          />
          <Input
            type="password"
            value={pin}
            onChange={e => { setPin(e.target.value); setError(''); }}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
            placeholder="PIN"
            className="bg-background text-center font-heading text-2xl tracking-widest h-12"
            maxLength={6}
          />
          {error && <p className="text-red-400 text-xs font-heading">{error}</p>}
          <Button onClick={handleLogin} disabled={loading} className="w-full h-12 font-heading tracking-widest text-base">
            <LogIn className="w-4 h-4 mr-2" />
            {loading ? 'CHECKING...' : 'LOGIN'}
          </Button>
        </div>
      </Card>
    </div>
  );
}