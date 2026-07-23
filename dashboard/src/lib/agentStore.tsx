"use client"

import React, {
  createContext,
  useContext,
  useReducer,
  useCallback,
  type ReactNode,
} from 'react'
import type {
  AgentConfig,
  AgentCredential,
  ToolConfig,
  EndToolConfig,
} from '@/types/agent'
import { supabase } from '@/lib/supabase'

// ─────────────────────────────────────────────────────────────────────────────
// Default tools factory — a NEW array per agent.
// NEVER use a shared module-level constant here; doing so would let a
// rogue agent.tools.push() silently corrupt every sibling agent's tools.
// ─────────────────────────────────────────────────────────────────────────────

export const createDefaultTools = (): ToolConfig[] => [
  { id: 'knowledge_base', enabled: false },
  { id: 'buttons', enabled: false },
  { id: 'cards', enabled: false },
  { id: 'carousels', enabled: false },
  { id: 'call_forward', enabled: false },
  { id: 'web_search', enabled: false },
  { id: 'query_products_db', enabled: false },
  { id: 'response_example', enabled: false },
  {
    id: 'end',
    enabled: false,
    config: {
      politeGoodbyeMessage: 'Thanks for chatting — take care!',
      abuseHandlingPolicy: 'block_and_log',
    },
  } as EndToolConfig,
]

// ─────────────────────────────────────────────────────────────────────────────
// ID generator
// ─────────────────────────────────────────────────────────────────────────────

export const generateAgentId = () =>
  `agent_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`

// ─────────────────────────────────────────────────────────────────────────────
// State shape
// ─────────────────────────────────────────────────────────────────────────────

interface AgentStoreState {
  /** Normalized map — agent id → config. NEVER an array. */
  agents: Record<string, AgentConfig>
  /** Credential map — credential id → credential. Separate from agent config. */
  credentials: Record<string, AgentCredential>
  /** Which agent studio modal is currently open (null = closed). */
  activeAgentId: string | null
  /** True once the Supabase bootstrap fetch has completed (success or error). */
  bootstrapped: boolean
}

type Action =
  | { type: 'CREATE_AGENT'; payload: AgentConfig }
  | { type: 'LOAD_AGENTS'; payload: AgentConfig[] }
  | { type: 'SET_BOOTSTRAPPED' }
  | { type: 'UPDATE_AGENT'; agentId: string; patch: Partial<AgentConfig> }
  | { type: 'DELETE_AGENT'; agentId: string }
  | { type: 'OPEN_STUDIO'; agentId: string }
  | { type: 'CLOSE_STUDIO' }
  | { type: 'UPSERT_CREDENTIAL'; payload: AgentCredential }
  | { type: 'DELETE_CREDENTIAL'; credentialId: string }

// ─────────────────────────────────────────────────────────────────────────────
// Reducer — pure, single-agent-keyed mutations only
// ─────────────────────────────────────────────────────────────────────────────

