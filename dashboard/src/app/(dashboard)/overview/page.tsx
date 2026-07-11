"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Activity, Zap, TrendingUp } from "lucide-react"

export default function OverviewPage() {
  const [totalTokens, setTotalTokens] = useState<number>(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchUsage() {
      // First get the active widget_id
      const { data: settings } = await supabase
        .from('widget_settings')
        .select('id')
        .limit(1)
        .single()

      if (settings?.id) {
        // Fetch all usage logs for this widget
        const { data: logs, error } = await supabase
          .from('usage_logs')
          .select('tokens_used')
          .eq('widget_id', settings.id)

        if (!error && logs) {
          const sum = logs.reduce((acc, curr) => acc + (curr.tokens_used || 0), 0)
          setTotalTokens(sum)
        }
      }
      setLoading(false)
    }

    fetchUsage()
  }, [])

  // For demonstration, let's assume a free tier limit of 100,000 tokens
  const TOKEN_LIMIT = 100000
  const usagePercentage = Math.min((totalTokens / TOKEN_LIMIT) * 100, 100)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard Overview</h1>
        <p className="text-muted-foreground mt-1">
          Monitor your chatbot's performance and AI token usage.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Usage Statistics Block */}
        <Card className="col-span-full md:col-span-2 lg:col-span-1">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-medium flex items-center gap-2">
                <Activity className="w-5 h-5 text-blue-500" />
                Usage Statistics
              </CardTitle>
              <Zap className="w-4 h-4 text-amber-500" />
            </div>
            <CardDescription>Total AI tokens consumed by this widget</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-[100px] flex items-center justify-center text-sm text-muted-foreground">
                Loading usage data...
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-baseline justify-between mt-2">
                  <span className="text-4xl font-bold tracking-tight text-gray-900">
                    {totalTokens.toLocaleString()}
                  </span>
                  <span className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                    <TrendingUp className="w-4 h-4 text-emerald-500" />
                    Tokens
                  </span>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-muted-foreground font-medium">
                    <span>Usage Plan</span>
                    <span>{usagePercentage.toFixed(1)}% of limit</span>
                  </div>
                  <div className="h-3 w-full bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${usagePercentage > 90 ? 'bg-red-500' : usagePercentage > 75 ? 'bg-amber-500' : 'bg-blue-600'}`}
                      style={{ width: `${usagePercentage}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Based on a hypothetical limit of {TOKEN_LIMIT.toLocaleString()} tokens.
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
