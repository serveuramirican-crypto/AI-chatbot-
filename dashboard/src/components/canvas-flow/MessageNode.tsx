"use client"

import React from "react"
import { MessageSquare, Camera } from "lucide-react"
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
export const MSG_NODE_HEADER_H = 33   // header bar height (px)
export const MSG_NODE_BODY_H   = 52   // text body height (px)
export const MSG_BUTTON_H      = 36   // per-button row height (px)
export const MSG_BUTTON_GAP    = 4    // gap between buttons (px)
export const MSG_PADDING_BOTTOM = 8   // bottom padding when buttons present (px)

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
  const displayText = data.variants[0] || "Add message"
  const hasButtons = data.buttons && data.buttons.length > 0

  return (
    <div className="relative flex items-start select-none">
      {/* ── Card ─────────────────────────────────────────────────────────── */}
      <div
        onClick={onClick}
        className={`
          w-64 rounded-xl border-2 bg-white shadow-sm transition-all cursor-pointer
          ${isActive ? 'border-blue-500 ring-4 ring-blue-500/20' : 'border-gray-200 hover:border-gray-300'}
        `}
      >
        {/* Header */}
        <div className="flex items-center gap-2 border-b border-gray-100 bg-gray-50/50 px-3 py-2 rounded-t-xl">
          <MessageSquare className="h-4 w-4 text-blue-500" />
          <span className="text-xs font-semibold text-gray-700">Message</span>
        </div>

        {/* Body text */}
        <div className="p-3">
          <p className={`text-sm ${data.variants[0] ? 'text-gray-700' : 'text-gray-400 italic'}`}>
            {displayText}
          </p>
        </div>

        {/* Capture block */}
        {data.saveEntireReply && (
          <div className="mx-3 mb-3 flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 p-2 text-xs text-gray-700 shadow-sm transition hover:bg-gray-100">
            <div className="flex items-center gap-2">
              <div className="flex h-5 w-5 items-center justify-center rounded bg-gray-800 text-white">
                <Camera className="h-3 w-3" />
              </div>
              <span className="font-medium">Save entire reply to: <span className="text-gray-500 font-normal">{"{" + (data.captureVariable || "last_utterance") + "}"}</span></span>
            </div>
            <div className="h-2 w-2 rounded-full border-2 border-gray-400"></div>
          </div>
        )}

        {/* Buttons section */}
        {hasButtons && (
          <div className="flex flex-col gap-1 px-3 pb-2">
            {data.buttons!.map((btn) => (
              <div
                key={btn.id}
                className="relative flex items-center justify-center rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-medium text-blue-700"
                style={{ height: MSG_BUTTON_H }}
              >
                {btn.label}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Port handles ─────────────────────────────────────────────────── */}
      {hasButtons ? (
        // One handle per button, positioned next to the button's vertical center
        data.buttons!.map((btn, idx) => {
          // offset from top of the whole node wrapper:
          //   header + body + (idx rows of buttons + gaps) + half-button
          const topPx =
            MSG_NODE_HEADER_H +
            MSG_NODE_BODY_H +
            idx * (MSG_BUTTON_H + MSG_BUTTON_GAP) +
            MSG_BUTTON_H / 2

          return (
            <ConnectorHandle
              key={btn.id}
              handleId={btn.id}
              topOffset={topPx}
              connected={connectedHandles.has(btn.id)}
              onMouseDown={onPortMouseDown ?? ((e) => e.preventDefault())}
              onClick={onPortClick ?? ((e) => e.preventDefault())}
            />
          )
        })
      ) : (
        // Default: single centered handle on the node body
        <ConnectorHandle
          connected={connected}
          onMouseDown={onPortMouseDown ?? ((e) => e.preventDefault())}
          onClick={onPortClick ?? ((e) => e.preventDefault())}
        />
      )}
    </div>
  )
}
