"use client"

import React, { useState, useCallback } from "react"
import {
  X,
  Sparkles,
  ChevronDown,
  Plus,
  Trash2,
  Zap,
  Globe,
  Database,
  MousePointerClick,
  LayoutGrid,
  CreditCard,
  Square,
  TriangleAlert,
  Link2,
  FunctionSquare,
  Server,
  Puzzle,
  ShoppingBag,
  Sheet,
  Mail,
  Table2,
  MessageSquare,
  Users,
  Phone,
  CheckCircle2,
} from "lucide-react"
import type {
  Playbook,
  ModelId,
  SystemToolId,
  IntegrationToolId,
  ExitCondition,
} from "@/types/playbook"
import { usePlaybookActions, blankPlaybook } from "@/lib/playbookStore"
import { QUICKSTART_TEMPLATES } from "@/lib/playbookStore"

// ── Constants ─────────────────────────────────────────────────────────────────

const MODEL_LABELS: Record<ModelId, string> = {
  'gpt-4o':             'GPT-4o',
  'gpt-4o-mini':        'GPT-4o mini',
  'claude-3-5-sonnet':  'Claude 3.5 Sonnet',
  'claude-3-5-haiku':   'Claude 3.5 Haiku',
}

const SYSTEM_TOOL_META: Record<SystemToolId, { label: string; icon: React.ReactNode }> = {
  knowledge_base: { label: 'Knowledge Base', icon: <Database className="h-3.5 w-3.5" /> },
  buttons:        { label: 'Buttons',         icon: <MousePointerClick className="h-3.5 w-3.5" /> },
  cards:          { label: 'Cards',           icon: <CreditCard className="h-3.5 w-3.5" /> },
  carousels:      { label: 'Carousels',       icon: <LayoutGrid className="h-3.5 w-3.5" /> },
  web_search:     { label: 'Web Search',      icon: <Globe className="h-3.5 w-3.5" /> },
  end:            { label: 'End',             icon: <Square className="h-3.5 w-3.5" /> },
}

const INTEGRATION_TOOL_META: Record<IntegrationToolId, { label: string; icon: React.ReactNode }> = {
  api:          { label: 'API',          icon: <Link2 className="h-4 w-4" /> },
  function:     { label: 'Function',     icon: <FunctionSquare className="h-4 w-4" /> },
  mcp:          { label: 'MCP',          icon: <Server className="h-4 w-4" /> },
  zendesk:      { label: 'Zendesk',      icon: <Puzzle className="h-4 w-4" /> },
  salesforce:   { label: 'Salesforce',   icon: <Users className="h-4 w-4" /> },
  shopify:      { label: 'Shopify',      icon: <ShoppingBag className="h-4 w-4" /> },
  google_sheets:{ label: 'Google Sheets',icon: <Sheet className="h-4 w-4" /> },
  gmail:        { label: 'Gmail',        icon: <Mail className="h-4 w-4" /> },
  airtable:     { label: 'Airtable',     icon: <Table2 className="h-4 w-4" /> },
  make:         { label: 'Make',         icon: <Zap className="h-4 w-4" /> },
  twilio:       { label: 'Twilio',       icon: <Phone className="h-4 w-4" /> },
  hubspot:      { label: 'HubSpot',      icon: <MessageSquare className="h-4 w-4" /> },
}

const SYSTEM_TOOL_IDS: SystemToolId[] = ['knowledge_base', 'buttons', 'cards', 'carousels', 'web_search', 'end']
const INTEGRATION_TOOL_IDS: IntegrationToolId[] = ['api', 'function', 'mcp', 'zendesk', 'salesforce', 'shopify', 'google_sheets', 'gmail', 'airtable', 'make', 'twilio', 'hubspot']

