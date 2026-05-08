import React, { useState } from 'react';
import AdminGate from '../components/admin/AdminGate';
import AdminTabs from '../components/admin/AdminTabs';

export default function AdminPanel() {
  return (
    <AdminGate>
      <AdminTabs />
    </AdminGate>
  );
}