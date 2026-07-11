"use client"

import React, {
  createContext,
  useContext,
  useReducer,
  useCallback,
  type ReactNode,
} from 'react'
import type { Playbook, ToolConfig, ExitCondition } from '@/types/playbook'

// ─────────────────────────────────────────────────────────────────────────────
// Quickstart templates (seeded on first render)
// ─────────────────────────────────────────────────────────────────────────────

const DEFAULT_SYSTEM_TOOLS: ToolConfig[] = [
  { id: 'knowledge_base', enabled: false },
  { id: 'buttons',        enabled: true  },
  { id: 'cards',          enabled: false },
  { id: 'carousels',      enabled: false },
  { id: 'web_search',     enabled: false },
  { id: 'end',            enabled: true  },
]

function makeTemplate(
  id: string,
  title: string,
  trigger: string,
  instructions: string,
  exitConditions: ExitCondition[],
): Playbook {
  const now = new Date().toISOString()
  return {
    id,
    title,
    model: 'gpt-4o-mini',
    trigger,
    instructions,
    tools: DEFAULT_SYSTEM_TOOLS,
    exitConditions,
    createdAt: now,
    updatedAt: now,
    isTemplate: true,
    status: 'published',
  }
}

export const QUICKSTART_TEMPLATES: Playbook[] = [
  makeTemplate(
    'tpl_refund',
    'Handle Refund Request',
    'User wants to return a product or request a refund',
    `You are a helpful support agent processing refund requests.\n\nPolicy:\n- Accept returns within 30 days of purchase\n- Require order number and reason for return\n- Offer exchange or full refund\n- Escalate disputed cases to a human agent\n\nBe empathetic and solutions-focused.`,
    [
      { id: 'ec_resolved',  description: 'Refund approved and processed' },
      { id: 'ec_escalate',  description: 'User requests to speak to a human agent' },
      { id: 'ec_cancelled', description: 'User cancels the return request' },
    ],
  ),
  makeTemplate(
    'tpl_faq',
    'Answer Product FAQ',
    'User asks a general question about the product, pricing, or features',
    `You are a knowledgeable product assistant.\n\nUse the knowledge base to answer questions about:\n- Product features and specifications\n- Pricing and plans\n- Integration capabilities\n- Getting started guides\n\nIf you cannot answer confidently, offer to connect the user with a specialist.`,
    [
      { id: 'ec_answered',  description: 'Question fully answered' },
      { id: 'ec_needs_human', description: 'User needs a human specialist' },
    ],
  ),
  makeTemplate(
    'tpl_escalate',
    'Escalate to Human',
    'User explicitly asks to speak to a human or live agent',
    `You are a handoff agent. Your sole job is to collect context before connecting to a human.\n\nAsk for:\n1. The user's name and contact email\n2. A brief description of their issue\n3. Their preferred contact time (if async)\n\nConfirm the details before finalizing the handoff.`,
    [
      { id: 'ec_handoff_ready', description: 'Context collected, ready to hand off' },
      { id: 'ec_user_left',     description: 'User ended the conversation' },
    ],
  ),
]

// ─────────────────────────────────────────────────────────────────────────────
// State + Reducer
// ─────────────────────────────────────────────────────────────────────────────

type State = { playbooks: Playbook[] }

type Action =
  | { type: 'CREATE'; payload: Playbook }
  | { type: 'UPDATE'; payload: Playbook }
  | { type: 'DELETE'; payload: { id: string } }

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'CREATE':
      return { playbooks: [...state.playbooks, action.payload] }
    case 'UPDATE':
      return {
        playbooks: state.playbooks.map(p =>
          p.id === action.payload.id ? action.payload : p
        ),
      }
    case 'DELETE':
      return {
        playbooks: state.playbooks.filter(p => p.id !== action.payload.id),
      }
    default:
      return state
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Contexts
// ─────────────────────────────────────────────────────────────────────────────

const PlaybookStateContext   = createContext<State   | undefined>(undefined)
const PlaybookDispatchContext = createContext<React.Dispatch<Action> | undefined>(undefined)

// ─────────────────────────────────────────────────────────────────────────────
// Provider
// ─────────────────────────────────────────────────────────────────────────────

export function PlaybookProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, {
    playbooks: QUICKSTART_TEMPLATES,
  })

  return (
    <PlaybookStateContext.Provider value={state}>
      <PlaybookDispatchContext.Provider value={dispatch}>
        {children}
      </PlaybookDispatchContext.Provider>
    </PlaybookStateContext.Provider>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Hooks
// ─────────────────────────────────────────────────────────────────────────────

function usePlaybookState(): State {
  const ctx = useContext(PlaybookStateContext)
  if (!ctx) throw new Error('usePlaybookState must be used inside <PlaybookProvider>')
  return ctx
}

function usePlaybookDispatch(): React.Dispatch<Action> {
  const ctx = useContext(PlaybookDispatchContext)
  if (!ctx) throw new Error('usePlaybookDispatch must be used inside <PlaybookProvider>')
  return ctx
}

/** Read all playbooks */
export function usePlaybooks(): Playbook[] {
  return usePlaybookState().playbooks
}

/** Read a single playbook by id */
export function usePlaybook(id: string | null): Playbook | undefined {
  return usePlaybookState().playbooks.find(p => p.id === id)
}

/** Read only published playbooks — used by the Router */
export function usePublishedPlaybooks(): Playbook[] {
  return usePlaybookState().playbooks.filter(p => p.status === 'published')
}

/** CRUD helpers */
export function usePlaybookActions() {
  const dispatch = usePlaybookDispatch()

  const createPlaybook = useCallback((partial: Omit<Playbook, 'id' | 'createdAt' | 'updatedAt'>) => {
    const now = new Date().toISOString()
    const playbook: Playbook = {
      ...partial,
      id: `pb_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      createdAt: now,
      updatedAt: now,
    }
    dispatch({ type: 'CREATE', payload: playbook })
    return playbook
  }, [dispatch])

  const updatePlaybook = useCallback((playbook: Playbook) => {
    dispatch({ type: 'UPDATE', payload: { ...playbook, updatedAt: new Date().toISOString() } })
  }, [dispatch])

  const deletePlaybook = useCallback((id: string) => {
    dispatch({ type: 'DELETE', payload: { id } })
  }, [dispatch])

  return { createPlaybook, updatePlaybook, deletePlaybook }
}

/** Helper: blank playbook scaffold for "New Playbook" */
export function blankPlaybook(): Omit<Playbook, 'id' | 'createdAt' | 'updatedAt'> {
  return {
    title: 'Untitled Playbook',
    model: 'gpt-4o-mini',
    trigger: '',
    instructions: '',
    tools: DEFAULT_SYSTEM_TOOLS.map(t => ({ ...t })),
    exitConditions: [],
    status: 'draft',
  }
}
