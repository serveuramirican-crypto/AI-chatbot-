"use client"

import React from "react"
import { Sparkles, AlertTriangle } from "lucide-react"
import ConnectorHandle from "./ConnectorHandle"
import { usePlaybook } from "@/lib/playbookStore"

// ── Layout constants (exported for CanvasEdges.tsx consumption) ───────────────
/** Width of the node card (matches CSS w-64) */
export const PB_NODE_WIDTH        = 268
/** Header bar height */
export const PB_NODE_HEADER_H     = 36
/** Body text area height */
export const PB_NODE_BODY_H       = 48
/** Each exit-condition row height */
export const PB_EXIT_ROW_H        = 36
/** Gap between exit-condition rows */
export const PB_EXIT_ROW_GAP      = 4
/** Bottom padding when exit conditions are present */
export const PB_PADDING_BOTTOM    = 8
/** Right-side handle offset beyond card edge */
export const PB_HANDLE_OFFSET     = 10

function truncate(str: string, max: number) {
  return str.length <= max ? str : str.slice(0, max - 1) + "…"
}

interface PlaybookReferenceNodeProps {
  id: string
  playbookId: string
  isActive?: boolean
  onClick?: (e: React.MouseEvent) => void
  onPortMouseDown?: (e: React.MouseEvent, handleId?: string) => void
  onPortClick?: (e: React.MouseEvent, handleId?: string) => void
  connectedHandles?: Set<string>
  /** Whether the body-level input has an incoming edge */
  hasIncoming?: boolean
}

/**
 * PlaybookReferenceNode — canvas representation of a Playbook hand-off.
 *
 * Input port: left side (handled at the parent div via onMouseUp → handleConnectionEnd)
 * Output ports: one per exit condition — same ConnectorHandle pattern as MessageNode buttons.
 */
export default function PlaybookReferenceNode({
  id: _id,
  playbookId,
  isActive = false,
  onClick,
  onPortMouseDown,
  onPortClick,
  connectedHandles = new Set(),
}: PlaybookReferenceNodeProps) {
  const playbook = usePlaybook(playbookId)

  // ── Dangling reference ──────────────────────────────────────────────────────
  if (!playbook) {
    return (
      <div className="relative flex items-start select-none">
        <div className="w-64 rounded-xl border-2 border-red-300 bg-red-50 shadow-sm px-4 py-3 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-red-400 shrink-0" />
          <span className="text-xs font-medium text-red-500">Playbook not found</span>
        </div>
      </div>
    )
  }

  const hasExits = playbook.exitConditions.length > 0
  const statusColor =
    playbook.status === 'published'
      ? 'bg-emerald-100 text-emerald-700'
      : 'bg-amber-100 text-amber-700'

  return (
    <div className="relative flex items-start select-none">
      {/* ── Card ─────────────────────────────────────────────────────────────── */}
      <div
        onClick={onClick}
        className={`
          w-64 rounded-xl border-2 bg-white shadow-sm transition-all cursor-pointer
          ${isActive
            ? 'border-violet-500 ring-4 ring-violet-500/20'
            : 'border-violet-200 hover:border-violet-400'}
        `}
      >
        {/* Header */}
        <div
          className="flex items-center gap-2 border-b border-violet-100 px-3 py-2 rounded-t-xl"
          style={{ height: PB_NODE_HEADER_H, background: 'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)' }}
        >
          <Sparkles className="h-4 w-4 text-violet-500 shrink-0" />
          <span className="flex-1 truncate text-xs font-semibold text-violet-800">
            {playbook.title}
          </span>
          <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide ${statusColor}`}>
            {playbook.status}
          </span>
        </div>

        {/* Body — trigger description */}
        <div className="px-3 py-2" style={{ height: PB_NODE_BODY_H, display: 'flex', alignItems: 'center' }}>
          <p className={`text-xs leading-relaxed ${playbook.trigger ? 'text-gray-500' : 'text-gray-300 italic'}`}>
            {playbook.trigger
              ? truncate(playbook.trigger, 70)
              : 'No trigger defined'}
          </p>
        </div>

        {/* Exit conditions */}
        {hasExits && (
          <div className="flex flex-col gap-1 px-3 pb-2">
            {playbook.exitConditions.map((ec) => (
              <div
                key={ec.id}
                className="relative flex items-center rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-xs font-medium text-violet-700"
                style={{ height: PB_EXIT_ROW_H }}
              >
                <span className="flex-1 truncate">{ec.description}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Output handles (one per exit condition) ────────────────────────────── */}
      {hasExits ? (
        playbook.exitConditions.map((ec, idx) => {
          const topPx =
            PB_NODE_HEADER_H +
            PB_NODE_BODY_H +
            idx * (PB_EXIT_ROW_H + PB_EXIT_ROW_GAP) +
            PB_EXIT_ROW_H / 2

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
        // No exit conditions: single default output port
        <ConnectorHandle
          connected={connectedHandles.size > 0}
          onMouseDown={onPortMouseDown ?? ((e) => e.preventDefault())}
          onClick={onPortClick ?? ((e) => e.preventDefault())}
        />
      )}
    </div>
  )
}
