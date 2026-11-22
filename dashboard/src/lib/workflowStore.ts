/**
 * workflowStore.ts
 *
 * Lightweight helpers + a React hook for persisting Canvas Flow
 * workflows to Supabase's `workflows` table, with automatic localStorage
 * fallback cache so workflows are never lost.
 *
 * Table schema:
 *   id             text PRIMARY KEY
 *   name           text
 *   nodes          jsonb
 *   edges          jsonb
 *   start_node_pos jsonb   — {x, y} of the draggable Start node
 *   updated_at     timestamptz
 */

import { useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface WorkflowMeta {
  id: string
  name: string
  updated_at: string
}

export interface WorkflowRow extends WorkflowMeta {
  nodes: unknown[]
  edges: unknown[]
  start_node_pos: { x: number; y: number }
}

// ─── Local Storage Keys & Cache Helpers ─────────────────────────────────────

const LS_WORKFLOW_LIST_KEY = 'canvas_flow_workflows_list'
const LS_WORKFLOW_PREFIX = 'canvas_flow_wf_'

export function getLocalWorkflows(): WorkflowMeta[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(LS_WORKFLOW_LIST_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function saveLocalWorkflowRow(row: WorkflowRow): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(`${LS_WORKFLOW_PREFIX}${row.id}`, JSON.stringify(row))
    // Also update meta list
    const current = getLocalWorkflows()
    const meta: WorkflowMeta = { id: row.id, name: row.name, updated_at: row.updated_at }
    const filtered = current.filter((w) => w.id !== row.id)
    localStorage.setItem(LS_WORKFLOW_LIST_KEY, JSON.stringify([meta, ...filtered]))
  } catch (err) {
    console.warn('[workflowStore] localStorage write failed:', err)
  }
}

export function getLocalWorkflowRow(id: string): WorkflowRow | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(`${LS_WORKFLOW_PREFIX}${id}`)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function deleteLocalWorkflow(id: string): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.removeItem(`${LS_WORKFLOW_PREFIX}${id}`)
    const current = getLocalWorkflows()
    localStorage.setItem(LS_WORKFLOW_LIST_KEY, JSON.stringify(current.filter((w) => w.id !== id)))
  } catch (err) {
    console.warn('[workflowStore] localStorage delete failed:', err)
  }
}

// ─── ID generator ────────────────────────────────────────────────────────────

export const generateWorkflowId = () =>
  `wf_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`

// ─── CRUD helpers ────────────────────────────────────────────────────────────

/** List all workflows ordered by last update (Supabase + localStorage merge). */
export async function listWorkflows(): Promise<WorkflowMeta[]> {
  try {
    const { data, error } = await supabase
      .from('workflows')
      .select('id, name, updated_at')
      .order('updated_at', { ascending: false })

    if (error) {
      console.warn('[workflowStore] Supabase listWorkflows error, falling back to local cache:', error.message)
      return getLocalWorkflows()
    }

    const remoteWorkflows = (data ?? []).filter((w) => !w.id.includes('_published'))
    
    // Merge with any local-only workflows that might not be synced yet
    const local = getLocalWorkflows()
    const remoteIds = new Set(remoteWorkflows.map((w) => w.id))
    const localOnly = local.filter((w) => !remoteIds.has(w.id))

    const merged = [...remoteWorkflows, ...localOnly].sort(
      (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    )

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(LS_WORKFLOW_LIST_KEY, JSON.stringify(merged))
      } catch {}
    }

    return merged
  } catch (err) {
    console.error('[workflowStore] listWorkflows catch, using local storage:', err)
    return getLocalWorkflows()
  }
}

/** Load a full workflow row (nodes + edges + start pos). */
export async function loadWorkflow(id: string): Promise<WorkflowRow | null> {
  try {
    const { data, error } = await supabase
      .from('workflows')
      .select('*')
      .eq('id', id)
      .maybeSingle()

    if (!error && data) {
      const row = data as WorkflowRow
      saveLocalWorkflowRow(row)
      return row
    }
  } catch (err) {
    console.warn('[workflowStore] Supabase loadWorkflow error, trying local cache:', err)
  }

  // Fallback to local storage
  return getLocalWorkflowRow(id)
}

/** Create a new workflow row and return its id. */
export async function createWorkflow(
  name = 'Untitled workflow',
  initialData?: { nodes?: unknown[]; edges?: unknown[]; start_node_pos?: { x: number; y: number } }
): Promise<string> {
  const id = generateWorkflowId()
  const payload: WorkflowRow = {
    id,
    name,
    nodes: initialData?.nodes ?? [],
    edges: initialData?.edges ?? [],
    start_node_pos: initialData?.start_node_pos ?? { x: 340, y: 280 },
    updated_at: new Date().toISOString(),
  }

  // Save to local cache immediately
  saveLocalWorkflowRow(payload)

  try {
    const { error } = await supabase.from('workflows').insert(payload)
    if (error) {
      console.error('[workflowStore] createWorkflow error in Supabase:', error.message)
    }
  } catch (err) {
    console.error('[workflowStore] createWorkflow network error:', err)
  }

  return id
}

/** Duplicate an existing workflow. */
export async function duplicateWorkflow(id: string): Promise<string | null> {
  const original = await loadWorkflow(id)
  if (!original) return null

  const newName = `${original.name} (Copy)`
  return await createWorkflow(newName, {
    nodes: original.nodes,
    edges: original.edges,
    start_node_pos: original.start_node_pos,
  })
}

