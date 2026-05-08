import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Swords, Ticket, Monitor, Settings, Trophy, ShieldAlert } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/fights', icon: Swords, label: 'Fight Management' },
  { path: '/results', icon: Trophy, label: 'Results' },
  { path: '/terminal', icon: Ticket, label: 'Ticketing Terminal' },
  { path: '/display', icon: Monitor, label: 'TV Display' },
  { path: '/settings', icon: Settings, label: 'Settings' },
  { path: '/declarator', icon: Trophy, label: 'Declarator' },
  { path: '/admin', icon: ShieldAlert, label: 'Admin Panel', highlight: true },
];

export default function Sidebar() {
  const location = useLocation();

  return (
    <aside className="w-64 h-screen bg-card border-r border-border flex flex-col fixed left-0 top-0 z-40">
      <div className="p-6 border-b border-border">
        <h1 className="font-heading text-2xl font-bold text-primary tracking-wider">SABONG</h1>
        <p className="text-xs text-muted-foreground mt-1 font-body">Arena Management System</p>
      </div>
      <nav className="flex-1 p-3 space-y-1">
        {navItems.map(item => (
          <Link
            key={item.path}
            to={item.path}
            className={cn(
              "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-body font-medium transition-all",
              location.pathname === item.path
                ? "bg-primary/10 text-primary border border-primary/20"
                : item.highlight
                  ? "text-red-400 hover:text-red-300 hover:bg-red-500/10"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary"
            )}
          >
            <item.icon className="w-5 h-5" />
            {item.label}
          </Link>
        ))}
      </nav>
      <div className="p-4 border-t border-border">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-xs text-muted-foreground font-body">System Online</span>
        </div>
      </div>
    </aside>
  );
}