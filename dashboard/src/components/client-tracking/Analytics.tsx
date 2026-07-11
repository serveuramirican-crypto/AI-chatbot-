"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, Target, CheckCircle2, TrendingUp } from "lucide-react"

export function Analytics() {
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    engaged: 0,
    booked: 0,
    nurture: 0,
    closed: 0,
    escalate: 0,
    byPathway: {
      written: 0,
      calls: 0,
      irl: 0
    }
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchStats() {
      setLoading(true)
      const { data, error } = await supabase.from('leads').select('status, pathway')
      
      if (!error && data) {
        const newStats = {
          total: data.length,
          active: 0,
          engaged: 0,
          booked: 0,
          nurture: 0,
          closed: 0,
          escalate: 0,
          byPathway: { written: 0, calls: 0, irl: 0 }
        }

        data.forEach(lead => {
          if (lead.status in newStats) {
            newStats[lead.status as keyof typeof newStats]++
          }
          if (lead.pathway in newStats.byPathway) {
            newStats.byPathway[lead.pathway as keyof typeof newStats.byPathway]++
          }
        })
        
        setStats(newStats)
      }
      setLoading(false)
    }

    fetchStats()
  }, [])

  if (loading) {
    return <div className="py-12 text-center text-gray-500">Loading analytics...</div>
  }

  const conversionRate = stats.total > 0 ? Math.round((stats.booked / stats.total) * 100) : 0
  const engagementRate = stats.total > 0 ? Math.round(((stats.engaged + stats.booked) / stats.total) * 100) : 0

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Leads</CardTitle>
            <Users className="w-4 h-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">in your pipeline</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Engagement Rate</CardTitle>
            <TrendingUp className="w-4 h-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{engagementRate}%</div>
            <p className="text-xs text-muted-foreground">{stats.engaged + stats.booked} leads replied/connected</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
            <Target className="w-4 h-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{conversionRate}%</div>
            <p className="text-xs text-muted-foreground">{stats.booked} meetings booked</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Cadences</CardTitle>
            <CheckCircle2 className="w-4 h-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.active + stats.escalate}</div>
            <p className="text-xs text-muted-foreground">currently in 14-day flow</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Leads by Pathway</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>Written-First</span>
                  <span className="font-medium">{stats.byPathway.written}</span>
                </div>
                <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full" style={{ width: `${stats.total > 0 ? (stats.byPathway.written / stats.total) * 100 : 0}%` }} />
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>Calls-First</span>
                  <span className="font-medium">{stats.byPathway.calls}</span>
                </div>
                <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-purple-500 rounded-full" style={{ width: `${stats.total > 0 ? (stats.byPathway.calls / stats.total) * 100 : 0}%` }} />
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>IRL-First</span>
                  <span className="font-medium">{stats.byPathway.irl}</span>
                </div>
                <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-orange-500 rounded-full" style={{ width: `${stats.total > 0 ? (stats.byPathway.irl / stats.total) * 100 : 0}%` }} />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Funnel Drop-off</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="relative">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium">Total Reached Out</span>
                  <span className="text-sm font-medium">{stats.total}</span>
                </div>
                <div className="w-full h-8 bg-gray-100 rounded-md overflow-hidden relative">
                  <div className="absolute top-0 left-0 h-full bg-gray-300 w-full"></div>
                </div>
              </div>

              <div className="relative ml-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-blue-700">Engaged (Replied/Connected)</span>
                  <span className="text-sm font-medium">{stats.engaged + stats.booked}</span>
                </div>
                <div className="w-full h-8 bg-gray-100 rounded-md overflow-hidden relative">
                  <div className="absolute top-0 left-0 h-full bg-blue-200 transition-all" style={{ width: `${engagementRate}%` }}></div>
                </div>
              </div>

              <div className="relative ml-8">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-green-700">Booked Meeting</span>
                  <span className="text-sm font-medium">{stats.booked}</span>
                </div>
                <div className="w-full h-8 bg-gray-100 rounded-md overflow-hidden relative">
                  <div className="absolute top-0 left-0 h-full bg-green-300 transition-all" style={{ width: `${conversionRate}%` }}></div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
