'use client';

import { AppSidebar } from '@/components/app-sidebar';
import { SiteHeader } from '@/components/site-header';
import { SyncMappingsTab } from '@/components/dashboard/sync-mappings-tab';
import { SidebarProvider } from '@/components/ui/sidebar';

export default function SyncMappingsPage() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <main className="flex-1">
        <SiteHeader />
        <div className="container mx-auto p-6">
          <SyncMappingsTab onUpdate={() => {}} />
        </div>
      </main>
    </SidebarProvider>
  );
}