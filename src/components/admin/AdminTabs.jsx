import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import SystemConfigPanel from './SystemConfigPanel';
import OperatorManager from './OperatorManager';
import ArchivePanel from './ArchivePanel';
import SalesReport from './SalesReport';
import AntiCheatPanel from './AntiCheatPanel';
import AuditLogViewer from './AuditLogViewer';
import SystemResetPanel from './SystemResetPanel';
import { useAdminAuth } from '@/lib/useAdminAuth';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';

export default function AdminTabs() {
  const { logout } = useAdminAuth();

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-heading text-3xl font-bold tracking-wide text-primary">ADMIN PANEL</h1>
        <Button variant="outline" size="sm" onClick={logout} className="font-heading tracking-wider text-xs">
          <LogOut className="w-3.5 h-3.5 mr-1.5" /> LOGOUT
        </Button>
      </div>
      <Tabs defaultValue="config">
        <TabsList className="bg-card border border-border mb-6 flex flex-wrap h-auto gap-1 p-1">
          <TabsTrigger value="config" className="font-heading tracking-wider text-xs">SYSTEM CONFIG</TabsTrigger>
          <TabsTrigger value="operators" className="font-heading tracking-wider text-xs">OPERATORS</TabsTrigger>
          <TabsTrigger value="sales" className="font-heading tracking-wider text-xs">SALES REPORT</TabsTrigger>
          <TabsTrigger value="archive" className="font-heading tracking-wider text-xs">ARCHIVE</TabsTrigger>
          <TabsTrigger value="anticheat" className="font-heading tracking-wider text-xs">ANTI-CHEAT</TabsTrigger>
          <TabsTrigger value="auditlog" className="font-heading tracking-wider text-xs">AUDIT LOG</TabsTrigger>
          <TabsTrigger value="reset" className="font-heading tracking-wider text-xs text-red-400">SYSTEM RESET</TabsTrigger>
        </TabsList>
        <TabsContent value="config"><SystemConfigPanel /></TabsContent>
        <TabsContent value="operators"><OperatorManager /></TabsContent>
        <TabsContent value="sales"><SalesReport /></TabsContent>
        <TabsContent value="archive"><ArchivePanel /></TabsContent>
        <TabsContent value="anticheat"><AntiCheatPanel /></TabsContent>
        <TabsContent value="auditlog"><AuditLogViewer /></TabsContent>
        <TabsContent value="reset"><SystemResetPanel /></TabsContent>
      </Tabs>
    </div>
  );
}