'use client';

import { SiteHeader } from '@/components/site-header';
import { NotionConnectionsTab } from '@/components/dashboard/notion-connections-tab';
import { SidebarInset } from '@/components/ui/sidebar';

export default function NotionConnectionsPage() {
  return (
    <SidebarInset>
      <SiteHeader />
      <div className="container mx-auto p-6">
        <NotionConnectionsTab onUpdate={() => {}} />
      </div>
    </SidebarInset>
  );
}