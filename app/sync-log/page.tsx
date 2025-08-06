'use client';

import { SiteHeader } from '@/components/site-header';
import { SyncLogTab } from '@/components/dashboard/sync-log-tab';
import { SidebarInset } from '@/components/ui/sidebar';

export default function SyncLogPage() {
  return (
    <SidebarInset>
      <SiteHeader />
      <div className="container mx-auto p-6">
        <SyncLogTab />
      </div>
    </SidebarInset>
  );
}