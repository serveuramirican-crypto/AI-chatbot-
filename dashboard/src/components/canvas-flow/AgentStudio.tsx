"use client"

import React, { useState, useCallback, useEffect } from "react"
import {
  X,
  ChevronDown,
  Sparkles,
  AlertTriangle,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  BookOpen,
  MousePointerClick,
  CreditCard,
  LayoutGrid,
  Phone,
  Globe,
  Square,
  Key,
  Bot,
  Wand2,
  Check,
  RotateCcw,
  Upload,
  FileText,
  ShieldAlert,
  Search,
  Loader2,
  MessageSquare,
} from "lucide-react"
import {
  useAgent,
  useActiveAgentId,
  useAgentActions,
  useAgentList,
  useAgentCredentials,
  persistAgent,
} from "@/lib/agentStore"
import { supabase } from "@/lib/supabase"
import type {
  AgentConfig,
  ExitCondition,
  ToolConfig,
  EndToolConfig,
  ModelId,
  SystemToolId,
} from "@/types/agent"

// ─────────────────────────────────────────────────────────────────────────────
// Constants & Tool Definitions
// ─────────────────────────────────────────────────────────────────────────────

const MODEL_OPTIONS: { value: ModelId; label: string; provider: string }[] = [
  { value: 'gpt-4o', label: 'GPT-4o', provider: 'OpenAI' },
  { value: 'gpt-4o-mini', label: 'GPT-4o mini', provider: 'OpenAI' },
  { value: 'claude-3-5-sonnet', label: 'Claude 3.5 Sonnet', provider: 'Anthropic' },
  { value: 'claude-3-5-haiku', label: 'Claude 3.5 Haiku', provider: 'Anthropic' },
  { value: 'openrouter/custom', label: 'OpenRouter (Custom)', provider: 'OpenRouter' },
]

interface ToolDef {
  id: SystemToolId
  label: string
  icon: React.ReactNode
  trigger: string
}

const SYSTEM_TOOLS: ToolDef[] = [
  {
    id: 'knowledge_base',
    label: 'Knowledge base',
    icon: <BookOpen className="h-4 w-4" />,
    trigger:
      'Searches through uploaded documents to provide accurate, source-grounded answers. Activates when the user asks something that may be answered by stored files.',
  },
  {
    id: 'buttons',
    label: 'Buttons',
    icon: <MousePointerClick className="h-4 w-4" />,
    trigger:
      'Displays a UI picker when the user needs to select one option from a predefined list (up to 5 options).',
  },
  {
    id: 'cards',
    label: 'Cards',
    icon: <CreditCard className="h-4 w-4" />,
    trigger:
      'Renders a visually rich card with an image, title, subtitle, and action buttons for a single item (e.g. a product or service detail).',
  },
  {
    id: 'carousels',
    label: 'Carousels',
    icon: <LayoutGrid className="h-4 w-4" />,
    trigger:
      'Displays a horizontally scrollable row of cards for presenting multiple options side-by-side (e.g. product listings, plan comparisons).',
  },
  {
    id: 'call_forward',
    label: 'Call forward',
    icon: <Phone className="h-4 w-4" />,
    trigger:
      'Transfers the active conversation to a phone number or SIP endpoint. Fires when the agent determines a live human agent is required.',
  },
  {
    id: 'web_search',
    label: 'Web search',
    icon: <Globe className="h-4 w-4" />,
    trigger:
      'Runs a real-time web search and surfaces the top results to answer time-sensitive questions that fall outside the knowledge base.',
  },
  {
    id: 'end',
    label: 'End',
    icon: <Square className="h-4 w-4" />,
    trigger:
      'Gracefully closes the conversation with a polite goodbye message. Enforces mandatory safety and abuse handling before terminating — cannot be disabled.',
  },
  {
    id: 'query_products_db',
    label: 'Query Products DB',
    icon: <Search className="h-4 w-4" />,
    trigger:
      'Searches the product catalog database by name, description, or features. Use this whenever the user asks about product availability, pricing, features, or stock.',
  },
  {
    id: 'response_example',
    label: 'Response Example',
    icon: <Wand2 className="h-4 w-4" />,
    trigger: 'Injects predefined Question/Answer examples into the system prompt to enforce a specific response format (Few-Shot Prompting).',
  },
]

/** Factory: default trigger text per tool id (used for Reset) */
const DEFAULT_TRIGGER: Record<SystemToolId, string> = Object.fromEntries(
  SYSTEM_TOOLS.map((t) => [t.id, t.trigger])
) as Record<SystemToolId, string>

const INSTRUCTION_PRESETS: { label: string; instructions: string }[] = [
  {
    label: 'Customer Support',
    instructions: `You are a friendly and professional customer support agent.\n\nYour responsibilities:\n- Answer questions about products and services\n- Process refunds and complaints empathetically\n- Escalate complex issues to human agents\n- Always confirm you\u2019ve resolved the issue before ending\n\nBe concise, empathetic, and solution-focused.`,
  },
  {
    label: 'Appointment Booking',
    instructions: `You are an appointment scheduling assistant.\n\nYour responsibilities:\n- Help users book, reschedule, or cancel appointments\n- Collect: name, preferred date/time, reason for visit\n- Confirm availability and send a summary\n- Handle timezone differences gracefully\n\nAlways confirm details before finalizing.`,
  },
  {
    label: 'Info Collector',
    instructions: `You are a data collection assistant.\n\nYour responsibilities:\n- Collect specific information from the user as instructed\n- Ask one question at a time\n- Validate and confirm each piece of information\n- Summarize collected data at the end\n\nBe conversational and non-intrusive.`,
  },
  {
    label: 'Lead Qualification',
    instructions: `You are a sales qualification assistant.\n\nYour responsibilities:\n- Ask BANT questions: Budget, Authority, Need, Timeline\n- Determine if the prospect is a good fit\n- Schedule a follow-up call for qualified leads\n- Gracefully disengage unqualified prospects\n\nBe professional but friendly. Don\u2019t be pushy.`,
  },
]

// ─────────────────────────────────────────────────────────────────────────────
// TriggerBox — editable trigger description with Reset
// ─────────────────────────────────────────────────────────────────────────────

