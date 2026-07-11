"use client"

import { useState } from "react"
import { supabase } from "@/lib/supabase"
import { Pathway } from "@/types/leads"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, X } from "lucide-react"

interface AddLeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLeadAdded: () => void;
}

export function AddLeadModal({ isOpen, onClose, onLeadAdded }: AddLeadModalProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    company: '',
    email: '',
    phone: '',
    pathway: 'written' as Pathway,
    notes: ''
  })
  const [customFields, setCustomFields] = useState<{key: string, value: string}[]>([])

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleAddCustomField = () => {
    setCustomFields(prev => [...prev, { key: '', value: '' }])
  }

  const handleCustomFieldChange = (index: number, field: 'key' | 'value', value: string) => {
    const newFields = [...customFields]
    newFields[index][field] = value
    setCustomFields(newFields)
  }

  const handleRemoveCustomField = (index: number) => {
    setCustomFields(prev => prev.filter((_, i) => i !== index))
  }

  const getInitialStepsForPathway = (pathway: Pathway) => {
    switch (pathway) {
      case 'written':
        return ['day_1_message_1', 'day_3_followup_2', 'day_5_followup_3', 'day_7_followup_4']
      case 'calls':
        return ['day_1_call_1_email', 'day_3_call_2', 'day_5_call_3', 'day_7_closeloop_email']
      case 'irl':
        return ['day_1_visit_1', 'day_2_followup', 'day_5_call']
      default:
        return []
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // 1. Insert Lead
      const { data: leadData, error: leadError } = await supabase
        .from('leads')
        .insert([{
          name: formData.name,
          company: formData.company,
          email: formData.email,
          phone: formData.phone,
          pathway: formData.pathway,
          notes: formData.notes,
          custom_fields: customFields.reduce((acc, curr) => {
            if (curr.key.trim()) acc[curr.key.trim()] = curr.value
            return acc
          }, {} as Record<string, string>),
          status: 'active',
          current_day: 1
        }])
        .select()
        .single()

      if (leadError) throw leadError

      // 2. Insert initial steps based on pathway
      if (leadData) {
        const initialSteps = getInitialStepsForPathway(formData.pathway)
        const stepRecords = initialSteps.map(step_key => ({
          lead_id: leadData.id,
          step_key,
          completed: false
        }))

        if (stepRecords.length > 0) {
          const { error: stepsError } = await supabase
            .from('lead_steps')
            .insert(stepRecords)
            
          if (stepsError) throw stepsError
        }
      }

      onLeadAdded()
      onClose()
      setFormData({ name: '', company: '', email: '', phone: '', pathway: 'written', notes: '' })
      setCustomFields([])
    } catch (error) {
      console.error("Error adding lead:", error)
      alert("Failed to add lead. Please check the console.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add New Lead</DialogTitle>
          <DialogDescription>
            Enter lead details and assign an outreach pathway to start tracking.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                required
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="John Doe"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="company">Company</Label>
              <Input
                id="company"
                value={formData.company}
                onChange={(e) => handleChange('company', e.target.value)}
                placeholder="Acme Corp"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                placeholder="john@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                placeholder="+1 555-0000"
              />
            </div>
          </div>

          <div className="space-y-2 pt-2 border-t">
            <Label htmlFor="pathway">Primary Pathway (7 Days) *</Label>
            <Select 
              value={formData.pathway} 
              onValueChange={(value) => value && handleChange('pathway', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a pathway" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="written">Written-First (Days 1-7)</SelectItem>
                <SelectItem value="calls">Calls-First (Days 1-7)</SelectItem>
                <SelectItem value="irl">IRL-First (Days 1-7)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">
              {formData.pathway === 'written' && "Message #1 -> Follow-up #2 -> Follow-up #3 -> Follow-up #4"}
              {formData.pathway === 'calls' && "Call #1 + Email -> Call #2 -> Call #3 -> Close-loop Email"}
              {formData.pathway === 'irl' && "Visit #1 -> Follow-up -> Call"}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              placeholder="Any initial notes about this lead..."
              rows={3}
            />
          </div>

          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <Label>Custom Fields</Label>
              <Button type="button" variant="outline" size="sm" onClick={handleAddCustomField} className="h-7 text-xs">
                <Plus className="w-3 h-3 mr-1" /> Add Field
              </Button>
            </div>
            {customFields.map((field, index) => (
              <div key={index} className="flex items-center gap-2">
                <Input
                  placeholder="Field Name (e.g. Role)"
                  value={field.key}
                  onChange={(e) => handleCustomFieldChange(index, 'key', e.target.value)}
                  className="flex-1"
                />
                <Input
                  placeholder="Value (e.g. CEO)"
                  value={field.value}
                  onChange={(e) => handleCustomFieldChange(index, 'value', e.target.value)}
                  className="flex-1"
                />
                <Button type="button" variant="ghost" size="icon" onClick={() => handleRemoveCustomField(index)} className="text-gray-500 hover:text-red-500">
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Adding..." : "Add Lead"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
