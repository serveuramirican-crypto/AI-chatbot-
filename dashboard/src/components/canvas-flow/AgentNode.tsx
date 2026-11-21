"use client"

import React, { useState, useRef, useEffect } from "react"
import { Bot, AlertTriangle, Pencil, ChevronDown, Check, Loader2, X } from "lucide-react"
import ConnectorHandle from "./ConnectorHandle"
import { useAgent, useAgentActions, useAgentList, useAgentBootstrapped } from "@/lib/agentStore"
import type { AgentNodeData } from "@/types/agent"

// ── Layout constants (exported for CanvasEdges.tsx consumption) ───────────────

/** Width of the agent node card */
export const AG_NODE_WIDTH         = 268
/** Height of the header bar */
export const AG_NODE_HEADER_H      = 40
/** Height of the body section (Edit Agent button) */
export const AG_NODE_BODY_H        = 52
/** Each exit-condition row height */
export const AG_EXIT_ROW_H         = 36
/** Gap between exit-condition rows */
export const AG_EXIT_ROW_GAP       = 4
/** Bottom padding when exit conditions are present */
export const AG_PADDING_BOTTOM     = 8
/** Right-side handle offset beyond card edge */
export const AG_HANDLE_OFFSET      = 10

interface AgentNodeProps {
  id: string
  agentId: string
  isActive?: boolean
  onClick?: (e: React.MouseEvent) => void
  onPortMouseDown?: (e: React.MouseEvent, handleId?: string) => void
  onPortClick?: (e: React.MouseEvent, handleId?: string) => void
  connectedHandles?: Set<string>
  hasIncoming?: boolean
  /** Called when user selects a different agent from the picker */
  onAgentSelect?: (agentId: string) => void
  /** Called when user clicks the delete button on the node */
  onDelete?: (id: string) => void
}

/**
 * AgentNode — canvas representation of an autonomous AI Agent.
 *
 * Input port:  left side (parent wrapper handles onMouseUp → handleConnectionEnd)
 * Output ports: one per exit condition — same ConnectorHandle pattern as PlaybookReferenceNode.
 *
 * When no valid agent is linked (agentId is empty or not found in the store),
 * renders a friendly amber picker instead of a red error card.
 */