function TriggerBox({ text, onReset }: { text: string; onReset: () => void }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">
          Trigger
        </span>
        <button
          onClick={onReset}
          className="flex items-center gap-1 text-[10px] font-medium text-blue-500 transition hover:text-blue-700"
        >
          <RotateCcw className="h-2.5 w-2.5" />
          Reset
        </button>
      </div>
      <p className="text-xs leading-relaxed text-gray-600">{text}</p>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// SupabaseStatus — dynamic connection block
// ─────────────────────────────────────────────────────────────────────────────

function SupabaseStatus() {
  const [status, setStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking')

  const checkConnection = useCallback(async () => {
    setStatus('checking')
    try {
      // Basic health check to the 'agents' table (any simple query works)
      const { error } = await supabase.from('agents').select('id').limit(1)
      if (error && error.message.includes('Failed to fetch')) {
        setStatus('disconnected')
      } else {
        setStatus('connected')
      }
    } catch (e) {
      setStatus('disconnected')
    }
  }, [])

  useEffect(() => {
    checkConnection()
  }, [checkConnection])

  return (
    <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5">
      <div className="flex items-center gap-2.5">
        <div
          className={`h-2.5 w-2.5 rounded-full shadow-sm ${status === 'connected' ? 'bg-emerald-500' :
              status === 'disconnected' ? 'bg-red-500' :
                'bg-gray-400 animate-pulse'
            }`}
        />
        <span className="text-xs font-medium text-gray-700">
          {status === 'connected' ? 'Supabase Knowledge Base Connected' :
            status === 'disconnected' ? 'Supabase Knowledge Base Disconnected - Check Config' :
              'Checking Supabase Connection...'}
        </span>
      </div>
      {status === 'disconnected' && (
        <button
          onClick={checkConnection}
          className="rounded px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-blue-600 transition hover:bg-blue-100"
        >
          Retry
        </button>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// KnowledgeBaseConfigBox
// ─────────────────────────────────────────────────────────────────────────────

function KnowledgeBaseConfigBox({
  agent,
  onPatch,
  triggerText,
  onReset,
}: {
  agent: AgentConfig
  onPatch: (p: Partial<AgentConfig>) => void
  triggerText: string
  onReset: () => void
}) {
  const [availableSources, setAvailableSources] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showDropdown, setShowDropdown] = useState(false)

  useEffect(() => {
    async function fetchSources() {
      setLoading(true)
      const { data: sourcesData } = await supabase.from('knowledge_sources').select('*').order('created_at', { ascending: false })
      const { data: productsData } = await supabase.from('products').select('*').order('created_at', { ascending: false })
      
      let combined: any[] = sourcesData || []
      if (productsData) {
        const productSources = productsData.map((p: any) => ({
          id: p.id, type: 'product', source_path: `Product: ${p.name}`, status: p.status
        }))
        combined = [...combined, ...productSources]
      }
      setAvailableSources(combined.filter((s: any) => s.status === 'active'))
      setLoading(false)
    }
    fetchSources()
  }, [])

  const currentIds = agent.knowledgeBase.documents.map((d: any) => d.id)

  const handleSelect = (source: any) => {
    if (currentIds.includes(source.id)) return
    onPatch({
      knowledgeBase: {
        isConfigured: true,
        documents: [
          ...agent.knowledgeBase.documents,
          {
            id: source.id,
            agentId: agent.id,
            filename: source.source_path,
            status: 'indexed',
            uploadedAt: new Date().toISOString(),
          },
        ],
      },
    })
    setShowDropdown(false)
  }

  const handleRemove = (id: string) => {
    const newDocs = agent.knowledgeBase.documents.filter((d: any) => d.id !== id)
    onPatch({
      knowledgeBase: {
        isConfigured: newDocs.length > 0,
        documents: newDocs,
      }
    })
  }

  return (
    <div className="flex flex-col gap-3 h-full overflow-y-auto">
      <TriggerBox text={triggerText} onReset={onReset} />
      <SupabaseStatus />
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="flex items-center gap-1.5 text-xs font-semibold text-gray-600">
            <FileText className="h-3.5 w-3.5 text-blue-400" />
            Selected Data Sources
          </span>
          {!agent.knowledgeBase.isConfigured && (
            <div className="flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5">
              <AlertTriangle className="h-3 w-3 text-amber-500" />
              <span className="text-[10px] font-medium text-amber-600">Not configured</span>
            </div>
          )}
        </div>
        
        {agent.knowledgeBase.documents.length > 0 && (
          <div className="space-y-1.5 mb-3">
            {agent.knowledgeBase.documents.map((doc: any) => (
              <div
                key={doc.id}
                className="flex items-center justify-between gap-2 rounded-lg border border-gray-100 bg-gray-50 px-3 py-2"
              >
                <div className="flex items-center gap-2 overflow-hidden">
                  <BookOpen className="h-3.5 w-3.5 shrink-0 text-blue-400" />
                  <span className="truncate text-xs text-gray-700">{doc.filename}</span>
                </div>
                <button
                  onClick={() => handleRemove(doc.id)}
                  className="shrink-0 text-gray-400 hover:text-red-500 transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="relative">
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-blue-300 py-3 text-xs font-medium text-blue-500 transition hover:border-blue-400 hover:bg-blue-50"
          >
            <Plus className="h-4 w-4" />
            Select from Data Sources
          </button>
          
          {showDropdown && (
            <div className="absolute top-full mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto">
              {loading ? (
                <div className="p-3 text-center text-xs text-gray-500">Loading...</div>
              ) : availableSources.length === 0 ? (
                <div className="p-3 text-center text-xs text-gray-500">No active data sources found</div>
              ) : (
                <div className="py-1">
                  {availableSources.filter(s => !currentIds.includes(s.id)).map(source => (
                    <button
                      key={source.id}
                      onClick={() => handleSelect(source)}
                      className="w-full text-left px-3 py-2 text-xs hover:bg-blue-50 truncate"
                    >
                      {source.source_path}
                    </button>
                  ))}
                  {availableSources.filter(s => !currentIds.includes(s.id)).length === 0 && (
                    <div className="p-3 text-center text-xs text-gray-500">All sources selected</div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// CapabilityConfigBox — dynamic config area per selected tool
// ─────────────────────────────────────────────────────────────────────────────

function CapabilityConfigBox({
  toolId,
  toolDef,
  toolConfig,
  agent,
  apiNodes,
  onToolConfigChange,
  onReset,
  onPatch,
}: {
  toolId: string
  toolDef: ToolDef | undefined
  toolConfig: ToolConfig | undefined
  agent: AgentConfig
  apiNodes: ApiNodeData[]
  onToolConfigChange: (id: string, config: Record<string, unknown>) => void
  onReset: () => void
  onPatch: (p: Partial<AgentConfig>) => void
}) {
  const config = toolConfig?.config ?? {}

  // ── API Tool ────────────────────────────────────────────────────────
  if (toolConfig?.type === 'api') {
    const handleApiNodeSelect = (apiNodeId: string) => {
      const node = apiNodes.find(n => n.id === apiNodeId)
      if (node) {
        onToolConfigChange(toolId, {
          ...config,
          apiNodeId,
          apiConfig: {
            url: node.url,
            method: node.method,
            headers: node.headers,
            params: node.params,
            bodyVariables: node.body,
            timeout: node.timeout,
          }
        })
      }
    }

    return (
      <div className="flex flex-col gap-3 h-full">
        <div>
          <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-gray-500">
            API tool
          </label>
          <div className="relative">
            <select
              value={(config.apiNodeId as string) || ''}
              onChange={(e) => handleApiNodeSelect(e.target.value)}
              className="w-full appearance-none rounded-lg border border-gray-200 bg-white px-3 py-2 pl-8 text-sm text-gray-700 outline-none focus:border-blue-300 focus:ring-1 focus:ring-blue-300/20"
            >
              <option value="" disabled>Select an API to map</option>
              {apiNodes.map(node => (
                <option key={node.id} value={node.id}>{node.name || 'Untitled API'}</option>
              ))}
            </select>
            <Globe className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <ChevronDown className="absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
          <div className="flex items-start justify-between gap-2 mb-2">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">
              Trigger
            </span>
          </div>
          <textarea
            rows={3}
            value={(config.triggerOverride as string) || ''}
            onChange={(e) => onToolConfigChange(toolId, { ...config, triggerOverride: e.target.value })}
            placeholder="Describe when this tool should be used..."
            className="w-full resize-none text-xs leading-relaxed text-gray-600 outline-none"
          />
        </div>

        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <label className="flex items-center justify-between px-3 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100">
            <span className="text-xs font-medium text-gray-700">Capture response</span>
            <input
              type="checkbox"
              checked={(config.captureResponse as boolean) || false}
              onChange={(e) => onToolConfigChange(toolId, { ...config, captureResponse: e.target.checked })}
              className="h-4 w-4 rounded border-gray-300 text-blue-500 focus:ring-blue-500"
            />
          </label>
          <label className="flex items-center justify-between px-3 py-3 hover:bg-gray-50 cursor-pointer">
            <span className="text-xs font-medium text-gray-700">Async execution</span>
            <input
              type="checkbox"
              checked={(config.asyncExecution as boolean) || false}
              onChange={(e) => onToolConfigChange(toolId, { ...config, asyncExecution: e.target.checked })}
              className="h-4 w-4 rounded border-gray-300 text-blue-500 focus:ring-blue-500"
            />
          </label>
        </div>
      </div>
    )
  }

  // Fallback triggerText definition for standard tools
  const triggerText = (config.triggerOverride as string | undefined) ?? (toolDef?.trigger || '')
  const rawMessages = (config.messages as any[]) ?? []
  const messages: { role: 'user' | 'agent', content: string }[] = rawMessages.map(
    (m, i) => (typeof m === 'string' ? { role: i % 2 === 0 ? 'user' : 'agent', content: m } : m)
  )

  const setMessages = (msgs: { role: 'user' | 'agent', content: string }[]) =>
    onToolConfigChange(toolId, { ...config, messages: msgs })
  const addMessage = () => setMessages([...messages, { role: messages.length % 2 === 0 ? 'user' : 'agent', content: '' }])
  const editMessageContent = (i: number, v: string) =>
    setMessages(messages.map((m, j) => (j === i ? { ...m, content: v } : m)))
  const editMessageRole = (i: number, r: 'user' | 'agent') =>
    setMessages(messages.map((m, j) => (j === i ? { ...m, role: r } : m)))
  const removeMessage = (i: number) =>
    setMessages(messages.filter((_, j) => j !== i))

  // ── Knowledge base ────────────────────────────────────────────────────────
  if (toolId === 'knowledge_base') {
    return (
      <KnowledgeBaseConfigBox
        agent={agent}
        onPatch={onPatch}
        triggerText={triggerText}
        onReset={onReset}
      />
    )
  }

  // ── Call forward ─────────────────────────────────────────────────────────
  if (toolId === 'call_forward') {
    return (
      <div className="flex flex-col gap-3">
        <TriggerBox text={triggerText} onReset={onReset} />
        <div>
          <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-gray-500">
            Forward to number
          </label>
          <input
            type="tel"
            value={(config.phoneNumber as string) ?? ''}
            onChange={(e) =>
              onToolConfigChange('call_forward', { ...config, phoneNumber: e.target.value })
            }
            placeholder="+1 (555) 000-0000"
            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 outline-none focus:border-blue-300 focus:ring-1 focus:ring-blue-300/20"
          />
        </div>
        <div>
          <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-gray-500">
            Hold message
          </label>
          <input
            type="text"
            value={(config.holdMessage as string) ?? ''}
            onChange={(e) =>
              onToolConfigChange('call_forward', { ...config, holdMessage: e.target.value })
            }
            placeholder="Please hold while I connect you…"
            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 outline-none focus:border-blue-300 focus:ring-1 focus:ring-blue-300/20"
          />
        </div>
      </div>
    )
  }

  // ── Web search ──────────────────────────────────────────────────────────
  if (toolId === 'web_search') {
    return (
      <div className="flex flex-col gap-3">
        <TriggerBox text={triggerText} onReset={onReset} />
        <div>
          <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-gray-500">
            Max results
          </label>
          <select
            value={(config.maxResults as number) ?? 3}
            onChange={(e) =>
              onToolConfigChange('web_search', { ...config, maxResults: Number(e.target.value) })
            }
            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 outline-none focus:border-blue-300"
          >
            <option value={3}>3 results</option>
            <option value={5}>5 results</option>
            <option value={10}>10 results</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-gray-500">
            Allowed domains <span className="normal-case font-normal text-gray-400">(optional)</span>
          </label>
          <input
            type="text"
            value={(config.allowedDomains as string) ?? ''}
            onChange={(e) =>
              onToolConfigChange('web_search', { ...config, allowedDomains: e.target.value })
            }
            placeholder="e.g. docs.example.com, support.example.com"
            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 outline-none focus:border-blue-300 focus:ring-1 focus:ring-blue-300/20"
          />
          <p className="mt-1 text-[10px] text-gray-400">
            Comma-separated. Leave blank to search the open web.
          </p>
        </div>
      </div>
    )
  }

  // ── End tool ────────────────────────────────────────────────────────────
  if (toolId === 'end') {
    const endConfig = (toolConfig as EndToolConfig | undefined)?.config
    return (
      <div className="flex flex-col gap-3">
        <TriggerBox text={triggerText} onReset={onReset} />
        <div>
          <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-gray-500">
            Goodbye message
          </label>
          <textarea
            rows={3}
            value={endConfig?.politeGoodbyeMessage ?? 'Thanks for chatting — take care!'}
            onChange={(e) =>
              onToolConfigChange('end', { ...endConfig, politeGoodbyeMessage: e.target.value })
            }
            className="w-full resize-none rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 outline-none focus:border-blue-300 focus:ring-1 focus:ring-blue-300/20"
          />
        </div>
        <div>
          <label className="mb-1 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-gray-500">
            <ShieldAlert className="h-3 w-3 text-amber-500" />
            Abuse handling
          </label>
          <select
            value={endConfig?.abuseHandlingPolicy ?? 'block_and_log'}
            onChange={(e) =>
              onToolConfigChange('end', {
                ...endConfig,
                abuseHandlingPolicy: e.target.value as 'block_and_log' | 'block_and_escalate',
              })
            }
            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 outline-none focus:border-blue-300"
          >
            <option value="block_and_log">Block and log</option>
            <option value="block_and_escalate">Block and escalate</option>
          </select>
          <p className="mt-1 text-[10px] text-gray-400">
            Enforced at orchestrator level regardless of toggle state.
          </p>
        </div>
      </div>
    )
  }

  // ── Response Example ────────────────────────────────────────────────────
  if (toolId === 'response_example') {
    const pairs = (agent.response_examples as { question: string, answer: string, buttons?: string[] }[]) ?? []

    const setPairs = (newPairs: { question: string, answer: string, buttons?: string[] }[]) => {
      onPatch({ response_examples: newPairs })
    }

    const addPair = () => setPairs([...pairs, { question: '', answer: '', buttons: [] }])
    const updatePair = (i: number, field: 'question' | 'answer', val: string) => {
      setPairs(pairs.map((p, j) => j === i ? { ...p, [field]: val } : p))
    }
    const removePair = (i: number) => setPairs(pairs.filter((_, j) => j !== i))

    const addButton = (i: number) => {
      setPairs(pairs.map((p, j) => j === i ? { ...p, buttons: [...(p.buttons ?? []), ''] } : p))
    }
    const updateButton = (pairIdx: number, btnIdx: number, val: string) => {
      setPairs(pairs.map((p, j) => {
        if (j !== pairIdx) return p
        const btns = [...(p.buttons ?? [])]
        btns[btnIdx] = val
        return { ...p, buttons: btns }
      }))
    }
    const removeButton = (pairIdx: number, btnIdx: number) => {
      setPairs(pairs.map((p, j) =>
        j === pairIdx ? { ...p, buttons: (p.buttons ?? []).filter((_, k) => k !== btnIdx) } : p
      ))
    }

    return (
      <div className="flex flex-col gap-3 h-full">
        <TriggerBox text={triggerText} onReset={onReset} />

        <div className="flex-1 min-h-0 flex flex-col">
          <div className="flex items-center justify-between mb-2 shrink-0">
            <span className="flex items-center gap-1.5 text-xs font-semibold text-gray-600">
              <MessageSquare className="h-3.5 w-3.5 text-blue-400" />
              Examples (Q&A)
            </span>
            <button
              onClick={addPair}
              className="flex items-center gap-1 h-6 px-2 rounded-md border border-gray-200 text-[10px] font-medium text-gray-500 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600"
            >
              <Plus className="h-3 w-3" /> Add Example
            </button>
          </div>

          {pairs.length === 0 ? (
            <button
              onClick={addPair}
              className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-gray-200 py-5 text-xs text-gray-400 transition hover:border-blue-300 hover:text-blue-500 shrink-0"
            >
              <Plus className="h-3 w-3" />
              Add first example
            </button>
          ) : (
            <div className="space-y-3 overflow-y-auto flex-1 min-h-0 pr-1">
              {pairs.map((pair, idx) => (
                <div key={idx} className="flex flex-col gap-2 rounded-lg border border-gray-200 bg-gray-50 p-2.5">

                  {/* Header */}
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Example {idx + 1}</span>
                    <button
                      onClick={() => removePair(idx)}
                      className="shrink-0 rounded-md p-1 text-gray-400 transition hover:bg-red-100 hover:text-red-500"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {/* Question */}
                  <input
                    type="text"
                    value={pair.question}
                    onChange={(e) => updatePair(idx, 'question', e.target.value)}
                    placeholder="User Question"
                    className="w-full rounded-md border border-gray-200 bg-white px-2.5 py-1.5 text-xs text-gray-800 outline-none focus:border-blue-300 focus:ring-1 focus:ring-blue-300/20"
                  />

                  {/* Answer */}
                  <textarea
                    rows={2}
                    value={pair.answer}
                    onChange={(e) => updatePair(idx, 'answer', e.target.value)}
                    placeholder="Expected Assistant Answer"
                    className="w-full resize-none rounded-md border border-gray-200 bg-white px-2.5 py-1.5 text-xs text-gray-800 outline-none focus:border-blue-300 focus:ring-1 focus:ring-blue-300/20"
                  />

                  {/* Reply Buttons */}
                  <div className="flex flex-col gap-1.5 pt-1.5 border-t border-gray-200">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                        <MousePointerClick className="h-3 w-3" />
                        Reply Buttons
                      </span>
                      <button
                        onClick={() => addButton(idx)}
                        disabled={(pair.buttons ?? []).length >= 5}
                        className="flex items-center gap-0.5 text-[10px] font-medium text-blue-500 hover:text-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
                      >
                        <Plus className="h-2.5 w-2.5" /> Add
                      </button>
                    </div>

                    {(pair.buttons ?? []).length === 0 ? (
                      <p className="text-[10px] text-gray-400 italic">No buttons — click Add to create quick replies</p>
                    ) : (
                      <div className="space-y-1">
                        {(pair.buttons ?? []).map((btn, bIdx) => (
                          <div key={bIdx} className="flex items-center gap-1.5">
                            <div className="flex-1 flex items-center gap-1 rounded-md border border-blue-200 bg-blue-50 px-2 py-1">
                              <MousePointerClick className="h-3 w-3 shrink-0 text-blue-400" />
                              <input
                                type="text"
                                value={btn}
                                onChange={(e) => updateButton(idx, bIdx, e.target.value)}
                                placeholder={`Button ${bIdx + 1}`}
                                className="flex-1 bg-transparent text-xs text-blue-800 outline-none placeholder-blue-300"
                              />
                            </div>
                            <button
                              onClick={() => removeButton(idx, bIdx)}
                              className="shrink-0 rounded-md p-1 text-gray-400 hover:bg-red-100 hover:text-red-500 transition"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  // ── Default: Buttons / Cards / Carousels — Trigger + Messages ────────────
  return (
    <div className="flex flex-col gap-3 h-full">
      <TriggerBox text={triggerText} onReset={onReset} />

      <div className="flex-1 min-h-0">
        <div className="flex items-center justify-between mb-2">
          <span className="flex items-center gap-1.5 text-xs font-semibold text-gray-600">
            <MessageSquare className="h-3.5 w-3.5 text-blue-400" />
            Messages
          </span>
          <button
            onClick={addMessage}
            className="flex h-6 w-6 items-center justify-center rounded-md border border-gray-200 text-gray-500 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>

        {messages.length === 0 ? (
          <button
            onClick={addMessage}
            className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-gray-200 py-5 text-xs text-gray-400 transition hover:border-blue-300 hover:text-blue-500"
          >
            <Plus className="h-3 w-3" />
            Add first message
          </button>
        ) : (
          <div className="space-y-2 overflow-y-auto max-h-52">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex flex-col gap-1.5 rounded-lg border p-2 ${msg.role === 'user' ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'}`}>
                <div className="flex items-center justify-between">
                  <select
                    value={msg.role}
                    onChange={(e) => editMessageRole(idx, e.target.value as 'user' | 'agent')}
                    className="bg-transparent text-[10px] font-bold uppercase tracking-wider text-gray-600 outline-none cursor-pointer"
                  >
                    <option value="user">User</option>
                    <option value="agent">Agent</option>
                  </select>
                  <button
                    onClick={() => removeMessage(idx)}
                    className="shrink-0 rounded-md p-1 text-gray-400 transition hover:bg-red-100 hover:text-red-500"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                <textarea
                  rows={2}
                  value={msg.content || ''}
                  onChange={(e) => editMessageContent(idx, e.target.value)}
                  placeholder={`Message ${idx + 1}\u2026`}
                  className="w-full resize-none rounded-md border border-white/50 bg-white/60 px-2.5 py-1.5 text-xs text-gray-800 outline-none focus:border-blue-300 focus:bg-white focus:ring-1 focus:ring-blue-300/20"
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Header sub-components
// ─────────────────────────────────────────────────────────────────────────────

function ModelSelector({ value, onChange }: { value: ModelId; onChange: (v: ModelId) => void }) {
  const [open, setOpen] = useState(false)
  const current = MODEL_OPTIONS.find((m) => m.value === value)
  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm transition hover:border-gray-300 hover:bg-gray-50"
      >
        <Bot className="h-3.5 w-3.5 text-blue-500" />
        {current?.label ?? value}
        <ChevronDown className="h-3 w-3 text-gray-400" />
      </button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 w-48 rounded-xl border border-gray-100 bg-white py-1 shadow-xl">
          {MODEL_OPTIONS.map((m) => (
            <button
              key={m.value}
              onClick={() => { onChange(m.value); setOpen(false) }}
              className={`flex w-full items-center justify-between px-4 py-2 text-xs transition hover:bg-blue-50 ${m.value === value ? 'font-medium text-blue-600' : 'text-gray-700'
                }`}
            >
              <span>{m.label}</span>
              <span className="text-[10px] text-gray-400">{m.provider}</span>
              {m.value === value && <Check className="ml-1 h-3 w-3 shrink-0 text-blue-500" />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function ApiKeyField({
  agentId, credentialId, maskedKey, onUpsert,
}: {
  agentId: string
  credentialId: string | null
  maskedKey?: string
  onUpsert: (agentId: string, rawKey: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [raw, setRaw] = useState('')
  const [show, setShow] = useState(false)

  const handleSave = () => {
    if (raw.trim()) onUpsert(agentId, raw.trim())
    setEditing(false); setRaw('')
  }

  if (editing) {
    return (
      <div className="flex items-center gap-1.5">
        <div className="relative">
          <input
            autoFocus
            type={show ? 'text' : 'password'}
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') setEditing(false) }}
            placeholder="sk-\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022"
            className="w-40 rounded-lg border border-blue-300 bg-white px-2.5 py-1.5 pr-8 text-xs text-gray-800 outline-none ring-2 ring-blue-500/20"
          />
          <button onClick={() => setShow((s) => !s)} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
            {show ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
          </button>
        </div>
        <button onClick={handleSave} className="rounded-md bg-blue-500 px-2 py-1 text-[10px] font-medium text-white hover:bg-blue-600">Save</button>
        <button onClick={() => setEditing(false)} className="text-gray-400 hover:text-gray-600"><X className="h-3.5 w-3.5" /></button>
      </div>
    )
  }

  return (
    <button
      onClick={() => setEditing(true)}
      className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-600 shadow-sm transition hover:border-gray-300 hover:bg-gray-50"
    >
      <Key className="h-3 w-3 text-gray-400" />
      {credentialId ? (maskedKey ?? 'Key set') : 'Add API key'}
    </button>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Exit Condition Row
// ─────────────────────────────────────────────────────────────────────────────

function ExitConditionRow({
  condition, availableAgents, onChange, onDelete,
}: {
  condition: ExitCondition
  availableAgents: AgentConfig[]
  onChange: (updated: ExitCondition) => void
  onDelete: () => void
}) {
  return (
    <div className="flex items-start gap-2 rounded-xl border border-gray-100 bg-gray-50 p-3">
      <div className="flex-1 space-y-2">
        <input
          type="text"
          value={condition.description}
          onChange={(e) => onChange({ ...condition, description: e.target.value })}
          placeholder="e.g. If user asks about billing\u2026"
          className="w-full rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-800 outline-none focus:border-blue-300 focus:ring-1 focus:ring-blue-300/20"
        />
        <div className="flex items-center gap-2">
          <span className="shrink-0 text-xs text-gray-400">Hand off to</span>
          <select
            value={condition.targetAgentId ?? ''}
            onChange={(e) => onChange({ ...condition, targetAgentId: e.target.value || null })}
            className="flex-1 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs text-gray-700 outline-none focus:border-blue-300"
          >
            <option value="">Orchestrator (auto-route)</option>
            {availableAgents.map((a) => (
              <option key={a.id} value={a.id}>{a.title}</option>
            ))}
          </select>
        </div>
      </div>
      <button
        onClick={onDelete}
        className="mt-0.5 shrink-0 rounded-md p-1 text-gray-300 transition hover:bg-red-50 hover:text-red-400"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}

import { ApiNodeData } from './ApiNode'

// ─────────────────────────────────────────────────────────────────────────────
// AgentStudio — full-screen modal
// ─────────────────────────────────────────────────────────────────────────────

export default function AgentStudio({ apiNodes = [] }: { apiNodes?: ApiNodeData[] }) {
  const activeAgentId = useActiveAgentId()
  const agent = useAgent(activeAgentId)
  const allAgents = useAgentList()
  const credentials = useAgentCredentials()
  const { updateAgent, closeStudio, upsertCredential, deleteAgent } = useAgentActions()

  const [showPresets, setShowPresets] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  /**
   * Which capability is currently selected/open in the config box.
   * null = none — shows the placeholder.
   */
  const [selectedCapabilityId, setSelectedCapabilityId] = useState<string | null>(null)

  const patch = useCallback(
    (p: Partial<AgentConfig>) => { if (agent) updateAgent(agent.id, p) },
    [agent, updateAgent]
  )

  // ── Tool helpers — ALL hooks must be declared before any early return ─────
  const handleToolToggle = useCallback((toolId: string, enabled: boolean) => {
    if (!agent) return
    const hasTool = agent.tools.some((t) => t.id === toolId)
    const updatedTools = hasTool
      ? agent.tools.map((t) => (t.id === toolId ? { ...t, enabled } : t))
      : [...agent.tools, { id: toolId, enabled }]
    updateAgent(agent.id, { tools: updatedTools })
  }, [agent, updateAgent])

  const handleToolConfigChange = useCallback((toolId: string, config: Record<string, unknown>) => {
    if (!agent) return
    const hasTool = agent.tools.some((t) => t.id === toolId)
    const updatedTools = hasTool
      ? agent.tools.map((t) => (t.id === toolId ? { ...t, config } : t))
      : [...agent.tools, { id: toolId, enabled: true, config }]
    updateAgent(agent.id, { tools: updatedTools })
  }, [agent, updateAgent])

  const handleCapabilityClick = useCallback((toolId: string) =>
    setSelectedCapabilityId((prev) => (prev === toolId ? null : toolId))
    , [])

  const handleResetTrigger = useCallback((toolId: string) => {
    if (!agent) return
    const existing = agent.tools.find((t) => t.id === toolId)
    const hasTool = !!existing
    const defaultTrigger = (DEFAULT_TRIGGER as Record<string, string>)[toolId] ?? 'Describe when this tool should be used...'
    const updatedTools = hasTool
      ? agent.tools.map((t) =>
          t.id === toolId
            ? { ...t, config: { ...(existing?.config ?? {}), triggerOverride: defaultTrigger } }
            : t
        )
      : [...agent.tools, { id: toolId, enabled: true, config: { triggerOverride: defaultTrigger } }]
    updateAgent(agent.id, { tools: updatedTools })
  }, [agent, updateAgent])

  const handleRemoveIntegrationTool = useCallback((toolId: string) => {
    if (!agent) return
    if (selectedCapabilityId === toolId) setSelectedCapabilityId(null)
    updateAgent(agent.id, { tools: agent.tools.filter(t => t.id !== toolId) })
  }, [agent, updateAgent, selectedCapabilityId])

  const addExitCondition = useCallback(() => {
    if (!agent) return
    const id = `ec_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`
    updateAgent(agent.id, {
      exitConditions: [...agent.exitConditions, { id, description: '', targetAgentId: null }],
    })
  }, [agent, updateAgent])

  const updateExitCondition = useCallback((updated: ExitCondition) => {
    if (!agent) return
    updateAgent(agent.id, {
      exitConditions: agent.exitConditions.map((ec) => (ec.id === updated.id ? updated : ec)),
    })
  }, [agent, updateAgent])

  const deleteExitCondition = useCallback((id: string) => {
    if (!agent) return
    updateAgent(agent.id, {
      exitConditions: agent.exitConditions.filter((ec) => ec.id !== id),
    })
  }, [agent, updateAgent])

  const handleSaveKey = useCallback((_agentId: string, rawKey: string) => {
    if (!agent) return
    const credId = `cred_${agent.id}`
    const masked = rawKey.length > 8
      ? rawKey.slice(0, 3) + '\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022' + rawKey.slice(-4)
      : '\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022'
    upsertCredential({ id: credId, agentId: agent.id, provider: agent.model, maskedKey: masked, createdAt: new Date().toISOString() })
    // Also store the raw key transiently in agent state so persistAgent can write it to Supabase
    updateAgent(agent.id, { credentialId: credId, apiKey: rawKey })
  }, [agent, updateAgent, upsertCredential])

  // ── Guard: studio is hidden when no agent is active ───────────────────────
  if (!agent) return null

  // ── Derived values (safe — below guard) ───────────────────────────────────
  const credential = agent.credentialId ? credentials[agent.credentialId] : null
  const availableAgents = allAgents.filter((a) => a.id !== agent.id)

  const selectedToolConfig = selectedCapabilityId
    ? agent.tools.find((t) => t.id === selectedCapabilityId)
    : undefined

  const selectedToolDef = selectedToolConfig?.type === 'api'
    ? { id: selectedCapabilityId as any, label: 'API Tool', icon: <Globe className="h-4 w-4" />, trigger: '' }
    : SYSTEM_TOOLS.find((t) => t.id === selectedCapabilityId)

  const configBoxOpen = !!selectedCapabilityId

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-white"
      style={{ animation: 'agentStudioIn 200ms ease forwards' }}
    >
      {/* ── HEADER ────────────────────────────────────────────────────────────── */}
      <div className="flex shrink-0 items-center gap-3 border-b border-gray-100 bg-white px-6 py-3 shadow-sm">
        <div className="flex items-center gap-2 mr-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-500">
            <Bot className="h-4 w-4 text-white" />
          </div>
          <input
            type="text"
            value={agent.title}
            onChange={(e) => patch({ title: e.target.value })}
            className="w-48 rounded-md border border-transparent bg-transparent px-1.5 py-0.5 text-sm font-semibold text-gray-900 outline-none transition hover:border-gray-200 focus:border-blue-300 focus:ring-1 focus:ring-blue-300/20"
          />
        </div>
        <div className="ml-auto flex items-center gap-2">
          <ModelSelector value={agent.model} onChange={(model) => patch({ model })} />
          {agent.model === 'openrouter/custom' && (
            <input
              type="text"
              value={agent.customModelId ?? ''}
              onChange={(e) => patch({ customModelId: e.target.value })}
              placeholder="e.g., meta-llama/llama-3.1-8b-instruct"
              className="w-56 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-800 outline-none transition focus:border-blue-300 focus:ring-1 focus:ring-blue-300/20"
            />
          )}
          <ApiKeyField agentId={agent.id} credentialId={agent.credentialId} maskedKey={credential?.maskedKey} onUpsert={handleSaveKey} />

          <button
            onClick={async () => {
              setIsSaving(true)
              try {
                await persistAgent(agent)
              } catch (err) {
                console.error("Failed to save agent:", err)
              } finally {
                setTimeout(() => setIsSaving(false), 500)
              }
            }}
            disabled={isSaving}
            className="flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700 transition hover:bg-gray-200 disabled:opacity-50"
          >
            {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
            Save Settings
          </button>

          <button
            onClick={() => patch({ status: agent.status === 'draft' ? 'published' : 'draft' })}
            className={`rounded-full px-3 py-1 text-xs font-semibold transition ${agent.status === 'published'
                ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                : 'bg-amber-100 text-amber-700 hover:bg-amber-200'
              }`}
          >
            {agent.status === 'published' ? 'Published' : 'Draft'}
          </button>
          <button
            onClick={() => {
              if (window.confirm("Are you sure you want to delete this agent? This action cannot be undone.")) {
                deleteAgent(agent.id)
              }
            }}
            className="flex h-8 w-8 items-center justify-center rounded-full text-gray-400 transition hover:bg-red-50 hover:text-red-500"
            title="Delete Agent"
          >
            <Trash2 className="h-4 w-4" />
          </button>
          <button
            onClick={closeStudio}
            className="flex h-8 w-8 items-center justify-center rounded-full text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* ── BODY ──────────────────────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── LEFT — Instructions ─────────────────────────────────────────────── */}
        <div className="flex w-1/2 flex-col gap-4 overflow-y-auto border-r border-gray-100 p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-800">Instructions</h2>
            <div className="relative">
              <button
                onClick={() => setShowPresets((s) => !s)}
                className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-600 shadow-sm transition hover:border-gray-300 hover:bg-gray-50"
              >
                <Wand2 className="h-3 w-3 text-violet-500" />
                Auto-Generate
                <ChevronDown className="h-3 w-3 text-gray-400" />
              </button>
              {showPresets && (
                <div className="absolute right-0 top-full z-20 mt-1 w-52 rounded-xl border border-gray-100 bg-white py-1 shadow-xl">
                  {INSTRUCTION_PRESETS.map((p) => (
                    <button
                      key={p.label}
                      onClick={() => { patch({ instructions: p.instructions }); setShowPresets(false) }}
                      className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-gray-700 transition hover:bg-violet-50 hover:text-violet-700"
                    >
                      <Sparkles className="h-3.5 w-3.5 shrink-0 text-violet-400" />
                      {p.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {INSTRUCTION_PRESETS.map((p) => (
              <button
                key={p.label}
                onClick={() => patch({ instructions: p.instructions })}
                className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-medium text-gray-600 transition hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700"
              >
                {p.label}
              </button>
            ))}
          </div>

          <textarea
            value={agent.instructions}
            onChange={(e) => patch({ instructions: e.target.value })}
            placeholder="You are a helpful assistant that\u2026"
            className="flex-1 min-h-64 resize-none rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm leading-relaxed text-gray-800 outline-none transition focus:border-blue-300 focus:bg-white focus:ring-2 focus:ring-blue-300/20"
            style={{ fontFamily: 'ui-monospace, monospace', fontSize: '13px' }}
          />
        </div>

        {/* ── RIGHT — Capabilities (split: config box + tool list) ─────────────── */}
        <div className="flex w-1/2 overflow-hidden">

          {/* ── Config Box — slides in from the left when a tool is selected ──── */}
          <div
            className="overflow-y-auto border-r border-gray-100 bg-white transition-all duration-200 ease-in-out"
            style={{
              width: configBoxOpen ? '52%' : '0%',
              padding: configBoxOpen ? '20px' : '0px',
              opacity: configBoxOpen ? 1 : 0,
              pointerEvents: configBoxOpen ? 'auto' : 'none',
              overflow: configBoxOpen ? 'auto' : 'hidden',
            }}
          >
            {selectedCapabilityId && selectedToolDef && (
              <>
                <div className="mb-4 flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-500 shrink-0">
                    {selectedToolDef.icon}
                  </div>
                  <h3 className="text-sm font-semibold text-gray-800">{selectedToolDef.label}</h3>
                </div>

                <CapabilityConfigBox
                  toolId={selectedCapabilityId}
                  toolDef={selectedToolDef}
                  toolConfig={selectedToolConfig}
                  agent={agent}
                  apiNodes={apiNodes}
                  onToolConfigChange={handleToolConfigChange}
                  onReset={() => handleResetTrigger(selectedCapabilityId)}
                  onPatch={patch}
                />
              </>
            )}
          </div>

          {/* ── Tool List ─────────────────────────────────────────────────────── */}
          <div
            className="flex flex-col overflow-y-auto transition-all duration-200 ease-in-out bg-white"
            style={{ width: configBoxOpen ? '48%' : '100%' }}
          >
            <div className="px-4 pt-5 pb-2">
              <h2 className="text-sm font-semibold text-gray-800">Capabilities</h2>
              {!configBoxOpen && (
                <p className="mt-0.5 text-[11px] text-gray-400">
                  Click a capability name to configure it
                </p>
              )}
            </div>

            <div className="flex-1 px-2 pb-3">
              {SYSTEM_TOOLS.map((toolDef) => {
                const toolConfig = agent.tools.find((t) => t.id === toolDef.id)
                const enabled = toolConfig?.enabled ?? false
                const isActive = selectedCapabilityId === toolDef.id
                const showKbWarn =
                  toolDef.id === 'knowledge_base' &&
                  enabled &&
                  !agent.knowledgeBase.isConfigured

                return (
                  <div
                    key={toolDef.id}
                    onClick={() => handleCapabilityClick(toolDef.id)}
                    className={`
                      flex cursor-pointer select-none items-center gap-3 rounded-xl px-3 py-2.5
                      transition-all duration-150
                      ${isActive
                        ? 'bg-blue-500 shadow-sm'
                        : 'hover:bg-gray-50'}
                    `}
                  >
                    {/* Tool label — clicking the row selects it */}
                    <span
                      className={`flex-1 text-sm font-medium ${isActive
                          ? 'text-white'
                          : enabled
                            ? 'text-gray-800'
                            : 'text-gray-400'
                        }`}
                    >
                      {toolDef.label}
                    </span>

                    {/* KB warning icon when not configured */}
                    {showKbWarn && !isActive && (
                      <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-400" />
                    )}

                    {/* Toggle switch — stops propagation so it doesn't trigger row select */}
                    <button
                      role="switch"
                      aria-checked={enabled}
                      onClick={(e) => {
                        e.stopPropagation()
                        handleToolToggle(toolDef.id, !enabled)
                      }}
                      className={`
                        relative h-5 w-9 shrink-0 rounded-full transition-colors
                        ${enabled
                          ? isActive ? 'bg-white/30' : 'bg-blue-500'
                          : isActive ? 'bg-white/20' : 'bg-gray-200'}
                      `}
                    >
                      <span
                        className={`
                          absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform
                          ${enabled ? 'translate-x-4' : 'translate-x-0'}
                        `}
                      />
                    </button>
                  </div>
                )
              })}
            </div>

            {/* ── Custom Tools ─────────────────────────────────────────────────── */}
            <div className="px-4 pt-3 pb-2 flex items-center justify-between border-t border-gray-100">
              <div>
                <h2 className="text-sm font-semibold text-gray-800">Tools</h2>
                {!configBoxOpen && (
                  <p className="mt-0.5 text-[11px] text-gray-400">
                    Map custom actions and APIs
                  </p>
                )}
              </div>
              <button
                onClick={() => {
                  const id = `api_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`
                  const updatedTools = [
                    ...agent.tools,
                    { id, type: 'api', enabled: true, config: { triggerOverride: 'Use this tool when...' } }
                  ]
                  patch({ tools: updatedTools })
                  setSelectedCapabilityId(id)
                }}
                className="flex h-6 w-6 items-center justify-center rounded-md bg-gray-100 text-gray-500 transition hover:bg-gray-200 hover:text-gray-700 active:scale-95"
                title="Add API Tool"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="flex-1 px-2 pb-3">
              {agent.tools.filter(t => t.type === 'api').map((toolConfig) => {
                const isActive = selectedCapabilityId === toolConfig.id
                const enabled = toolConfig.enabled
                const nodeLabel = (toolConfig.config?.apiNodeId as string) 
                  ? apiNodes.find(n => n.id === toolConfig.config?.apiNodeId)?.name 
                  : 'Untitled API'

                return (
                  <div
                    key={toolConfig.id}
                    onClick={() => handleCapabilityClick(toolConfig.id)}
                    className={`
                      group flex cursor-pointer select-none items-center gap-3 rounded-xl px-3 py-2.5
                      transition-all duration-150 mb-1
                      ${isActive
                        ? 'bg-blue-500 shadow-sm'
                        : 'hover:bg-gray-50'}
                    `}
                  >
                    <Globe className={`h-4 w-4 shrink-0 ${isActive ? 'text-white/80' : 'text-gray-400'}`} />
                    <span
                      className={`flex-1 text-sm font-medium ${isActive
                          ? 'text-white'
                          : enabled
                            ? 'text-gray-800'
                            : 'text-gray-400'
                        }`}
                    >
                      {nodeLabel || 'API Tool'}
                    </span>

                    {!isActive && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleRemoveIntegrationTool(toolConfig.id)
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1 text-gray-300 hover:text-red-500 transition-all"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}

                    <button
                      role="switch"
                      aria-checked={enabled}
                      onClick={(e) => {
                        e.stopPropagation()
                        handleToolToggle(toolConfig.id, !enabled)
                      }}
                      className={`
                        relative h-5 w-9 shrink-0 rounded-full transition-colors
                        ${enabled
                          ? isActive ? 'bg-white/30' : 'bg-blue-500'
                          : isActive ? 'bg-white/20' : 'bg-gray-200'}
                      `}
                    >
                      <span
                        className={`
                          absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform
                          ${enabled ? 'translate-x-4' : 'translate-x-0'}
                        `}
                      />
                    </button>
                  </div>
                )
              })}
            </div>

            {/* Placeholder when nothing selected */}
            {!configBoxOpen && (
              <div className="mx-3 mb-4 flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-gray-100 py-7">
                <Search className="h-5 w-5 text-gray-200" />
                <p className="text-xs text-gray-400">Select a capability to configure</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── BOTTOM — Exit Conditions ──────────────────────────────────────────── */}
      <div className="shrink-0 border-t border-gray-100 bg-gray-50 px-6 py-4">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-gray-800">Exit Conditions</h2>
            <p className="text-xs text-gray-400">Define when this agent should hand off control</p>
          </div>
          <button
            onClick={addExitCondition}
            className="flex items-center gap-1.5 rounded-lg bg-blue-500 px-3 py-1.5 text-xs font-medium text-white shadow-sm transition hover:bg-blue-600 active:scale-95"
          >
            <Plus className="h-3.5 w-3.5" />
            Add condition
          </button>
        </div>
        {agent.exitConditions.length === 0 ? (
          <p className="text-xs italic text-gray-400">
            No exit conditions yet \u2014 add one to enable hand-offs to other agents.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {agent.exitConditions.map((ec) => (
              <ExitConditionRow
                key={ec.id}
                condition={ec}
                availableAgents={availableAgents}
                onChange={updateExitCondition}
                onDelete={() => deleteExitCondition(ec.id)}
              />
            ))}
          </div>
        )}
      </div>

      <style>{`
        @keyframes agentStudioIn {
          from { opacity: 0; transform: scale(0.98); }
          to   { opacity: 1; transform: scale(1);    }
        }
      `}</style>
    </div>
  )
}
