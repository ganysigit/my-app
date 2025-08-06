"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { RefreshCw, CheckCircle, XCircle } from "lucide-react"
import { toast } from "sonner"

export function SiteHeader() {
  const [isSyncing, setIsSyncing] = useState(false)

  const handleManualSync = async () => {
    setIsSyncing(true)
    
    try {
      const response = await fetch('/api/sync/run', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      })

      const result = await response.json()

      if (response.ok) {
        toast.success(`Sync Completed - Successfully processed ${result.result?.issuesProcessed || 0} issues`)
        
        // Refresh the page to show updated data
        window.location.reload()
      } else {
        throw new Error(result.error || 'Sync failed')
      }
    } catch (error) {
      console.error('Manual sync error:', error)
      toast.error(`Sync Failed - ${error instanceof Error ? error.message : 'An error occurred during sync'}`)
    } finally {
      setIsSyncing(false)
    }
  }

  return (
    <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mx-2 data-[orientation=vertical]:h-4"
        />
        <h1 className="text-base font-medium">Issue Tracker Dashboard</h1>
        <div className="ml-auto flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleManualSync}
            disabled={isSyncing}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? 'Syncing...' : 'Sync Now'}
          </Button>
          <Button variant="ghost" asChild size="sm" className="hidden sm:flex">
            <a
              href="https://github.com/shadcn-ui/ui/tree/main/apps/v4/app/(examples)/dashboard"
              rel="noopener noreferrer"
              target="_blank"
              className="dark:text-foreground"
            >
              GitHub
            </a>
          </Button>
        </div>
      </div>
    </header>
  )
}