/** Rename a workflow. */
export async function renameWorkflow(id: string, name: string): Promise<void> {
  const localRow = getLocalWorkflowRow(id)
  if (localRow) {
    saveLocalWorkflowRow({ ...localRow, name, updated_at: new Date().toISOString() })
  }

  try {
    const { error } = await supabase
      .from('workflows')
      .update({ name, updated_at: new Date().toISOString() })
      .eq('id', id)

    if (error) {
      console.error('[workflowStore] renameWorkflow error:', error.message)
    }
  } catch (err) {
    console.error('[workflowStore] renameWorkflow network error:', err)
  }
}

/** Persist the full canvas state for a workflow. Returns true if successful. */
export async function saveWorkflow(
  id: string,
  nodes: unknown[],
  edges: unknown[],
  startNodePos: { x: number; y: number },
  name?: string,
): Promise<boolean> {
  const now = new Date().toISOString()
  const currentMeta = getLocalWorkflows().find((w) => w.id === id)
  const workflowName = name || currentMeta?.name || 'Untitled workflow'

  const payload: WorkflowRow = {
    id,
    name: workflowName,
    nodes,
    edges,
    start_node_pos: startNodePos,
    updated_at: now,
  }

  // Always write to local storage first (instant durability)
  saveLocalWorkflowRow(payload)

  try {
    const { error } = await supabase.from('workflows').upsert(
      {
        id,
        name: workflowName,
        nodes,
        edges,
        start_node_pos: startNodePos,
        updated_at: now,
      },
      { onConflict: 'id' },
    )

    if (error) {
      console.error('[workflowStore] saveWorkflow Supabase error:', error.message)
      return false
    }

    console.log('[workflowStore] successfully saved workflow', id)
    return true
  } catch (err) {
    console.error('[workflowStore] saveWorkflow network catch:', err)
    return false
  }
}

/** Delete a workflow row. */
export async function deleteWorkflow(id: string): Promise<void> {
  deleteLocalWorkflow(id)

  try {
    const { error } = await supabase.from('workflows').delete().eq('id', id)
    if (error) {
      console.error('[workflowStore] deleteWorkflow error:', error.message)
    }
  } catch (err) {
    console.error('[workflowStore] deleteWorkflow catch:', err)
  }
}

// ─── Publish ───────────────────────────────────────────────────────────────────

/** Publish a workflow by copying its state to a _published id. */
export async function publishWorkflow(id: string): Promise<boolean> {
  const source = await loadWorkflow(id)
  if (!source) return false

  const baseId = id.replace(/(_published)+$/, '')
  const publishedId = `${baseId}_published`
  const payload = {
    id: publishedId,
    name: source.name,
    nodes: source.nodes,
    edges: source.edges,
    start_node_pos: source.start_node_pos,
    updated_at: new Date().toISOString(),
  }

  try {
    const { error } = await supabase.from('workflows').upsert(payload, { onConflict: 'id' })
    if (error) {
      console.error('[workflowStore] publishWorkflow error:', error.message)
      return false
    }
    console.log('[workflowStore] published workflow', id, 'to', publishedId)
    return true
  } catch (err) {
    console.error('[workflowStore] publishWorkflow catch:', err)
    return false
  }
}

// ─── Persistence hook ─────────────────────────────────────────────────────────

interface UseWorkflowPersistenceOptions {
  workflowId: string | null
  nodes: unknown[]
  edges: unknown[]
  startNodePos: { x: number; y: number }
  name?: string
  /** Called with loaded nodes when a workflow is fetched on mount/id-change. */
  onLoad: (row: WorkflowRow) => void
  /** Notifies caller of save status transitions. */
  onSaveStatusChange?: (status: 'saved' | 'saving' | 'dirty' | 'error') => void
  /** Debounce delay in ms (default: 800). */
  debounceMs?: number
}

/**
 * Bidirectional persistence hook.
 *
 * - LOADS the workflow from Supabase / localStorage whenever `workflowId` changes.
 * - AUTO-SAVES whenever nodes / edges / startNodePos change, debounced.
 */
export function useWorkflowPersistence({
  workflowId,
  nodes,
  edges,
  startNodePos,
  name,
  onLoad,
  onSaveStatusChange,
  debounceMs = 800,
}: UseWorkflowPersistenceOptions): void {
  const justLoaded = useRef(false)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isFirstMount = useRef(true)

  // ── Load on workflowId change ──────────────────────────────────────────────
  useEffect(() => {
    if (!workflowId) return

    justLoaded.current = true
    loadWorkflow(workflowId).then((row) => {
      if (row) onLoad(row)
      setTimeout(() => {
        justLoaded.current = false
        onSaveStatusChange?.('saved')
      }, 100)
    })

    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workflowId])

  // ── Auto-save on state change ─────────────────────────────────────────────
  useEffect(() => {
    if (!workflowId) return
    if (isFirstMount.current) {
      isFirstMount.current = false
      return
    }
    if (justLoaded.current) return

    onSaveStatusChange?.('dirty')

    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      onSaveStatusChange?.('saving')
      const ok = await saveWorkflow(workflowId, nodes, edges, startNodePos, name)
      onSaveStatusChange?.(ok ? 'saved' : 'error')
    }, debounceMs)

    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes, edges, startNodePos, workflowId, name])
}
