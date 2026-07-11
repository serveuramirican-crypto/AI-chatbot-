"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { Lead, LeadStep, LeadStatus } from "@/types/leads"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"

interface CadenceTrackerProps {
  lead: Lead;
  onUpdate: () => void;
}

const CADENCE_CONFIG = {
  written: [
    { key: 'day_1_message_1', label: 'Day 1: Message #1' },
    { key: 'day_3_followup_2', label: 'Day 3: Follow-up #2' },
    { key: 'day_5_followup_3', label: 'Day 5: Follow-up #3' },
    { key: 'day_7_followup_4', label: 'Day 7: Follow-up #4' },
  ],
  calls: [
    { key: 'day_1_call_1_email', label: 'Day 1: Call #1 + Recap Email' },
    { key: 'day_3_call_2', label: 'Day 3: Call #2' },
    { key: 'day_5_call_3', label: 'Day 5: Call #3' },
    { key: 'day_7_closeloop_email', label: 'Day 7: Close-loop Email' },
  ],
  irl: [
    { key: 'day_1_visit_1', label: 'Day 1: Visit #1' },
    { key: 'day_2_followup', label: 'Day 2: Follow-up' },
    { key: 'day_5_call', label: 'Day 5: Call (if direct #)' },
  ],
  escalate: [
    { key: 'day_8_call_1', label: 'Day 8: Call #1' },
    { key: 'day_10_call_2', label: 'Day 10: Call #2' },
    { key: 'day_12_call_3', label: 'Day 12: Call #3' },
  ]
}

