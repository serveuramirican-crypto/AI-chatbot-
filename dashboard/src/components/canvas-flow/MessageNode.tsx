"use client"

import React from "react"
import { MessageSquare, Camera, ArrowRight, Sparkles } from "lucide-react"
import ConnectorHandle from "./ConnectorHandle"

export interface NodeButton {
  id: string
  label: string
  /** When true, clicking this button sends its label as the initial user message to the connected Agent node */
  saveAsContext?: boolean
}

export interface MessageNodeData {
  id: string
  type: 'message'
  variants: string[]
  waitForInput: boolean
  /** When true, the user's text reply is captured and passed to the connected Agent node as its initial input */
  saveEntireReply?: boolean
  captureVariable?: string
  position: { x: number; y: number }
  /** Optional list of buttons — each becomes an independent output port */
  buttons?: NodeButton[]
}

// Layout constants kept in sync with CanvasEdges.tsx
export const MSG_WIDTH         = 268  // width of the card (px)
export const MSG_NODE_HEADER_H = 38   // header bar height (px)
export const MSG_NODE_BODY_H   = 54   // text body height (px)
export const MSG_CAPTURE_H     = 42   // capture block height (px)
export const MSG_BUTTON_H      = 36   // per-button row height (px)
export const MSG_BUTTON_GAP    = 6    // gap between buttons (px)
export const MSG_PADDING_BOTTOM = 8   // bottom padding when buttons present (px)
export const MSG_DEFAULT_CENTER_Y = MSG_NODE_HEADER_H + MSG_NODE_BODY_H / 2

export function getMsgButtonTop(idx: number, hasCapture: boolean = false): number {
  const captureOffset = hasCapture ? MSG_CAPTURE_H : 0
  return MSG_NODE_HEADER_H + MSG_NODE_BODY_H + captureOffset + idx * (MSG_BUTTON_H + MSG_BUTTON_GAP) + MSG_BUTTON_H / 2
}

interface MessageNodeProps {
  data: MessageNodeData
  isActive: boolean
  /** Click on the node card body */
  onClick: (e: React.MouseEvent) => void
  /** MouseDown on a connector handle — starts drag-to-connect */
  onPortMouseDown?: (e: React.MouseEvent, handleId?: string) => void
  /** Click on a connector handle — opens ActionsDropdown */
  onPortClick?: (e: React.MouseEvent, handleId?: string) => void
  /** Whether the main body port has an outgoing edge */
  connected?: boolean
  /** Set of button ids that already have connected edges */
  connectedHandles?: Set<string>
}

