import { supabase } from '@/lib/supabase'
import type {
  WorkflowVariable,
  PromptResource,
  TranscriptProperty,
  VariableAssignment,
  TranscriptPropertyAssignment,
} from '@/types/setNode'

// ─── Variable Definitions Cache & Queries ─────────────────────────────────────

export async function fetchWorkflowVariables(workflowId?: string): Promise<WorkflowVariable[]> {
  try {
    let query = supabase.from('workflow_variables').select('*').order('name', { ascending: true })
    if (workflowId) {
      query = query.or(`workflow_id.is.null,workflow_id.eq.${workflowId}`)
    }
    const { data, error } = await query
    if (error) {
      console.warn('[setStore] fetchWorkflowVariables error:', error.message)
      return []
    }
    return (data as WorkflowVariable[]) || []
  } catch (err) {
    console.error('[setStore] fetchWorkflowVariables catch:', err)
    return []
  }
}

export async function createWorkflowVariable(
  name: string,
  type: 'string' | 'number' | 'boolean' | 'any' = 'string',
  description = '',
  defaultValue = '',
  workflowId?: string
): Promise<WorkflowVariable | null> {
  const sanitizedName = name.trim().replace(/[^a-zA-Z0-9_]/g, '_')
  const id = `var_${sanitizedName}_${Date.now().toString(36)}`
  try {
    const payload: Partial<WorkflowVariable> = {
      id,
      name: sanitizedName,
      type,
      description: description.trim(),
      default_value: defaultValue,
      workflow_id: workflowId || null,
    }
    const { data, error } = await supabase
      .from('workflow_variables')
      .insert(payload)
      .select()
      .single()

    if (error) {
      console.error('[setStore] createWorkflowVariable error:', error.message)
      return null
    }
    return data as WorkflowVariable
  } catch (err) {
    console.error('[setStore] createWorkflowVariable catch:', err)
    return null
  }
}

// ─── Prompts Management ────────────────────────────────────────────────────────

export async function fetchPrompts(): Promise<PromptResource[]> {
  try {
    const { data, error } = await supabase
      .from('prompts')
      .select('*')
      .order('name', { ascending: true })

    if (error) {
      console.warn('[setStore] fetchPrompts error:', error.message)
      return []
    }
    return (data as PromptResource[]) || []
  } catch (err) {
    console.error('[setStore] fetchPrompts catch:', err)
    return []
  }
}

