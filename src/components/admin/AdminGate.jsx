import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Lock, ShieldAlert } from 'lucide-react';
import { useSystemConfig } from '@/lib/useSystemConfig';
import { useAdminAuth } from '@/lib/useAdminAuth';

export default function AdminGate({ children }) {
  const { getConfig } = useSystemConfig();
  const { isAuthed, login } = useAdminAuth();
  const [pw, setPw] = useState('');
  const [error, setError] = useState(false);

  if (isAuthed) return children;

  const handleLogin = () => {
    const correct = getConfig('admin_password', 'admin1234');
    const ok = login(pw, correct);
    if (!ok) { setError(true); setPw(''); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Card className="p-10 bg-card border-border w-full max-w-sm text-center">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
          <Lock className="w-8 h-8 text-primary" />
        </div>
        <h1 className="font-heading text-2xl font-bold tracking-wider mb-1">ADMIN ACCESS</h1>
        <p className="text-sm text-muted-foreground mb-6">Enter admin password to continue</p>
        <Input
          type="password"
          value={pw}
          onChange={e => { setPw(e.target.value); setError(false); }}
          onKeyDown={e => e.key === 'Enter' && handleLogin()}
          placeholder="Password"
          className={`bg-background mb-3 ${error ? 'border-red-500' : ''}`}
        />
        {error && (
          <div className="flex items-center gap-2 text-red-400 text-sm mb-3">
            <ShieldAlert className="w-4 h-4" /> Incorrect password
          </div>
        )}
        <Button onClick={handleLogin} className="w-full font-heading tracking-wider">ENTER</Button>
      </Card>
    </div>
  );
}