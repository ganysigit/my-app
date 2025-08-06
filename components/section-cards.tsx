import { IconTrendingDown, IconTrendingUp, IconDatabase } from "@tabler/icons-react"

import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

async function getDashboardStats() {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/dashboard/stats`, {
      cache: 'no-store'
    })
    if (!response.ok) {
      throw new Error('Failed to fetch dashboard stats')
    }
    return await response.json()
  } catch (error) {
    console.error('Error fetching dashboard stats:', error)
    return {
      totalNotionConnections: 0,
      totalIssues: 0,
      totalMappings: 0,
      syncSuccessRate: 0
    }
  }
}

export async function SectionCards() {
  const stats = await getDashboardStats()
  return (
    <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Notion Database Connections</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {stats.totalNotionConnections}
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              <IconDatabase className="size-4" />
              Active
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            Connected databases <IconDatabase className="size-4" />
          </div>
          <div className="text-muted-foreground">
            Total active Notion connections
          </div>
        </CardFooter>
      </Card>
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Total Issues</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {stats.totalIssues}
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              <IconTrendingUp />
              Tracked
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            Issues being tracked <IconTrendingUp className="size-4" />
          </div>
          <div className="text-muted-foreground">
            Across all connected databases
          </div>
        </CardFooter>
      </Card>
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Sync Mappings</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {stats.totalMappings}
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              <IconTrendingUp />
              Active
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            Active sync configurations <IconTrendingUp className="size-4" />
          </div>
          <div className="text-muted-foreground">Notion to Discord mappings</div>
        </CardFooter>
      </Card>
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Sync Success Rate</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {stats.syncSuccessRate}%
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              <IconTrendingUp />
              {stats.syncSuccessRate >= 90 ? 'Excellent' : stats.syncSuccessRate >= 70 ? 'Good' : 'Needs Attention'}
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            Sync operation success rate <IconTrendingUp className="size-4" />
          </div>
          <div className="text-muted-foreground">Overall system reliability</div>
        </CardFooter>
      </Card>
    </div>
  )
}
