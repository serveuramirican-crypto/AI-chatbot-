export type Pathway = 'written' | 'calls' | 'irl';

export type LeadStatus = 'active' | 'engaged' | 'booked' | 'nurture' | 'closed' | 'escalate';

export interface Lead {
  id: string;
  name: string;
  company?: string;
  email?: string;
  phone?: string;
  pathway: Pathway;
  status: LeadStatus;
  current_day: number;
  notes?: string;
  custom_fields?: Record<string, string>;
  created_at: string;
  last_contacted_at?: string;
}

export interface LeadStep {
  id: string;
  lead_id: string;
  step_key: string;
  completed: boolean;
  completed_at?: string;
  outcome?: string;
}