export default function AgentNode({
  id: _id,
  agentId,
  isActive = false,
  onClick,
  onPortMouseDown,
  onPortClick,
  connectedHandles = new Set(),
  onAgentSelect,
  onDelete,
  hasIncoming = false,
}: AgentNodeProps) {
  const agent       = useAgent(agentId)
  const agentList    = useAgentList()
  const bootstrapped = useAgentBootstrapped()
  const { openStudio, createAgent } = useAgentActions()

  const [pickerOpen, setPickerOpen]   = useState(false)
  const pickerRef                     = useRef<HTMLDivElement>(null)

  // Close picker on outside click
  useEffect(() => {
    if (!pickerOpen) return
    const handler = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setPickerOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [pickerOpen])

  // ── No agent linked or agent not found in store ─────────────────────────────
  if (!agent) {
    const isLoading = !bootstrapped // store still fetching from Supabase

    return (
      <div className="relative flex items-start select-none" ref={pickerRef}>
        <div
          onClick={(e) => { e.stopPropagation(); onClick?.(e) }}
          style={{ width: AG_NODE_WIDTH }}
          className={`
            rounded-2xl bg-white shadow-[0_10px_25px_-5px_rgba(0,0,0,0.1),0_8px_10px_-6px_rgba(0,0,0,0.05)]
            border transition-all duration-200 cursor-pointer overflow-hidden
            ${isActive
              ? 'border-amber-500 ring-4 ring-amber-500/20 shadow-[0_0_25px_rgba(245,158,11,0.25)]'
              : 'border-amber-200 hover:border-amber-400'}
          `}
        >
          {/* Warning header */}
          <div
            className="flex items-center gap-2 border-b border-amber-100 bg-gradient-to-r from-amber-50 to-amber-100/60 px-3.5"
            style={{ height: AG_NODE_HEADER_H }}
          >
            <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-amber-500 text-white shadow-xs">
              <Bot className="h-3 w-3" />
            </div>
            <span className="flex-1 truncate text-xs font-bold text-amber-950 tracking-tight">
              AI Agent
            </span>
            {isLoading ? (
              <Loader2 className="h-3.5 w-3.5 text-amber-500 animate-spin" />
            ) : (
              <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0" />
            )}
            {onDelete && (
              <button
                title="Remove Agent Node"
                onClick={(e) => { e.stopPropagation(); onDelete(_id) }}
                className="ml-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-amber-600 hover:bg-amber-200 hover:text-amber-800 transition"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Picker body */}
          <div
            className="flex flex-col items-center justify-center gap-1.5 px-3 py-2"
            style={{ minHeight: AG_NODE_BODY_H }}
          >
            {isLoading ? (
              <span className="text-[11px] text-amber-600 italic">Loading agents...</span>
            ) : (
              <button
                onClick={(e) => { e.stopPropagation(); setPickerOpen(v => !v) }}
                className="flex w-full items-center justify-between gap-1.5 rounded-xl border border-amber-300 bg-amber-50/80 px-3 py-1.5 text-xs font-semibold text-amber-800 transition hover:bg-amber-100 hover:border-amber-400 active:scale-95 shadow-xs"
              >
                <span>Select an Agent</span>
                <ChevronDown className={`h-3.5 w-3.5 transition-transform ${pickerOpen ? 'rotate-180' : ''}`} />
              </button>
            )}
          </div>
        </div>

        {/* Dropdown list */}
        {pickerOpen && (
          <div
            className="absolute left-0 z-50 mt-1 w-68 rounded-2xl border border-amber-200 bg-white shadow-2xl overflow-hidden divide-y divide-amber-100"
            style={{ top: AG_NODE_HEADER_H + AG_NODE_BODY_H }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            {agentList.length === 0 ? (
              <div className="px-4 py-3 text-xs text-gray-400 italic text-center">
                No agents in your workspace yet.
              </div>
            ) : (
              <ul className="max-h-52 overflow-y-auto py-1">
                {agentList.map(a => (
                  <li key={a.id}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onAgentSelect?.(a.id)
                        setPickerOpen(false)
                      }}
                      className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-xs transition hover:bg-amber-50"
                    >
                      <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-blue-500 text-white">
                        <Bot className="h-3 w-3" />
                      </div>
                      <span className="flex-1 truncate font-medium text-gray-800">{a.title}</span>
                      <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide ${
                        a.status === 'published'
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}>
                        {a.status}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <div className="p-1.5 bg-amber-50/50">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  const newId = createAgent({ title: 'Untitled Agent' })
                  onAgentSelect?.(newId)
                  setPickerOpen(false)
                  openStudio(newId)
                }}
                className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs transition active:scale-95"
              >
                + Create new agent
              </button>
            </div>
          </div>
        )}

        {/* Single default output port at mid-body */}
        <ConnectorHandle
          color="amber"
          topOffset={AG_NODE_HEADER_H + AG_NODE_BODY_H / 2}
          connected={connectedHandles.size > 0}
          onMouseDown={onPortMouseDown ?? ((e) => e.preventDefault())}
          onClick={onPortClick ?? ((e) => e.preventDefault())}
        />
        
        {/* Left input port (target handle) */}
        <ConnectorHandle
          isTarget
          color="amber"
          topOffset={AG_NODE_HEADER_H + AG_NODE_BODY_H / 2}
          connected={hasIncoming}
          onMouseDown={() => {}}
          onClick={() => {}}
        />
      </div>
    )
  }

  // ── Valid agent found ───────────────────────────────────────────────────────
  const hasExits    = agent.exitConditions.length > 0
  const statusColor =
    agent.status === 'published'
      ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
      : 'bg-amber-100 text-amber-700 border border-amber-200'

  return (
    <div className="relative flex items-start select-none group">
      {/* ── Card ──────────────────────────────────────────────────────────── */}
      <div
        onClick={onClick}
        style={{ width: AG_NODE_WIDTH }}
        className={`
          rounded-2xl bg-white shadow-[0_10px_25px_-5px_rgba(0,0,0,0.1),0_8px_10px_-6px_rgba(0,0,0,0.05)]
          border transition-all duration-200 cursor-pointer overflow-hidden
          hover:shadow-[0_16px_32px_-6px_rgba(0,0,0,0.15)]
          ${isActive
            ? 'border-blue-500 ring-4 ring-blue-500/20 shadow-[0_0_25px_rgba(59,130,246,0.25)]'
            : 'border-slate-200/90 hover:border-blue-300'}
        `}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between border-b border-slate-100 bg-gradient-to-r from-blue-50/70 to-indigo-50/50 px-3.5"
          style={{ height: AG_NODE_HEADER_H }}
        >
          <div className="flex items-center gap-2 min-w-0">
            <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-blue-600 text-white shadow-xs">
              <Bot className="h-3 w-3" />
            </div>
            <span className="truncate text-xs font-bold text-slate-800 tracking-tight">
              {agent.title || 'Untitled Agent'}
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <span
              className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${statusColor}`}
            >
              {agent.status}
            </span>

            {/* Swap agent button */}
            {onAgentSelect && (
              <button
                title="Change agent"
                onClick={(e) => { e.stopPropagation(); setPickerOpen(v => !v) }}
                className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
              >
                <ChevronDown className={`h-3 w-3 transition-transform ${pickerOpen ? 'rotate-180' : ''}`} />
              </button>
            )}

            {/* Delete node button */}
            {onDelete && (
              <button
                title="Remove Agent Node"
                onClick={(e) => { e.stopPropagation(); onDelete(_id) }}
                className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-slate-400 hover:bg-red-50 hover:text-red-600 transition"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>

        {/* Body — Edit Agent button */}
        <div
          className="p-3 flex items-center"
          style={{ height: AG_NODE_BODY_H }}
        >
          <button
            onClick={(e) => {
              e.stopPropagation()
              openStudio(agentId)
            }}
            className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50/70 hover:bg-blue-100/80 px-3 py-2 text-xs font-semibold text-blue-700 transition hover:border-blue-300 active:scale-98 shadow-xs"
          >
            <Pencil className="h-3.5 w-3.5 text-blue-600" />
            Edit Agent
          </button>
        </div>

        {/* Exit conditions list */}
        {hasExits && (
          <div className="flex flex-col gap-1.5 px-3 pb-3">
            {agent.exitConditions.map((ec) => (
              <div
                key={ec.id}
                className="relative flex items-center rounded-xl border border-blue-100 bg-slate-50/80 px-3 py-1.5 text-xs font-medium text-slate-700 shadow-xs"
                style={{ height: AG_EXIT_ROW_H }}
              >
                <span className="flex-1 truncate">{ec.description || 'Exit rule'}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Agent swap dropdown (only when a valid agent is already selected) */}
      {pickerOpen && onAgentSelect && (
        <div
          ref={pickerRef}
          className="absolute left-0 z-50 mt-1 w-68 rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden divide-y divide-slate-100"
          style={{ top: AG_NODE_HEADER_H + AG_NODE_BODY_H }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <ul className="max-h-52 overflow-y-auto py-1">
            {agentList.map(a => (
              <li key={a.id}>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onAgentSelect(a.id)
                    setPickerOpen(false)
                  }}
                  className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-xs transition hover:bg-blue-50/60"
                >
                  {a.id === agentId ? (
                    <Check className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                  ) : (
                    <div className="h-3.5 w-3.5 shrink-0" />
                  )}
                  <span className="flex-1 truncate font-medium text-slate-800">{a.title}</span>
                  <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide ${
                    a.status === 'published'
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-amber-100 text-amber-700'
                  }`}>
                    {a.status}
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <div className="p-1.5 bg-slate-50">
            <button
              onClick={(e) => {
                e.stopPropagation()
                const newId = createAgent({ title: 'Untitled Agent' })
                onAgentSelect(newId)
                setPickerOpen(false)
                openStudio(newId)
              }}
              className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 px-3 py-1.5 text-xs font-semibold text-white shadow-xs transition active:scale-95"
            >
              + Create new agent
            </button>
          </div>
        </div>
      )}

      {/* ── Output handles (one per exit condition) ────────────────────────── */}
      {hasExits ? (
        agent.exitConditions.map((ec, idx) => {
          const topPx =
            AG_NODE_HEADER_H +
            AG_NODE_BODY_H +
            idx * (AG_EXIT_ROW_H + AG_EXIT_ROW_GAP) +
            AG_EXIT_ROW_H / 2

          return (
            <ConnectorHandle
              key={ec.id}
              handleId={ec.id}
              topOffset={topPx}
              color="blue"
              connected={connectedHandles.has(ec.id)}
              onMouseDown={onPortMouseDown ?? ((e) => e.preventDefault())}
              onClick={onPortClick ?? ((e) => e.preventDefault())}
            />
          )
        })
      ) : (
        // No exit conditions: single default output port at mid-body
        <ConnectorHandle
          topOffset={AG_NODE_HEADER_H + AG_NODE_BODY_H / 2}
          color="blue"
          connected={connectedHandles.size > 0}
          onMouseDown={onPortMouseDown ?? ((e) => e.preventDefault())}
          onClick={onPortClick ?? ((e) => e.preventDefault())}
        />
      )}

      {/* Left input port (target handle) */}
      <ConnectorHandle
        isTarget
        color="blue"
        topOffset={AG_NODE_HEADER_H + AG_NODE_BODY_H / 2}
        connected={hasIncoming}
        onMouseDown={() => {}}
        onClick={() => {}}
      />
    </div>
  )
}