function reducer(state: AgentStoreState, action: Action): AgentStoreState {
  switch (action.type) {
    case 'CREATE_AGENT':
      return {
        ...state,
        agents: { ...state.agents, [action.payload.id]: action.payload },
      }

    case 'LOAD_AGENTS': {
      // Merge loaded agents into the store, preserving any in-memory-only agents
      const loaded = Object.fromEntries(action.payload.map(a => [a.id, a]))
      return {
        ...state,
        agents: { ...state.agents, ...loaded },
        bootstrapped: true,
      }
    }

    case 'SET_BOOTSTRAPPED':
      return { ...state, bootstrapped: true }

    case 'UPDATE_AGENT': {
      const existing = state.agents[action.agentId]
      if (!existing) return state // no-op — fail safe
      return {
        ...state,
        agents: {
          ...state.agents,
          [action.agentId]: {
            ...existing,
            ...action.patch,
            updatedAt: new Date().toISOString(),
          },
        },
      }
    }

    case 'DELETE_AGENT': {
      const { [action.agentId]: _removed, ...rest } = state.agents
      // Nullify dangling exitCondition targetAgentId references in sibling agents
      const cleaned = Object.fromEntries(
        Object.entries(rest).map(([id, agent]) => [
          id,
          {
            ...agent,
            exitConditions: agent.exitConditions.map((ec) =>
              ec.targetAgentId === action.agentId
                ? { ...ec, targetAgentId: null }
                : ec
            ),
          },
        ])
      )
      return {
        ...state,
        agents: cleaned,
        activeAgentId:
          state.activeAgentId === action.agentId ? null : state.activeAgentId,
      }
    }

    case 'OPEN_STUDIO':
      return { ...state, activeAgentId: action.agentId }

    case 'CLOSE_STUDIO':
      return { ...state, activeAgentId: null }

    case 'UPSERT_CREDENTIAL':
      return {
        ...state,
        credentials: {
          ...state.credentials,
          [action.payload.id]: action.payload,
        },
      }

    case 'DELETE_CREDENTIAL': {
      const { [action.credentialId]: _c, ...cRest } = state.credentials
      return { ...state, credentials: cRest }
    }

    default:
      return state
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Contexts
// ─────────────────────────────────────────────────────────────────────────────

const AgentStateContext = createContext<AgentStoreState | undefined>(undefined)
const AgentDispatchContext = createContext<React.Dispatch<Action> | undefined>(undefined)

// ─────────────────────────────────────────────────────────────────────────────
// Provider
// ─────────────────────────────────────────────────────────────────────────────

export function AgentStoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, {
    agents: {},
    credentials: {},
    activeAgentId: null,
    bootstrapped: false,
  })

  return (
    <AgentStateContext.Provider value={state}>
      <AgentDispatchContext.Provider value={dispatch}>
        {children}
      </AgentDispatchContext.Provider>
    </AgentStateContext.Provider>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Internal hooks
// ─────────────────────────────────────────────────────────────────────────────

function useAgentState(): AgentStoreState {
  const ctx = useContext(AgentStateContext)
  if (!ctx) throw new Error('useAgentState must be used inside <AgentStoreProvider>')
  return ctx
}

function useAgentDispatch(): React.Dispatch<Action> {
  const ctx = useContext(AgentDispatchContext)
  if (!ctx) throw new Error('useAgentDispatch must be used inside <AgentStoreProvider>')
  return ctx
}

// ─────────────────────────────────────────────────────────────────────────────
// Public read hooks
// ─────────────────────────────────────────────────────────────────────────────

export function useAgents(): Record<string, AgentConfig> {
  return useAgentState().agents
}

export function useAgent(id: string | null): AgentConfig | undefined {
  return useAgentState().agents[id ?? '']
}

export function useAgentCredentials(): Record<string, AgentCredential> {
  return useAgentState().credentials
}

export function useActiveAgentId(): string | null {
  return useAgentState().activeAgentId
}

/** True once the bootstrap fetch has completed (even if no agents were found). */
export function useAgentBootstrapped(): boolean {
  return useAgentState().bootstrapped
}

/** All agents as an array (useful for target pickers, etc.) */
export function useAgentList(): AgentConfig[] {
  return Object.values(useAgentState().agents)
}

// ─────────────────────────────────────────────────────────────────────────────
// Supabase ↔ AgentConfig mapping helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Maps a raw Supabase agents row to the in-memory AgentConfig shape.
 * Handles column name differences: model_id → model, exit_conditions → exitConditions, etc.
 */
export function rowToAgentConfig(row: Record<string, unknown>): AgentConfig {
  return {
    id: row.id as string,
    title: (row.title as string) ?? 'Untitled Agent',
    model: (row.model_id as AgentConfig['model']) ?? 'gpt-4o-mini',
    customModelId: (row.custom_model_id as string | undefined) ?? undefined,
    credentialId: null, // API key lives server-side only (raw key never in client state)
    apiKey: (row.api_key as string | undefined) ?? undefined, // transient — used by persistAgent only
    instructions: (row.instructions as string) ?? '',
    tools: Array.isArray(row.tools) ? (row.tools as AgentConfig['tools']) : createDefaultTools(),
    knowledgeBase: (row.knowledge_base as AgentConfig['knowledgeBase']) ?? { isConfigured: false, documents: [] },
    response_examples: Array.isArray(row.response_examples) ? (row.response_examples as {question: string, answer: string}[]) : [],
    exitConditions: Array.isArray(row.exit_conditions) ? (row.exit_conditions as AgentConfig['exitConditions']) : [],
    createdAt: (row.created_at as string) ?? new Date().toISOString(),
    updatedAt: (row.updated_at as string) ?? new Date().toISOString(),
    status: (row.status as AgentConfig['status']) ?? 'draft',
  }
}

/**
 * Persists a new or updated AgentConfig to the Supabase `agents` table.
 * Maps in-memory field names back to DB column names.
 */
export async function persistAgent(agent: AgentConfig): Promise<void> {
  const payload: Record<string, unknown> = {
    id: agent.id,
    title: agent.title,
    model_id: agent.model,
    custom_model_id: agent.customModelId ?? null,
    instructions: agent.instructions,
    tools: agent.tools,
    knowledge_base: agent.knowledgeBase,
    response_examples: agent.response_examples ?? [],
    exit_conditions: agent.exitConditions,
    status: agent.status,
    updated_at: new Date().toISOString(),
  }

  // Only include api_key when the user has actively provided a new one.
  // Passing undefined would be stripped by JSON serialization, preserving
  // the existing Supabase column value. Passing null would clear it.
  if (agent.apiKey !== undefined && agent.apiKey.trim() !== '') {
    payload.api_key = agent.apiKey.trim()
  }

  const { error } = await supabase.from('agents').upsert(payload, { onConflict: 'id' })
  if (error) {
    console.error('[agentStore] persistAgent error:', error.message, error)
    throw error // re-throw so the Save button can surface the failure
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Public action hooks
// ─────────────────────────────────────────────────────────────────────────────

export function useAgentActions() {
  const dispatch = useAgentDispatch()

  const createAgent = useCallback(
    (initial?: Partial<AgentConfig>): string => {
      const id = generateAgentId()
      const now = new Date().toISOString()
      const agent: AgentConfig = {
        id,
        title: 'Untitled Agent',
        model: 'gpt-4o-mini',
        credentialId: null,
        instructions: '',
        tools: createDefaultTools(),           // fresh array — isolation guarantee
        knowledgeBase: { isConfigured: false, documents: [] },
        exitConditions: [],
        createdAt: now,
        updatedAt: now,
        status: 'draft',
        ...initial,
      }
      dispatch({ type: 'CREATE_AGENT', payload: agent })
      // Auto-persist to Supabase immediately so the agent exists in DB right away
      persistAgent(agent).catch(err => {
        console.error('[agentStore] Failed to auto-persist new agent:', err)
      })
      return id
    },
    [dispatch]
  )

  /** CRITICAL: only ever spreads the ONE agent keyed by agentId. */
  const updateAgent = useCallback(
    (agentId: string, patch: Partial<AgentConfig>) => {
      dispatch({ type: 'UPDATE_AGENT', agentId, patch })

      // Auto-sync tools to Supabase when updated
      if (patch.tools !== undefined) {
        if (!agentId || patch.tools === null) {
          console.warn('Skipping Supabase sync: Invalid agentId or patch.tools is null.', { agentId, tools: patch.tools })
        } else {
          supabase.from('agents').update({ tools: patch.tools }).eq('id', agentId).then(({ error }) => {
            if (error) {
              console.error('Failed to sync tools to Supabase:', error.message)
              console.error('Full Supabase Error:', error)
            }
          })
        }
      }

      // Auto-sync response_examples to Supabase when updated
      if (patch.response_examples !== undefined) {
        if (agentId) {
          supabase.from('agents').update({ response_examples: patch.response_examples }).eq('id', agentId).then(({ error }) => {
            if (error) console.error('Failed to sync response_examples to Supabase:', error.message)
          })
        }
      }
    },
    [dispatch]
  )

  const deleteAgent = useCallback(
    (agentId: string) => {
      dispatch({ type: 'DELETE_AGENT', agentId })

      // Sync deletion to Supabase
      if (agentId) {
        supabase.from('agents').delete().eq('id', agentId).then(({ error }) => {
          if (error) {
            console.error('Failed to delete agent from Supabase:', error.message)
          }
        })
      }
    },
    [dispatch]
  )

  const openStudio = useCallback(
    (agentId: string) => {
      dispatch({ type: 'OPEN_STUDIO', agentId })
    },
    [dispatch]
  )

  const closeStudio = useCallback(() => {
    dispatch({ type: 'CLOSE_STUDIO' })
  }, [dispatch])

  const upsertCredential = useCallback(
    (credential: AgentCredential) => {
      dispatch({ type: 'UPSERT_CREDENTIAL', payload: credential })
    },
    [dispatch]
  )

  return { createAgent, updateAgent, deleteAgent, openStudio, closeStudio, upsertCredential }
}

// ─────────────────────────────────────────────────────────────────────────────
// Bootstrap hook — loads all agents from Supabase into the store on mount.
// Call once inside CanvasFlowPageInner (inside AgentStoreProvider).
// ─────────────────────────────────────────────────────────────────────────────

export function useAgentBootstrap() {
  const dispatch = useAgentDispatch()

  React.useEffect(() => {
    let cancelled = false

    async function bootstrap() {
      const { data, error } = await supabase
        .from('agents')
        .select('id, title, model_id, custom_model_id, api_key, instructions, tools, knowledge_base, response_examples, exit_conditions, status, created_at, updated_at')
        .order('created_at', { ascending: true })

      if (cancelled) return
      if (error) {
        console.error('[agentStore] useAgentBootstrap error:', error.message)
        // Still mark bootstrapped so the UI stops spinning and shows the picker
        dispatch({ type: 'SET_BOOTSTRAPPED' })
        return
      }

      const configs = (data ?? []).map(row => rowToAgentConfig(row as Record<string, unknown>))
      if (configs.length > 0) {
        dispatch({ type: 'LOAD_AGENTS', payload: configs })
        console.log(`[agentStore] Bootstrapped ${configs.length} agent(s) from Supabase.`)
      } else {
        // No agents found — still mark as bootstrapped so the UI stops spinning
        dispatch({ type: 'SET_BOOTSTRAPPED' })
        console.log('[agentStore] Bootstrap complete — no agents found in Supabase.')
      }
    }

    bootstrap()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
}
