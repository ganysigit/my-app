'use client';

import { SiteHeader } from '@/components/site-header';
import { DiscordChannelsTab } from '@/components/dashboard/discord-channels-tab';
import { SidebarInset } from '@/components/ui/sidebar';

export default function DiscordConnectionsPage() {
  return (
    <SidebarInset>
      <SiteHeader />
      <div className="container mx-auto p-6">
        <DiscordChannelsTab onUpdate={() => {}} />
      </div>
    </SidebarInset>
  );
}