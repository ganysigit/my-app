'use client';

import { SiteHeader } from '@/components/site-header';
import { SyncMappingsTab } from '@/components/dashboard/sync-mappings-tab';
import { SidebarInset } from '@/components/ui/sidebar';

export default function SyncMappingsPage() {
  return (
    <SidebarInset>
      <SiteHeader />
      <div className="container mx-auto p-6">
        <SyncMappingsTab onUpdate={() => {}} />
      </div>
    </SidebarInset>
  );
}