export async function createPrompt(
  name: string,
  content: string,
  description = '',
  model = 'openai/gpt-4o-mini'
): Promise<PromptResource | null> {
  const id = `prompt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
  try {
    const payload: PromptResource = {
      id,
      name: name.trim(),
      content: content.trim(),
      description: description.trim(),
      model,
    }
    const { data, error } = await supabase
      .from('prompts')
      .insert(payload)
      .select()
      .single()

    if (error) {
      console.error('[setStore] createPrompt error:', error.message)
      return null
    }
    return data as PromptResource
  } catch (err) {
    console.error('[setStore] createPrompt catch:', err)
    return null
  }
}

// ─── Transcript Properties ─────────────────────────────────────────────────────

export async function fetchTranscriptProperties(): Promise<TranscriptProperty[]> {
  try {
    const { data, error } = await supabase
      .from('transcript_properties')
      .select('*')
      .order('name', { ascending: true })

    if (error) {
      console.warn('[setStore] fetchTranscriptProperties error:', error.message)
      return []
    }
    return (data as TranscriptProperty[]) || []
  } catch (err) {
    console.error('[setStore] fetchTranscriptProperties catch:', err)
    return []
  }
}

export async function createTranscriptProperty(
  name: string,
  dataType: 'string' | 'number' | 'boolean' = 'string',
  description = ''
): Promise<TranscriptProperty | null> {
  const sanitizedName = name.trim().replace(/[^a-zA-Z0-9_]/g, '_')
  const id = `prop_${sanitizedName}`
  try {
    const payload: TranscriptProperty = {
      id,
      name: sanitizedName,
      data_type: dataType,
      description: description.trim(),
    }
    const { data, error } = await supabase
      .from('transcript_properties')
      .insert(payload)
      .select()
      .single()

    if (error) {
      console.error('[setStore] createTranscriptProperty error:', error.message)
      return null
    }
    return data as TranscriptProperty
  } catch (err) {
    console.error('[setStore] createTranscriptProperty catch:', err)
    return null
  }
}

// ─── Variable Reference Interpolation ──────────────────────────────────────────

/**
 * Resolves `{variable_name}` references inside a text template using the current
 * runtime variables map.
 * Rules:
 * 1. Safe regex substitution (NO eval, NO arbitrary code execution).
 * 2. Unresolved references remain or flag warnings.
 * 3. Does not calculate arithmetic (e.g. "{attempts} + 1" becomes "2 + 1").
 * 4. Empty string is respected.
 */
export function interpolateVariables(
  template: string,
  variables: Record<string, any>
): string {
  if (typeof template !== 'string') return String(template ?? '')
  if (!template) return ''

  return template.replace(/\{([a-zA-Z0-9_]+)\}/g, (match, varName) => {
    if (Object.prototype.hasOwnProperty.call(variables, varName)) {
      const val = variables[varName]
      if (val === null || val === undefined) return ''
      return typeof val === 'object' ? JSON.stringify(val) : String(val)
    }
    return match // Keep unresolved {varName} as is
  })
}

/**
 * Extracts all `{var_name}` variable reference names found in a text string.
 */
export function extractVariableReferences(template: string): string[] {
  if (!template) return []
  const matches = template.match(/\{([a-zA-Z0-9_]+)\}/g) || []
  return Array.from(new Set(matches.map((m) => m.slice(1, -1))))
}

// ─── Runtime Persistence (Supabase) ────────────────────────────────────────────

/**
 * Persists updated runtime variable values to Supabase `workflow_execution_variables` table,
 * scoped to the execution/conversation session.
 */
export async function persistExecutionVariables(
  sessionId: string,
  variables: Record<string, any>,
  variablesMeta?: Record<string, string> // maps varName -> variableID
): Promise<void> {
  if (!sessionId) return

  try {
    const entries = Object.entries(variables)
    if (entries.length === 0) return

    const rows = entries.map(([varName, val]) => ({
      session_id: sessionId,
      variable_id: variablesMeta?.[varName] || `var_${varName}`,
      variable_name: varName,
      value: typeof val === 'object' ? JSON.stringify(val) : String(val ?? ''),
      updated_at: new Date().toISOString(),
    }))

    const { error } = await supabase
      .from('workflow_execution_variables')
      .upsert(rows, { onConflict: 'session_id,variable_name' })

    if (error) {
      console.warn('[setStore] persistExecutionVariables error:', error.message)
    }
  } catch (err) {
    console.error('[setStore] persistExecutionVariables catch:', err)
  }
}

/**
 * Updates transcript properties stored in `chat_sessions.metadata` in Supabase.
 * Supports:
 * - Replace: Overwrites existing property value
 * - Append: String concatenation (or array append if existing is array)
 */
export async function updateSessionTranscriptMetadata(
  sessionId: string,
  propertyUpdates: { name: string; value: any; operation: 'replace' | 'append' }[]
): Promise<Record<string, any>> {
  if (!sessionId || propertyUpdates.length === 0) return {}

  try {
    // 1. Fetch current metadata
    const { data: sessionData, error: fetchErr } = await supabase
      .from('chat_sessions')
      .select('metadata')
      .eq('id', sessionId)
      .maybeSingle()

    if (fetchErr) {
      console.warn('[setStore] updateSessionTranscriptMetadata fetch error:', fetchErr.message)
    }

    const currentMetadata: Record<string, any> = (sessionData?.metadata as Record<string, any>) || {}
    const updatedMetadata: Record<string, any> = { ...currentMetadata }

    for (const update of propertyUpdates) {
      const { name, value, operation } = update
      if (operation === 'replace' || !updatedMetadata[name]) {
        updatedMetadata[name] = value
      } else {
        // Append operation
        const existing = updatedMetadata[name]
        if (typeof existing === 'string') {
          // Deterministic text concatenation
          updatedMetadata[name] = `${existing} ${String(value)}`.trim()
        } else if (Array.isArray(existing)) {
          updatedMetadata[name] = [...existing, value]
        } else {
          updatedMetadata[name] = `${String(existing)} ${String(value)}`.trim()
        }
      }
    }

    // 2. Persist updated metadata to chat_sessions
    const { error: updateErr } = await supabase
      .from('chat_sessions')
      .update({
        metadata: updatedMetadata,
        last_interaction: new Date().toISOString(),
      })
      .eq('id', sessionId)

    if (updateErr) {
      console.error('[setStore] Failed to update chat_sessions.metadata:', updateErr.message)
    }

    return updatedMetadata
  } catch (err) {
    console.error('[setStore] updateSessionTranscriptMetadata catch:', err)
    return {}
  }
}
