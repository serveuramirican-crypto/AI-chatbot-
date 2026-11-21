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
  const { openStudio } = useAgentActions()

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
          className={`
            w-64 rounded-xl border-2 bg-white shadow-sm transition-all cursor-pointer
            ${isActive
              ? 'border-amber-400 ring-4 ring-amber-400/20'
              : 'border-amber-200 hover:border-amber-400'}
          `}
        >
          {/* Warning header */}
          <div
            className="flex items-center gap-2 border-b border-amber-100 px-3 rounded-t-xl"
            style={{
              height: AG_NODE_HEADER_H,
              background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
            }}
          >
            <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-400">
              <Bot className="h-3 w-3 text-white" />
            </div>
            <span className="flex-1 truncate text-xs font-semibold text-amber-900">
              AI Agent
            </span>
            {isLoading ? (
              <Loader2 className="h-3.5 w-3.5 text-amber-400 animate-spin" />
            ) : (
              <AlertTriangle className="h-3.5 w-3.5 text-amber-400 shrink-0" />
            )}
            {onDelete && (
              <button
                title="Remove Agent Node"
                onClick={(e) => { e.stopPropagation(); onDelete(_id) }}
                className="ml-1 flex h-4 w-4 shrink-0 items-center justify-center rounded text-amber-500 hover:bg-amber-200 hover:text-amber-700 transition"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

          {/* Picker body */}
          <div
            className="flex flex-col items-center justify-center gap-1.5 px-3"
            style={{ height: AG_NODE_BODY_H }}
          >
            {isLoading ? (
              <span className="text-[11px] text-amber-600 italic">Loading agents…</span>
            ) : (
              <>
                <span className="text-[11px] font-medium text-amber-700">
                  No agent selected
                </span>
                <button
                  onClick={(e) => { e.stopPropagation(); setPickerOpen(v => !v) }}
                  className="flex w-full items-center justify-between gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-800 transition hover:bg-amber-100 hover:border-amber-400 active:scale-95"
                >
                  <span>Select an Agent</span>
                  <ChevronDown className={`h-3 w-3 transition-transform ${pickerOpen ? 'rotate-180' : ''}`} />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Dropdown list */}
        {pickerOpen && (
          <div
            className="absolute left-0 z-50 mt-1 w-64 rounded-xl border border-amber-200 bg-white shadow-2xl overflow-hidden"
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
                      <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-500">
                        <Bot className="h-3 w-3 text-white" />
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
          </div>
        )}

        {/* Single default output port at mid-body */}
        <ConnectorHandle
          topOffset={AG_NODE_HEADER_H + AG_NODE_BODY_H / 2}
          connected={connectedHandles.size > 0}
          onMouseDown={onPortMouseDown ?? ((e) => e.preventDefault())}
          onClick={onPortClick ?? ((e) => e.preventDefault())}
        />
        
        {/* Left input port (target handle) */}
        <ConnectorHandle
          isTarget
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
      ? 'bg-emerald-100 text-emerald-700'
      : 'bg-amber-100 text-amber-700'

  return (
    <div className="relative flex items-start select-none">
      {/* ── Card ──────────────────────────────────────────────────────────── */}
      <div
        onClick={onClick}
        className={`
          w-64 rounded-xl border-2 bg-white shadow-sm transition-all cursor-pointer
          ${isActive
            ? 'border-blue-500 ring-4 ring-blue-500/20'
            : 'border-blue-200 hover:border-blue-400'}
        `}
      >
        {/* Header */}
        <div
          className="flex items-center gap-2 border-b border-blue-100 px-3 rounded-t-xl"
          style={{
            height: AG_NODE_HEADER_H,
            background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
          }}
        >
          <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-500">
            <Bot className="h-3 w-3 text-white" />
          </div>
          <span className="flex-1 truncate text-xs font-semibold text-blue-900">
            {agent.title}
          </span>
          <span
            className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide ${statusColor}`}
          >
            {agent.status}
          </span>

          {/* Swap agent button */}
          {onAgentSelect && (
            <button
              title="Change agent"
              onClick={(e) => { e.stopPropagation(); setPickerOpen(v => !v) }}
              className="ml-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded text-blue-400 hover:text-blue-600 transition"
            >
              <ChevronDown className={`h-3 w-3 transition-transform ${pickerOpen ? 'rotate-180' : ''}`} />
            </button>
          )}

          {/* Delete node button */}
          {onDelete && (
            <button
              title="Remove Agent Node"
              onClick={(e) => { e.stopPropagation(); onDelete(_id) }}
              className="ml-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded text-blue-400 hover:bg-blue-200 hover:text-blue-700 transition"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>

        {/* Body — Edit Agent button */}
        <div
          className="flex items-center justify-center px-3"
          style={{ height: AG_NODE_BODY_H }}
        >
          <button
            onClick={(e) => {
              e.stopPropagation()
              openStudio(agentId)
            }}
            className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 transition hover:bg-blue-100 hover:border-blue-300 active:scale-95"
          >
            <Pencil className="h-3 w-3" />
            Edit Agent
          </button>
        </div>

        {/* Exit conditions list */}
        {hasExits && (
          <div className="flex flex-col gap-1 px-3 pb-2">
            {agent.exitConditions.map((ec) => (
              <div
                key={ec.id}
                className="relative flex items-center rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-medium text-blue-700"
                style={{ height: AG_EXIT_ROW_H }}
              >
                <span className="flex-1 truncate">{ec.description}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Agent swap dropdown (only when a valid agent is already selected) */}
      {pickerOpen && onAgentSelect && (
        <div
          ref={pickerRef}
          className="absolute left-0 z-50 mt-1 w-64 rounded-xl border border-blue-200 bg-white shadow-2xl overflow-hidden"
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
                  className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-xs transition hover:bg-blue-50"
                >
                  {a.id === agentId && (
                    <Check className="h-3 w-3 text-blue-500 shrink-0" />
                  )}
                  {a.id !== agentId && (
                    <div className="h-3 w-3 shrink-0" />
                  )}
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
          connected={connectedHandles.size > 0}
          onMouseDown={onPortMouseDown ?? ((e) => e.preventDefault())}
          onClick={onPortClick ?? ((e) => e.preventDefault())}
        />
      )}

      {/* Left input port (target handle) */}
      <ConnectorHandle
        isTarget
        topOffset={AG_NODE_HEADER_H + AG_NODE_BODY_H / 2}
        connected={hasIncoming}
        onMouseDown={() => {}}
        onClick={() => {}}
      />
    </div>
  )
}