function generateId() {
  return `ec_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface PlaybookEditorProps {
  /** null = creating new */
  playbook: Playbook | null
  onClose: () => void
  /** Called after save with the saved playbook (for parent to refresh selection) */
  onSaved?: (saved: Playbook) => void
}

// ─────────────────────────────────────────────────────────────────────────────
// PlaybookEditor — top-level two-column layout
// ─────────────────────────────────────────────────────────────────────────────

export default function PlaybookEditor({ playbook, onClose, onSaved }: PlaybookEditorProps) {
  const { createPlaybook, updatePlaybook } = usePlaybookActions()

  const [draft, setDraft] = useState<Omit<Playbook, 'id' | 'createdAt' | 'updatedAt'>>(() =>
    playbook
      ? {
          title:          playbook.title,
          model:          playbook.model,
          trigger:        playbook.trigger,
          instructions:   playbook.instructions,
          tools:          playbook.tools.map(t => ({ ...t })),
          exitConditions: playbook.exitConditions.map(ec => ({ ...ec })),
          status:         playbook.status,
          isTemplate:     playbook.isTemplate,
        }
      : blankPlaybook()
  )

  const [modelOpen, setModelOpen] = useState(false)
  const [saved, setSaved] = useState(false)

  const update = useCallback(<K extends keyof typeof draft>(key: K, value: typeof draft[K]) => {
    setDraft(prev => ({ ...prev, [key]: value }))
    setSaved(false)
  }, [])

  const handleSave = useCallback(() => {
    let result: Playbook
    if (playbook) {
      result = { ...playbook, ...draft, updatedAt: new Date().toISOString() }
      updatePlaybook(result)
    } else {
      result = createPlaybook(draft)
    }
    setSaved(true)
    onSaved?.(result)
  }, [playbook, draft, createPlaybook, updatePlaybook, onSaved])

  const handlePublish = useCallback(() => {
    update('status', 'published')
    setTimeout(handleSave, 0)
  }, [update, handleSave])

  const applyTemplate = useCallback((tpl: Playbook) => {
    setDraft({
      title:          tpl.title,
      model:          tpl.model,
      trigger:        tpl.trigger,
      instructions:   tpl.instructions,
      tools:          tpl.tools.map(t => ({ ...t })),
      exitConditions: tpl.exitConditions.map(ec => ({ ...ec })),
      status:         'draft',
      isTemplate:     false,
    })
    setSaved(false)
  }, [])

  return (
    <div className="flex h-full flex-col bg-[#0f1117]">
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex shrink-0 items-center gap-3 border-b border-white/10 px-6 py-4">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-600/20">
          <Sparkles className="h-4 w-4 text-violet-400" />
        </div>

        {/* Inline editable title */}
        <input
          className="flex-1 bg-transparent text-lg font-semibold text-white outline-none placeholder-white/30 focus:underline"
          value={draft.title}
          onChange={e => update('title', e.target.value)}
          placeholder="Playbook title…"
        />

        {/* Model selector */}
        <div className="relative">
          <button
            onClick={() => setModelOpen(v => !v)}
            className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-white/70 hover:bg-white/10 transition"
          >
            {MODEL_LABELS[draft.model]}
            <ChevronDown className="h-3.5 w-3.5 opacity-60" />
          </button>
          {modelOpen && (
            <div className="absolute right-0 top-full z-40 mt-1 w-52 rounded-xl border border-white/10 bg-[#1c1f28] py-1 shadow-2xl">
              {(Object.keys(MODEL_LABELS) as ModelId[]).map(m => (
                <button
                  key={m}
                  onClick={() => { update('model', m); setModelOpen(false) }}
                  className={`flex w-full items-center justify-between px-4 py-2 text-sm transition hover:bg-white/5 ${draft.model === m ? 'text-violet-400 font-semibold' : 'text-white/70'}`}
                >
                  {MODEL_LABELS[m]}
                  {draft.model === m && <CheckCircle2 className="h-3.5 w-3.5 text-violet-400" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <button
          onClick={handleSave}
          className="rounded-lg border border-white/15 bg-white/8 px-4 py-1.5 text-xs font-medium text-white/70 transition hover:bg-white/15"
        >
          {saved ? '✓ Saved' : 'Save draft'}
        </button>
        <button
          onClick={handlePublish}
          className="rounded-lg bg-violet-600 px-4 py-1.5 text-xs font-semibold text-white shadow transition hover:bg-violet-500"
        >
          Publish
        </button>
        <button onClick={onClose} className="ml-2 text-white/40 hover:text-white transition">
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* ── Body ────────────────────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">
        {/* LEFT — Logic panel */}
        <div className="flex w-[55%] flex-col gap-5 overflow-y-auto border-r border-white/8 p-6">
          <PlaybookLogicPanel
            trigger={draft.trigger}
            instructions={draft.instructions}
            onTriggerChange={v => update('trigger', v)}
            onInstructionsChange={v => update('instructions', v)}
            onApplyTemplate={applyTemplate}
          />
        </div>

        {/* RIGHT — Capabilities panel */}
        <div className="flex w-[45%] flex-col gap-5 overflow-y-auto p-6">
          <PlaybookCapabilitiesPanel
            tools={draft.tools}
            exitConditions={draft.exitConditions}
            onToolToggle={(toolId, enabled) =>
              update('tools', draft.tools.map(t => t.id === toolId ? { ...t, enabled } : t))
            }
            onExitConditionsChange={ec => update('exitConditions', ec)}
          />
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// PlaybookLogicPanel (left side)
// ─────────────────────────────────────────────────────────────────────────────

function PlaybookLogicPanel({
  trigger, instructions,
  onTriggerChange, onInstructionsChange,
  onApplyTemplate,
}: {
  trigger: string
  instructions: string
  onTriggerChange: (v: string) => void
  onInstructionsChange: (v: string) => void
  onApplyTemplate: (tpl: Playbook) => void
}) {
  return (
    <>
      {/* Trigger */}
      <div>
        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-white/40">
          Trigger
        </label>
        <input
          className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-white/25 outline-none focus:border-violet-500/60 focus:ring-2 focus:ring-violet-500/15 transition"
          placeholder="Describe when this playbook should be used…"
          value={trigger}
          onChange={e => onTriggerChange(e.target.value)}
        />
      </div>

      {/* Instructions */}
      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <label className="text-xs font-semibold uppercase tracking-wider text-white/40">
            Instructions
          </label>
          <button
            title="Auto-generate instructions from trigger (stub)"
            onClick={() => {
              if (!trigger) return
              onInstructionsChange(`You are a helpful assistant handling: "${trigger}".\n\nBe concise, professional, and empathetic. Gather any information needed before taking action.`)
            }}
            className="flex items-center gap-1.5 rounded-lg bg-violet-600/20 px-2.5 py-1 text-xs font-medium text-violet-400 transition hover:bg-violet-600/35"
          >
            <Sparkles className="h-3 w-3" />
            Generate
          </button>
        </div>
        <textarea
          className="w-full min-h-[180px] rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/25 outline-none focus:border-violet-500/60 focus:ring-2 focus:ring-violet-500/15 transition resize-y font-mono leading-relaxed"
          placeholder="Enter playbook instructions, or generate…"
          value={instructions}
          onChange={e => onInstructionsChange(e.target.value)}
        />
      </div>

      {/* Quickstart templates */}
      <div>
        <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-white/40">
          Quickstart Templates
        </label>
        <div className="flex flex-col gap-2">
          {QUICKSTART_TEMPLATES.map(tpl => (
            <button
              key={tpl.id}
              onClick={() => onApplyTemplate(tpl)}
              className="flex w-full items-start gap-3 rounded-xl border border-white/8 bg-white/4 px-4 py-3 text-left transition hover:border-violet-500/40 hover:bg-violet-500/8 group"
            >
              <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-violet-500/60 group-hover:text-violet-400 transition" />
              <div>
                <p className="text-xs font-semibold text-white/75 group-hover:text-white transition">{tpl.title}</p>
                <p className="mt-0.5 text-xs text-white/35 line-clamp-1">{tpl.trigger}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// PlaybookCapabilitiesPanel (right side)
// ─────────────────────────────────────────────────────────────────────────────

function PlaybookCapabilitiesPanel({
  tools, exitConditions,
  onToolToggle, onExitConditionsChange,
}: {
  tools: Playbook['tools']
  exitConditions: ExitCondition[]
  onToolToggle: (id: string, enabled: boolean) => void
  onExitConditionsChange: (ec: ExitCondition[]) => void
}) {
  const systemTools      = tools.filter(t => (SYSTEM_TOOL_IDS as string[]).includes(t.id))
  const integrationTools = tools.filter(t => (INTEGRATION_TOOL_IDS as string[]).includes(t.id))

  const addExitCondition = () => {
    onExitConditionsChange([
      ...exitConditions,
      { id: generateId(), description: '' },
    ])
  }

  const updateExitCondition = (id: string, description: string) => {
    onExitConditionsChange(
      exitConditions.map(ec => ec.id === id ? { ...ec, description } : ec)
    )
  }

  const deleteExitCondition = (id: string) => {
    onExitConditionsChange(exitConditions.filter(ec => ec.id !== id))
  }

  return (
    <>
      {/* Integration tools grid */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <label className="text-xs font-semibold uppercase tracking-wider text-white/40">Tools</label>
          <button className="flex items-center gap-1 text-xs text-violet-400 hover:text-violet-300 transition">
            <Plus className="h-3 w-3" /> Add tool
          </button>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {INTEGRATION_TOOL_IDS.map(toolId => {
            const toolState = integrationTools.find(t => t.id === toolId)
            const enabled   = toolState?.enabled ?? false
            const meta      = INTEGRATION_TOOL_META[toolId]
            return (
              <button
                key={toolId}
                onClick={() => onToolToggle(toolId, !enabled)}
                className={`
                  flex flex-col items-center gap-1.5 rounded-xl border px-2 py-3 text-center text-xs transition
                  ${enabled
                    ? 'border-violet-500/60 bg-violet-500/12 text-violet-300'
                    : 'border-white/8 bg-white/4 text-white/35 hover:border-white/20 hover:text-white/60'}
                `}
              >
                {meta.icon}
                <span className="text-[10px] leading-tight">{meta.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* System tools */}
      <div>
        <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-white/40">
          System Tools
        </label>
        <div className="flex flex-col gap-1.5">
          {SYSTEM_TOOL_IDS.map(toolId => {
            const toolState = systemTools.find(t => t.id === toolId)
            const enabled   = toolState?.enabled ?? false
            const meta      = SYSTEM_TOOL_META[toolId]
            const isKB      = toolId === 'knowledge_base'
            const kbWarning = isKB && !enabled
            return (
              <div
                key={toolId}
                className="flex items-center justify-between rounded-xl border border-white/8 bg-white/4 px-3 py-2.5"
              >
                <div className="flex items-center gap-2.5">
                  <span className={enabled ? 'text-violet-400' : 'text-white/35'}>{meta.icon}</span>
                  <span className={`text-xs font-medium ${enabled ? 'text-white/80' : 'text-white/40'}`}>
                    {meta.label}
                  </span>
                  {kbWarning && (
                    <span title="No knowledge base connected">
                      <TriangleAlert className="h-3 w-3 text-amber-400" />
                    </span>
                  )}
                </div>
                <Toggle enabled={enabled} onToggle={() => onToolToggle(toolId, !enabled)} />
              </div>
            )
          })}
        </div>
      </div>

      {/* Exit conditions */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <label className="text-xs font-semibold uppercase tracking-wider text-white/40">
            Exit Conditions
          </label>
          <button
            onClick={addExitCondition}
            className="flex items-center gap-1 text-xs text-violet-400 hover:text-violet-300 transition"
          >
            <Plus className="h-3 w-3" /> Add
          </button>
        </div>
        {exitConditions.length === 0 && (
          <p className="text-xs text-white/25 italic">
            No exit conditions — Router will re-evaluate globally when the playbook ends.
          </p>
        )}
        <div className="flex flex-col gap-2">
          {exitConditions.map((ec, idx) => (
            <div key={ec.id} className="flex items-center gap-2">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-violet-600/20 text-[10px] font-bold text-violet-400">
                {idx + 1}
              </span>
              <input
                className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-white placeholder-white/25 outline-none focus:border-violet-500/60 transition"
                placeholder='e.g. "User asks to speak to a human"'
                value={ec.description}
                onChange={e => updateExitCondition(ec.id, e.target.value)}
              />
              <button
                onClick={() => deleteExitCondition(ec.id)}
                className="text-white/25 hover:text-red-400 transition"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Toggle switch
// ─────────────────────────────────────────────────────────────────────────────

function Toggle({ enabled, onToggle }: { enabled: boolean; onToggle: () => void }) {
  return (
    <button
      role="switch"
      aria-checked={enabled}
      onClick={onToggle}
      className={`
        relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200
        ${enabled ? 'bg-violet-600' : 'bg-white/15'}
      `}
    >
      <span
        className={`
          inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform duration-200
          ${enabled ? 'translate-x-4.5' : 'translate-x-0.5'}
        `}
        style={{ transform: enabled ? 'translateX(18px)' : 'translateX(2px)' }}
      />
    </button>
  )
}
