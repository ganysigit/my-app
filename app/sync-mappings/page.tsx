'use client';

import { SiteHeader } from '@/components/site-header';
import { SyncMappingsTab } from '@/components/dashboard/sync-mappings-tab';
import { SidebarInset } from '@/components/ui/sidebar';

export default function SyncMappingsPage() {
  return (
    <SidebarInset className="h-full flex flex-col">
      <SiteHeader />
      <div className="flex flex-1 flex-col">
        <div className="@container/main flex flex-1 flex-col gap-2">
          <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
            <div className="px-4 lg:px-6">
              <SyncMappingsTab onUpdate={() => {}} />
            </div>
          </div>
        </div>
      </div>
    </SidebarInset>
  );
}