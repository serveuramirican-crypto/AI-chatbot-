/**
 * workflowStore.ts
 *
 * Lightweight helpers + a React hook for persisting Canvas Flow
 * workflows to Supabase's `workflows` table.
 *
 * Table schema (already applied via migration):
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

// ─── ID generator ────────────────────────────────────────────────────────────

export const generateWorkflowId = () =>
  `wf_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`

// ─── CRUD helpers (plain async functions — no React) ─────────────────────────

/** List all workflows ordered by last update. */
export async function listWorkflows(): Promise<WorkflowMeta[]> {
  const { data, error } = await supabase
    .from('workflows')
    .select('id, name, updated_at')
    .not('id', 'like', '%\\_published%')
    .order('updated_at', { ascending: false })

  if (error) {
    console.error('[workflowStore] listWorkflows error:', error.message)
    return []
  }
  return data ?? []
}

/** Load a full workflow row (nodes + edges + start pos). */
export async function loadWorkflow(id: string): Promise<WorkflowRow | null> {
  const { data, error } = await supabase
    .from('workflows')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    console.error('[workflowStore] loadWorkflow error:', error.message)
    return null
  }
  return data as WorkflowRow
}

/** Create a new workflow row and return its id. */
export async function createWorkflow(name = 'Untitled workflow'): Promise<string> {
  const id = generateWorkflowId()
  const { error } = await supabase.from('workflows').insert({
    id,
    name,
    nodes: [],
    edges: [],
    start_node_pos: { x: 340, y: 280 },
    updated_at: new Date().toISOString(),
  })

  if (error) {
    console.error('[workflowStore] createWorkflow error:', error.message)
  }
  return id
}

/** Rename a workflow. */
export async function renameWorkflow(id: string, name: string): Promise<void> {
  const { error } = await supabase
    .from('workflows')
    .update({ name, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) {
    console.error('[workflowStore] renameWorkflow error:', error.message)
  }
}

/** Persist the full canvas state for a workflow. */
export async function saveWorkflow(
  id: string,
  nodes: unknown[],
  edges: unknown[],
  startNodePos: { x: number; y: number },
): Promise<void> {
  const { error } = await supabase.from('workflows').upsert(
    {
      id,
      nodes,
      edges,
      start_node_pos: startNodePos,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'id' },
  )

  if (error) {
    console.error('[workflowStore] saveWorkflow error:', error.message)
  } else {
    console.log('[workflowStore] saved workflow', id)
  }
}

/** Delete a workflow row. */
export async function deleteWorkflow(id: string): Promise<void> {
  const { error } = await supabase.from('workflows').delete().eq('id', id)
  if (error) {
    console.error('[workflowStore] deleteWorkflow error:', error.message)
  }
}

// ─── Publish ───────────────────────────────────────────────────────────────────

/** Publish a workflow by copying its state to a _published id. */
export async function publishWorkflow(id: string): Promise<boolean> {
  const source = await loadWorkflow(id)
  if (!source) return false

  const baseId = id.replace(/(_published)+$/, '')
  const publishedId = `${baseId}_published`
  const { error } = await supabase.from('workflows').upsert(
    {
      id: publishedId,
      name: source.name, // Keep the same name
      nodes: source.nodes,
      edges: source.edges,
      start_node_pos: source.start_node_pos,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'id' },
  )

  if (error) {
    console.error('[workflowStore] publishWorkflow error:', error.message)
    return false
  }
  
  console.log('[workflowStore] published workflow', id, 'to', publishedId)
  return true
}

// ─── Persistence hook ─────────────────────────────────────────────────────────

interface UseWorkflowPersistenceOptions {
  workflowId: string | null
  nodes: unknown[]
  edges: unknown[]
  startNodePos: { x: number; y: number }
  /** Called with loaded nodes when a workflow is fetched on mount/id-change. */
  onLoad: (row: WorkflowRow) => void
  /** Debounce delay in ms (default: 600). */
  debounceMs?: number
}

/**
 * Bidirectional persistence hook.
 *
 * - LOADS the workflow from Supabase whenever `workflowId` changes.
 * - SAVES whenever nodes / edges / startNodePos change, debounced.
 */
export function useWorkflowPersistence({
  workflowId,
  nodes,
  edges,
  startNodePos,
  onLoad,
  debounceMs = 600,
}: UseWorkflowPersistenceOptions): void {
  // Track whether the current state was just loaded from DB to avoid
  // an immediate write-back that would race with the load itself.
  const justLoaded = useRef(false)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Load on workflowId change ──────────────────────────────────────────────
  useEffect(() => {
    if (!workflowId) return

    justLoaded.current = true
    loadWorkflow(workflowId).then((row) => {
      if (row) onLoad(row)
      // Allow saves after the next render cycle completes
      setTimeout(() => { justLoaded.current = false }, 0)
    })

    return () => {
      // Cancel any pending save when switching workflows
      if (saveTimer.current) clearTimeout(saveTimer.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workflowId])

  // ── Auto-save on state change ─────────────────────────────────────────────
  useEffect(() => {
    if (!workflowId) return
    if (justLoaded.current) return // skip the echo after load

    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      saveWorkflow(workflowId, nodes, edges, startNodePos)
    }, debounceMs)

    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current)
    }
    // nodes/edges/startNodePos are objects — changes are detected by reference
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes, edges, startNodePos, workflowId])
}
