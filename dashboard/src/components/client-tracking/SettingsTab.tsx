"use client"

import { useState } from "react"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Download, Trash2, AlertTriangle } from "lucide-react"

export function SettingsTab() {
  const [isExporting, setIsExporting] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleExportCSV = async () => {
    setIsExporting(true)
    try {
      const { data, error } = await supabase.from('leads').select('*')
      if (error) throw error

      if (!data || data.length === 0) {
        alert("No leads to export.")
        return
      }

      // Convert to CSV
      const headers = ['id', 'name', 'company', 'email', 'phone', 'pathway', 'status', 'current_day', 'created_at']
      const csvContent = [
        headers.join(','),
        ...data.map(lead => headers.map(header => {
          const val = lead[header as keyof typeof lead]
          // Escape quotes and wrap in quotes if there's a comma
          if (typeof val === 'string') {
            return `"${val.replace(/"/g, '""')}"`
          }
          return val
        }).join(','))
      ].join('\n')

      // Download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement("a")
      const url = URL.createObjectURL(blob)
      link.setAttribute("href", url)
      link.setAttribute("download", `leads_export_${new Date().toISOString().split('T')[0]}.csv`)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (e) {
      console.error("Export failed", e)
      alert("Failed to export leads.")
    } finally {
      setIsExporting(false)
    }
  }

  const handleBulkDeleteClosed = async () => {
    if (confirm("Are you absolutely sure you want to delete ALL leads with the status 'Closed'? This action cannot be undone.")) {
      setIsDeleting(true)
      try {
        const { error, count } = await supabase
          .from('leads')
          .delete({ count: 'exact' })
          .eq('status', 'closed')

        if (error) throw error
        alert(`Successfully deleted ${count || 'all'} closed leads.`)
      } catch (e) {
        console.error("Bulk delete failed", e)
        alert("Failed to bulk delete leads.")
      } finally {
        setIsDeleting(false)
      }
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Data Management</CardTitle>
          <CardDescription>Export your leads data or manage your database storage.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 border rounded-lg bg-gray-50">
            <div>
              <h4 className="font-medium flex items-center gap-2">
                <Download className="w-4 h-4 text-blue-600" />
                Export Leads to CSV
              </h4>
              <p className="text-sm text-gray-500 mt-1">Download a full spreadsheet of all your tracked leads and their current status.</p>
            </div>
            <Button onClick={handleExportCSV} disabled={isExporting} variant="outline" className="shrink-0 bg-white">
              {isExporting ? "Exporting..." : "Download CSV"}
            </Button>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 border border-red-100 rounded-lg bg-red-50/50">
            <div>
              <h4 className="font-medium text-red-700 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                Bulk Delete Closed Leads
              </h4>
              <p className="text-sm text-red-600/80 mt-1">Permanently remove all leads marked as "Closed" (Not Interested). This frees up database space.</p>
            </div>
            <Button onClick={handleBulkDeleteClosed} disabled={isDeleting} variant="destructive" className="shrink-0">
              {isDeleting ? "Deleting..." : "Delete Closed Leads"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
