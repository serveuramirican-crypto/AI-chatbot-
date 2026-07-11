// ─────────────────────────────────────────────────────────────────────────────
// Core Playbook entity — lives in its own collection,
// independent of any single CanvasFlow document.
// ─────────────────────────────────────────────────────────────────────────────

export type ModelId =
  | 'gpt-4o'
  | 'gpt-4o-mini'
  | 'claude-3-5-sonnet'
  | 'claude-3-5-haiku'

export type SystemToolId =
  | 'knowledge_base'
  | 'buttons'
  | 'cards'
  | 'carousels'
  | 'web_search'
  | 'end'

export type IntegrationToolId =
  | 'api'
  | 'function'
  | 'mcp'
  | 'zendesk'
  | 'salesforce'
  | 'shopify'
  | 'google_sheets'
  | 'gmail'
  | 'airtable'
  | 'make'
  | 'twilio'
  | 'hubspot'

export interface ToolConfig {
  id: SystemToolId | IntegrationToolId
  enabled: boolean
  /** Integration tools need connection-specific config (API keys, scopes, etc.).
   *  System tools (buttons, cards…) usually just need the boolean. */
  config?: Record<string, unknown>
}

export interface ExitCondition {
  id: string
  description: string // natural language, e.g. "User asks to speak to a human"
  /** Optional: where control goes when this fires.
   *  If omitted, falls back to the Router for full re-evaluation. */
  fallbackTargetId?: string // playbookId OR canvas nodeId
}

export interface Playbook {
  id: string
  title: string
  model: ModelId
  /** NL routing description, read by the Router */
  trigger: string
  /** System prompt / policy for this playbook */
  instructions: string
  tools: ToolConfig[]
  exitConditions: ExitCondition[]

  // Metadata
  createdAt: string
  updatedAt: string
  /** true for the "Quickstart" presets */
  isTemplate?: boolean
  status: 'draft' | 'published'
}

// ─────────────────────────────────────────────────────────────────────────────
// Canvas-side reference node — the "droppable" half.
// Sits in the existing `nodes` array; does NOT duplicate playbook content.
// ─────────────────────────────────────────────────────────────────────────────

export interface PlaybookReferenceNodeData {
  id: string
  type: 'playbook_reference'
  position: { x: number; y: number }
  /** FK into the Playbook collection */
  playbookId: string
  /** Per-instance override: lets one canvas reuse a playbook with a tweak
   *  without forking the whole playbook. */
  triggerOverride?: string
}

// ─────────────────────────────────────────────────────────────────────────────
// Router types
// ─────────────────────────────────────────────────────────────────────────────

export interface Message {
  role: 'user' | 'assistant'
  content: string
}

export interface RouterContext {
  currentLocation:
    | { type: 'canvas_node'; flowId: string; nodeId: string }
    | { type: 'playbook'; playbookId: string }
    | { type: 'unset' }
  conversationHistory: Message[]
}

export type RoutingDecision =
  | { type: 'continue_canvas'; nodeId: string }
  | { type: 'continue_playbook'; playbookId: string }
  | { type: 'exit_playbook'; exitConditionId: string }
  | { type: 'enter_playbook'; playbookId: string }
  | { type: 'no_match'; fallback: string }
