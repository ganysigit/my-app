import { AppSidebar } from '@/components/app-sidebar';
import { SiteHeader } from '@/components/site-header';
import { NotionConnectionsTab } from '@/components/dashboard/notion-connections-tab';
import { SidebarProvider } from '@/components/ui/sidebar';

export default function NotionConnectionsPage() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <main className="flex-1">
        <SiteHeader />
        <div className="container mx-auto p-6">
          <NotionConnectionsTab onUpdate={() => {}} />
        </div>
      </main>
    </SidebarProvider>
  );
}