export function CadenceTracker({ lead, onUpdate }: CadenceTrackerProps) {
  const [steps, setSteps] = useState<Record<string, LeadStep>>({})
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [status, setStatus] = useState<LeadStatus>(lead.status)

  useEffect(() => {
    async function fetchSteps() {
      setLoading(true)
      const { data, error } = await supabase
        .from('lead_steps')
        .select('*')
        .eq('lead_id', lead.id)

      if (!error && data) {
        const stepsMap = data.reduce((acc, step) => {
          acc[step.step_key] = step
          return acc
        }, {} as Record<string, LeadStep>)
        setSteps(stepsMap)
      }
      setLoading(false)
    }

    fetchSteps()
  }, [lead.id])

  const handleStepToggle = async (stepKey: string, checked: boolean) => {
    setUpdating(true)
    const existingStep = steps[stepKey]

    if (existingStep) {
      // Update existing step
      const { data, error } = await supabase
        .from('lead_steps')
        .update({ 
          completed: checked, 
          completed_at: checked ? new Date().toISOString() : null 
        })
        .eq('id', existingStep.id)
        .select()
        .single()
        
      if (!error && data) {
        setSteps(prev => ({ ...prev, [stepKey]: data as LeadStep }))
      }
    } else {
      // Create new step
      const { data, error } = await supabase
        .from('lead_steps')
        .insert([{
          lead_id: lead.id,
          step_key: stepKey,
          completed: checked,
          completed_at: checked ? new Date().toISOString() : null
        }])
        .select()
        .single()
        
      if (!error && data) {
        setSteps(prev => ({ ...prev, [stepKey]: data as LeadStep }))
      }
    }
    
    // Update last_contacted_at on the lead if marked checked
    if (checked) {
      await supabase
        .from('leads')
        .update({ last_contacted_at: new Date().toISOString() })
        .eq('id', lead.id)
    }
    
    onUpdate()
    setUpdating(false)
  }

  const handleStatusChange = async (newStatus: string | null) => {
    if (!newStatus) return
    setUpdating(true)
    setStatus(newStatus as LeadStatus)
    await supabase
      .from('leads')
      .update({ status: newStatus })
      .eq('id', lead.id)
    onUpdate()
    setUpdating(false)
  }

  const handleDayChange = async (newDay: string | null) => {
    if (!newDay) return
    setUpdating(true)
    await supabase
      .from('leads')
      .update({ current_day: parseInt(newDay, 10) })
      .eq('id', lead.id)
    onUpdate()
    setUpdating(false)
  }

  const renderSteps = (configItems: {key: string, label: string}[], title: string) => {
    return (
      <div className="space-y-3 mt-4">
        <h4 className="font-semibold text-sm text-gray-700">{title}</h4>
        {configItems.map(item => (
          <div key={item.key} className="flex items-center space-x-2">
            <Checkbox 
              id={item.key} 
              checked={steps[item.key]?.completed || false}
              onCheckedChange={(checked: boolean | 'indeterminate') => handleStepToggle(item.key, checked as boolean)}
              disabled={updating || loading}
            />
            <label
              htmlFor={item.key}
              className={`text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 ${
                steps[item.key]?.completed ? 'text-gray-400 line-through' : 'text-gray-900'
              }`}
            >
              {item.label}
            </label>
            {steps[item.key]?.completed_at && (
              <span className="text-[10px] text-gray-400 ml-2">
                {new Date(steps[item.key].completed_at!).toLocaleDateString()}
              </span>
            )}
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex gap-4">
        <div className="flex-1 space-y-2">
          <Label>Overall Status</Label>
          <Select value={status} onValueChange={handleStatusChange} disabled={updating}>
            <SelectTrigger className={status === 'engaged' ? 'bg-green-50' : status === 'booked' ? 'bg-blue-50' : ''}>
              <SelectValue placeholder="Select Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="engaged">Engaged (Book Meeting!)</SelectItem>
              <SelectItem value="booked">Booked (Scheduled)</SelectItem>
              <SelectItem value="nurture">Nurture (Follow up in 30 days)</SelectItem>
              <SelectItem value="escalate">Escalate</SelectItem>
              <SelectItem value="closed">Closed (Not Interested)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="w-32 space-y-2">
          <Label>Current Day</Label>
          <Select value={lead.current_day.toString()} onValueChange={handleDayChange} disabled={updating}>
            <SelectTrigger>
              <SelectValue placeholder="Day" />
            </SelectTrigger>
            <SelectContent>
              {Array.from({length: 14}, (_, i) => i + 1).map(day => (
                <SelectItem key={day} value={day.toString()}>Day {day}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Separator />

      {loading ? (
        <div className="text-sm text-gray-500 py-4">Loading cadence...</div>
      ) : (
        <>
          <div className="bg-gray-50 p-4 rounded-md border">
            {renderSteps(CADENCE_CONFIG[lead.pathway as keyof typeof CADENCE_CONFIG] || [], `Primary Pathway: ${lead.pathway.toUpperCase()}-FIRST (Days 1-7)`)}
            
            {lead.status === 'escalate' && (
              <>
                <Separator className="my-4" />
                {renderSteps(CADENCE_CONFIG.escalate, "ESCALATION (Days 8-14)")}
              </>
            )}
          </div>
          
          <div className="space-y-4">
            <h4 className="font-semibold text-sm text-gray-700">Outcomes / Next Steps</h4>
            <div className="flex flex-wrap gap-2">
              {lead.status !== 'engaged' && lead.status !== 'booked' && (
                <Button variant="outline" size="sm" className="bg-green-50 hover:bg-green-100 text-green-700 border-green-200" onClick={() => handleStatusChange('engaged')}>
                  Any Reply? → Mark Engaged
                </Button>
              )}
              {lead.status === 'engaged' && (
                <Button variant="outline" size="sm" className="bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200" onClick={() => handleStatusChange('booked')}>
                  Meeting Scheduled → Mark Booked
                </Button>
              )}
              {lead.status === 'active' && lead.current_day >= 7 && lead.pathway === 'written' && (
                <Button variant="outline" size="sm" className="bg-orange-50 hover:bg-orange-100 text-orange-700 border-orange-200" onClick={() => handleStatusChange('escalate')}>
                  No Response Day 7 → Escalate
                </Button>
              )}
              {lead.status === 'active' && lead.current_day >= 7 && lead.pathway !== 'written' && (
                <Button variant="outline" size="sm" className="bg-yellow-50 hover:bg-yellow-100 text-yellow-700 border-yellow-200" onClick={() => handleStatusChange('nurture')}>
                  No Contact Day 7 → Nurture
                </Button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