export default function MessageNode({
  data,
  isActive,
  onClick,
  onPortMouseDown,
  onPortClick,
  connected = false,
  connectedHandles = new Set(),
}: MessageNodeProps) {
  const displayText = data.variants[0] || "Add message..."
  const hasButtons = data.buttons && data.buttons.length > 0
  const hasCapture = Boolean(data.saveEntireReply)

  return (
    <div className="relative flex items-start select-none group">
      {/* ── Card ─────────────────────────────────────────────────────────── */}
      <div
        onClick={onClick}
        style={{ width: MSG_WIDTH }}
        className={`
          rounded-2xl bg-white shadow-[0_10px_25px_-5px_rgba(0,0,0,0.1),0_8px_10px_-6px_rgba(0,0,0,0.05)]
          border transition-all duration-200 cursor-pointer overflow-hidden
          hover:shadow-[0_16px_32px_-6px_rgba(0,0,0,0.15)]
          ${isActive ? 'border-blue-500 ring-4 ring-blue-500/20 shadow-[0_0_25px_rgba(59,130,246,0.25)]' : 'border-slate-200/90 hover:border-slate-300'}
        `}
      >
        {/* Header */}
        <div 
          className="flex items-center justify-between border-b border-slate-100 bg-gradient-to-r from-slate-50/80 to-white px-3.5"
          style={{ height: MSG_NODE_HEADER_H }}
        >
          <div className="flex items-center gap-2">
            <div className="flex h-5 w-5 items-center justify-center rounded-md bg-blue-50 border border-blue-100/80 text-blue-600 shadow-xs">
              <MessageSquare className="h-3 w-3" />
            </div>
            <span className="text-xs font-bold text-slate-800 tracking-tight">Message</span>
          </div>

          <div className="flex items-center gap-1.5">
            {data.variants.length > 1 && (
              <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[9px] font-semibold text-slate-600 border border-slate-200/60">
                {data.variants.length} vars
              </span>
            )}
            <div className={`h-1.5 w-1.5 rounded-full ${isActive ? 'bg-blue-500 animate-pulse' : 'bg-slate-300'}`} />
          </div>
        </div>

        {/* Body text / Preview */}
        <div 
          className="p-3 flex items-center"
          style={{ minHeight: MSG_NODE_BODY_H }}
        >
          <div className="w-full rounded-xl bg-slate-50/90 border border-slate-100/90 px-3 py-2 text-xs font-normal text-slate-700 leading-relaxed shadow-[inset_0_1px_2px_rgba(0,0,0,0.02)]">
            <p className={`line-clamp-2 ${data.variants[0] ? 'text-slate-700' : 'text-slate-400 italic'}`}>
              {displayText}
            </p>
          </div>
        </div>

        {/* Capture block */}
        {hasCapture && (
          <div className="mx-3 mb-2.5 flex items-center justify-between rounded-xl border border-purple-200/80 bg-purple-50/60 px-2.5 py-1.5 text-xs text-slate-700 shadow-xs">
            <div className="flex items-center gap-2 min-w-0">
              <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-purple-600 text-white shadow-xs">
                <Camera className="h-3 w-3" />
              </div>
              <div className="flex items-center gap-1 truncate text-[11px]">
                <span className="font-medium text-slate-600">Save to:</span>
                <span className="font-mono text-[10px] font-semibold text-purple-700 bg-purple-100/80 px-1.5 py-0.5 rounded border border-purple-200 truncate">
                  {"{" + (data.captureVariable || "last_utterance") + "}"}
                </span>
              </div>
            </div>
            <div className="h-2 w-2 shrink-0 rounded-full border border-purple-400 bg-purple-200" />
          </div>
        )}

        {/* Buttons section */}
        {hasButtons && (
          <div className="flex flex-col px-3 pb-3" style={{ gap: MSG_BUTTON_GAP }}>
            {data.buttons!.map((btn) => (
              <div
                key={btn.id}
                className="relative flex items-center justify-between rounded-xl border border-blue-200/80 bg-blue-50/70 hover:bg-blue-100/70 px-3 text-xs font-semibold text-blue-700 shadow-xs transition-colors"
                style={{ height: MSG_BUTTON_H }}
              >
                <span className="truncate pr-2">{btn.label}</span>
                <ArrowRight className="h-3 w-3 text-blue-400 shrink-0" />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Port handles ─────────────────────────────────────────────────── */}
      {hasButtons ? (
        // One handle per button, precisely aligned with each button's center
        data.buttons!.map((btn, idx) => {
          const topPx = getMsgButtonTop(idx, hasCapture)
          return (
            <ConnectorHandle
              key={btn.id}
              handleId={btn.id}
              topOffset={topPx}
              connected={connectedHandles.has(btn.id)}
              onMouseDown={onPortMouseDown ?? ((e) => e.preventDefault())}
              onClick={onPortClick ?? ((e) => e.preventDefault())}
              color="blue"
            />
          )
        })
      ) : (
        // Default: single centered handle on the node body
        <ConnectorHandle
          connected={connected}
          onMouseDown={onPortMouseDown ?? ((e) => e.preventDefault())}
          onClick={onPortClick ?? ((e) => e.preventDefault())}
          color="blue"
        />
      )}
    </div>
  )
}
