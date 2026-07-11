// ─────────────────────────────────────────────────────────────────────────────
// Agent types — data-isolation architecture
// Each AgentConfig is a fully independent entity. Credentials are referenced
// by ID only — raw keys never live in client state.
// ─────────────────────────────────────────────────────────────────────────────

export type ModelId =
  | 'gpt-4o'
  | 'gpt-4o-mini'
  | 'claude-3-5-sonnet'
  | 'claude-3-5-haiku'
  | 'openrouter/custom'

// ─────────────────────────────────────────────────────────────────────────────
// Credentials — isolated per-agent, referenced not embedded
// ─────────────────────────────────────────────────────────────────────────────

export interface AgentCredential {
  id: string
  /** FK — enforces one credential is never shared across agents */
  agentId: string
  provider: ModelId
  /** Raw key NEVER lives in client state. Client only sees this masked form. */
  maskedKey: string
  createdAt: string
  lastRotatedAt?: string
}

// ─────────────────────────────────────────────────────────────────────────────
// Tools — scoped per-agent
// ─────────────────────────────────────────────────────────────────────────────

export type SystemToolId =
  | 'knowledge_base'
  | 'buttons'
  | 'cards'
  | 'carousels'
  | 'call_forward'
  | 'web_search'
  | 'end'
  | 'query_products_db'
  | 'response_example'

export const QUERY_PRODUCTS_DB_TOOL_SCHEMA = {
  name: 'query_products_db',
  description:
    'Searches the product catalog database by name, description, or features. ' +
    'Use this whenever the user asks about product availability, pricing, features, or stock — ' +
    'never guess or fabricate product details.',
  input_schema: {
    type: 'object',
    properties: {
      search_query: {
        type: 'string',
        description: 'Natural language search term, e.g. "wireless headphones under $100" or "blue running shoes"',
      },
      color: {
        type: 'string',
        description: 'Optional specific color requested by the user, e.g. "black", "red"',
      },
      size: {
        type: 'string',
        description: 'Optional specific size requested by the user, e.g. "S", "M", "L", "XL"',
      },
      category: {
        type: 'string',
        description: 'Optional product category, e.g. "chemise", "pull", "pantalon"',
      }
    },
    required: ['search_query'],
  },
} as const

export const SEARCH_KNOWLEDGE_BASE_TOOL_SCHEMA = {
  name: 'search_knowledge_base',
  description:
    'Searches the Knowledge Base for product information, FAQs, and store data using a semantic search query.',
  input_schema: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'Semantic search query, e.g. "black chemise size S" or "return policy"',
      },
    },
    required: ['query'],
  },
} as const

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
  /** Integration tools need connection-specific config. */
  config?: Record<string, unknown>
}

/**
 * EndToolConfig — special-cased because the End tool has mandatory safety
 * behavior that is NOT toggleable off. These fields are enforced at the
 * orchestrator level regardless of agent config.
 */
export interface EndToolConfig extends ToolConfig {
  id: 'end'
  config: {
    politeGoodbyeMessage: string
    abuseHandlingPolicy: 'block_and_log' | 'block_and_escalate'
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Knowledge base — agent-specific document store
// ─────────────────────────────────────────────────────────────────────────────

export interface KnowledgeBaseDocument {
  id: string
  /** FK — a document belongs to exactly one agent */
  agentId: string
  filename: string
  status: 'processing' | 'indexed' | 'error'
  uploadedAt: string
}

export interface KnowledgeBaseConfig {
  /** Drives the warning icon in the UI */
  isConfigured: boolean
  documents: KnowledgeBaseDocument[]
}

// ─────────────────────────────────────────────────────────────────────────────
// Exit Conditions — defines hand-off targets
// ─────────────────────────────────────────────────────────────────────────────

export interface ExitCondition {
  id: string
  /** Natural language: "If the user asks about billing, hand off to Agent Y" */
  description: string
  /** null = hand off to Orchestrator for re-routing */
  targetAgentId: string | null
}

// ─────────────────────────────────────────────────────────────────────────────
// THE CORE ENTITY — AgentConfig
// Lives in its own normalized collection, keyed by id.
// Never nested inside another agent or inside the canvas node.
// ─────────────────────────────────────────────────────────────────────────────

export interface AgentConfig {
  id: string
  title: string
  model: ModelId
  customModelId?: string

  /** FK into AgentCredential, 1:1, never shared. Null until set. */
  credentialId: string | null

  /**
   * Raw API key — write-only transient field.
   * Set by ApiKeyField so persistAgent can write it to Supabase.
   * Never read back from DB into client state (DB round-trip is server-side only).
   */
  apiKey?: string

  instructions: string

  tools: ToolConfig[]
  /** Owned exclusively by this agent — never shared. */
  knowledgeBase: KnowledgeBaseConfig
  response_examples?: { question: string; answer: string; buttons?: string[] }[]
  exitConditions: ExitCondition[]

  createdAt: string
  updatedAt: string
  status: 'draft' | 'published'
}

// ─────────────────────────────────────────────────────────────────────────────
// Canvas-side node — visual only, points at AgentConfig by id
// ─────────────────────────────────────────────────────────────────────────────

/**
 * AgentNodeData — the canvas representation.
 * It holds ONLY a reference (agentId FK) — never duplicates AgentConfig content.
 * This is the load-bearing isolation guarantee on the canvas side.
 */
export interface AgentNodeData {
  id: string
  type: 'agent'
  position: { x: number; y: number }
  /** FK into the AgentConfig collection */
  agentId: string
}

// ─────────────────────────────────────────────────────────────────────────────
// Orchestrator types
// ─────────────────────────────────────────────────────────────────────────────

export interface Message {
  role: 'user' | 'assistant'
  content: string
}

/**
 * HandoffSummary — transient orchestrator artifact.
 * Generated fresh per hand-off, never persisted into either AgentConfig.
 * Keeps it completely outside the isolation boundary.
 */
export interface HandoffSummary {
  id: string
  fromAgentId: string
  toAgentId: string
  /** AI-generated, short (~1-3 sentences) — never the raw transcript */
  summary: string
  exitConditionId: string
  createdAt: string
}

export interface OrchestratorContext {
  activeAgentId: string
  conversationHistory: Message[]
}
