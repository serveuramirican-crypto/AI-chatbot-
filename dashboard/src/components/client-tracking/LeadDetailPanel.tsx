"use client"

import { Lead } from "@/types/leads"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { CadenceTracker } from "./CadenceTracker"
import { supabase } from "@/lib/supabase"
import { Trash2 } from "lucide-react"

interface LeadDetailPanelProps {
  lead: Lead;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

export function LeadDetailPanel({ lead, isOpen, onClose, onUpdate }: LeadDetailPanelProps) {
  
  const handleDelete = async () => {
    if (confirm("Are you sure you want to delete this lead? This cannot be undone.")) {
      const { error } = await supabase.from('leads').delete().eq('id', lead.id)
      if (!error) {
        onUpdate()
        onClose()
      } else {
        alert("Failed to delete lead.")
      }
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto">
        <DialogHeader className="flex flex-row items-start justify-between pr-6">
          <div>
            <DialogTitle className="text-xl">{lead.name}</DialogTitle>
            {lead.company && <p className="text-sm text-muted-foreground">{lead.company}</p>}
          </div>
          <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-700 hover:bg-red-50" onClick={handleDelete}>
            <Trash2 className="w-4 h-4" />
          </Button>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 text-sm mt-2">
          <div>
            <span className="text-gray-500">Email: </span>
            <span className="font-medium">{lead.email || '-'}</span>
          </div>
          <div>
            <span className="text-gray-500">Phone: </span>
            <span className="font-medium">{lead.phone || '-'}</span>
          </div>
          <div className="col-span-2">
            <span className="text-gray-500">Pathway: </span>
            <span className="font-medium uppercase tracking-wider text-xs bg-gray-100 px-2 py-1 rounded">
              {lead.pathway}-FIRST
            </span>
          </div>
          {lead.notes && (
            <div className="col-span-2 bg-yellow-50/50 p-3 rounded text-xs text-gray-700 mt-2">
              <span className="font-semibold block mb-1">Notes:</span>
              {lead.notes}
            </div>
          )}
          {lead.custom_fields && Object.keys(lead.custom_fields).length > 0 && (
            <div className="col-span-2 mt-2">
              <span className="font-semibold block mb-2 text-gray-700">Custom Fields:</span>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(lead.custom_fields).map(([key, value]) => (
                  <div key={key} className="bg-gray-50 p-2 rounded">
                    <span className="text-gray-500 text-xs block">{key}</span>
                    <span className="font-medium text-sm">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <Separator className="my-4" />

        <div className="space-y-4">
          <h3 className="text-lg font-medium">Outreach Cadence Tracker</h3>
          <CadenceTracker lead={lead} onUpdate={onUpdate} />
        </div>
      </DialogContent>
    </Dialog>
  )
}
