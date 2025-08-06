import { AppSidebar } from '@/components/app-sidebar';
import { SiteHeader } from '@/components/site-header';
import { DiscordChannelsTab } from '@/components/dashboard/discord-channels-tab';
import { SidebarProvider } from '@/components/ui/sidebar';

export default function DiscordConnectionsPage() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <main className="flex-1">
        <SiteHeader />
        <div className="container mx-auto p-6">
          <DiscordChannelsTab onUpdate={() => {}} />
        </div>
      </main>
    </SidebarProvider>
  );
}